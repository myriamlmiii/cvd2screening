"""
Stage 4: Enrichment. Deck text + submitted fields -> Enrichment, via an
LLM structured-output call.

Note this is a *separate* call from scoring (score.py) even though an LLM
could do both in one shot. Keeping them separate means:
  - each prompt can be evaluated and iterated independently,
  - enrichment can run on the cheaper/faster model (extraction is easy),
    while scoring can use a stronger model (judgment is hard) — see the
    architecture notes on why Flash-class models are weaker at calibrated
    scoring than at extraction.
"""

from __future__ import annotations

from pydantic import BaseModel, Field

from .llm.base import LLMClient
from .llm.prompts import ENRICHMENT_SYSTEM, enrichment_prompt
from .models import Competitor, Enrichment, EvidenceItem, NormalizedDeal


class _EnrichmentOutput(BaseModel):
    """What we ask the LLM to produce. Narrower than `Enrichment` — no
    deal_id/model/timestamp, the model can't know those."""

    deck_summary: list[str] = Field(default_factory=list)
    product_description: str = ""
    traction_summary: str = ""
    market_summary: str = ""
    competitors: list[Competitor] = Field(default_factory=list)
    evidence: list[EvidenceItem] = Field(default_factory=list)
    missing_fields: list[str] = Field(default_factory=list)


def enrich(deal: NormalizedDeal, llm: LLMClient) -> Enrichment:
    prompt = enrichment_prompt(deal, deal.deck_text)
    out = llm.structured(prompt, _EnrichmentOutput, system=ENRICHMENT_SYSTEM)

    fields_total = 17
    fields_verified = max(fields_total - len(out.missing_fields), 0)

    return Enrichment(
        deal_id=deal.id,
        deck_summary=out.deck_summary,
        product_description=out.product_description,
        traction_summary=out.traction_summary,
        market_summary=out.market_summary,
        competitors=out.competitors,
        evidence=out.evidence,
        fields_total=fields_total,
        fields_verified=fields_verified,
        missing_fields=out.missing_fields,
        model=llm.model_name,
    )
