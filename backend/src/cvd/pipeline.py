"""
The orchestrator. Deliberately a plain function, not a DAG framework —
the pipeline is linear (collect -> normalize -> qualify -> enrich -> score
-> write back), so Airflow/Dagster/Prefect would add ceremony without
adding value at this scale. Revisit if/when there are genuinely branching,
long-running, or fan-out workflows to manage.

Idempotency: a source record is only ever processed once (tracked in
RunState.seen_ids). A *deal* can be re-scored deliberately (e.g. after new
enrichment) by clearing it from state — that is a conscious operation, not
something that happens by accident on a second run.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass

from .airtable_sink import NullSink
from .cache import write_snapshot
from .config import Settings
from .docparse import extract_text, looks_empty
from .enrich import enrich
from .llm.base import LLMClient
from .models import NormalizedDeal, RawSubmission, ScreeningRecord
from .normalize import normalize
from .qualify import qualify
from .score import score_deal
from .sources.base import Source
from .state import RunState
from .thesis import DEFAULT_THESIS, Thesis

log = logging.getLogger("cvd.pipeline")


@dataclass
class PipelineResult:
    processed: int
    qualified: int
    rejected: int
    errors: list[str]


def _attach_deck_text(deal: NormalizedDeal, raw: RawSubmission) -> NormalizedDeal:
    if deal.deck_text or not raw.deck_local_path:
        return deal
    try:
        text = extract_text(raw.deck_local_path)
        if looks_empty(text):
            log.warning("deck for %s extracted to <200 chars; needs the multimodal fallback", deal.name)
        deal.deck_text = text
    except Exception as exc:  # pragma: no cover - depends on optional dep / bad file
        log.warning("could not extract deck text for %s: %s", deal.name, exc)
    return deal


def run(
    sources: list[Source],
    llm: LLMClient | None,
    scoring_llm: LLMClient | None,
    settings: Settings,
    thesis: Thesis = DEFAULT_THESIS,
    state_path: str = "./data/state.json",
) -> PipelineResult:
    state = RunState(state_path)
    sink = NullSink() if settings.dry_run else _real_sink(settings)

    processed = qualified = rejected = 0
    errors: list[str] = []

    for source in sources:
        raw_submissions = source.fetch_new(state.seen_ids)
        log.info("%s: %d new submission(s)", source.name, len(raw_submissions))

        for raw in raw_submissions:
            try:
                record = _process_one(raw, llm, scoring_llm, thesis)
            except Exception as exc:  # keep going on a bad record, don't kill the batch
                errors.append(f"{raw.company_name} ({raw.external_id}): {exc}")
                log.exception("failed processing %s", raw.company_name)
                continue

            processed += 1
            qualified += int(record.qualification.passed)
            rejected += int(not record.qualification.passed)

            sink.write(record)
            state.upsert_record(record)
            state.mark_seen(raw.external_id)

    state.save()
    write_snapshot(state.all_records(), settings.snapshot_path)

    if settings.supabase_url and settings.supabase_service_role_key:
        from .supabase_sink import push as push_to_supabase

        push_to_supabase(state.all_records(), settings.supabase_url, settings.supabase_service_role_key)

    return PipelineResult(processed=processed, qualified=qualified, rejected=rejected, errors=errors)


def _process_one(
    raw: RawSubmission,
    llm: LLMClient | None,
    scoring_llm: LLMClient | None,
    thesis: Thesis,
) -> ScreeningRecord:
    deal = normalize(raw)
    deal = _attach_deck_text(deal, raw)

    qual = qualify(deal, thesis)

    if not qual.passed:
        return ScreeningRecord(
            deal=deal,
            qualification=qual,
            screening_stage="Rejected",
            gp_decision="Pending",
        )

    if llm is None:
        # Qualified but no LLM configured — stop at "Received", useful for
        # the Airtable-read-first slice before any LLM key exists.
        return ScreeningRecord(deal=deal, qualification=qual, screening_stage="Received")

    enrichment = enrich(deal, llm)
    stage = "Enriched"

    record = ScreeningRecord(
        deal=deal, qualification=qual, enrichment=enrichment, screening_stage=stage
    )

    if scoring_llm is not None:
        score = score_deal(deal, qual, enrichment, scoring_llm)
        record.score = score
        record.screening_stage = "Assessed"

    return record


def _real_sink(settings: Settings):
    from .airtable_sink import AirtableSink

    return AirtableSink(settings.airtable_api_key, settings.airtable_base_id, settings.airtable_table_name)
