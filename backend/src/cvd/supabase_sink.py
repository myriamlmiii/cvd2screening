"""
Pushes scored records to Supabase's `scored_deals` table (see
../../supabase/schema.sql) so the Next.js dashboard can read real AI
scores without re-running the pipeline on every page load, and without
the dashboard needing Groq credentials of its own.

This is a convenience read-model sink, not a source of truth — Airtable
(via AirtableSink) stays the system of record. A Supabase write failure is
logged and swallowed; it must never fail the pipeline run.

Uses Supabase's PostgREST endpoint directly (no supabase-py dependency):
one POST with `Prefer: resolution=merge-duplicates` per batch, upserting
on `source_record_id`.
"""

from __future__ import annotations

import logging

import httpx

from .models import ScreeningRecord

log = logging.getLogger("cvd.supabase_sink")


def _row(record: ScreeningRecord) -> dict | None:
    d = record.deal
    if not d.source_record_id:
        return None  # nothing stable to join against on the frontend side

    row: dict = {
        "source_record_id": d.source_record_id,
        "deal_id": d.id,
        "name": d.name,
        "sector": d.sector,
        "geography": d.geography,
        "screening_stage": record.screening_stage,
        "gp_decision": record.gp_decision,
        "qualified": record.qualification.passed,
        "rejection_reason": record.qualification.rejection_reason,
    }

    if record.score:
        s = record.score
        row.update(
            {
                "cvd_score": s.composite,
                "recommendation": s.recommendation,
                "assessment": s.assessment,
                "axes": [a.model_dump() for a in s.axes],
                "strengths": s.strengths,
                "risks": [r.model_dump() for r in s.risks],
                "scored_at": s.generated_at.isoformat(),
            }
        )

    if record.enrichment:
        row.update(
            {
                "deck_summary": record.enrichment.deck_summary,
                "competitors": [c.model_dump() for c in record.enrichment.competitors],
                "fields_verified": record.enrichment.fields_verified,
                "fields_total": record.enrichment.fields_total,
            }
        )

    return row


def push(records: list[ScreeningRecord], supabase_url: str, service_role_key: str) -> None:
    """Best-effort upsert. Never raises — a Supabase outage should not fail
    a pipeline run that has already written back to Airtable."""
    if not supabase_url or not service_role_key:
        return

    rows = [r for r in (_row(rec) for rec in records) if r is not None]
    if not rows:
        return

    url = f"{supabase_url.rstrip('/')}/rest/v1/scored_deals"
    headers = {
        "apikey": service_role_key,
        "Authorization": f"Bearer {service_role_key}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=minimal",
    }
    try:
        with httpx.Client(timeout=30) as client:
            res = client.post(f"{url}?on_conflict=source_record_id", headers=headers, json=rows)
            res.raise_for_status()
        log.info("supabase: upserted %d scored deal(s)", len(rows))
    except httpx.HTTPError as exc:
        log.warning("supabase push failed, dashboard will keep serving stale scores: %s", exc)
