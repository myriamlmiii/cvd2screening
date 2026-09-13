"""
Stage 5: Scoring. NormalizedDeal + Qualification + Enrichment -> DealScore,
via a second, separate LLM call — see enrich.py for why it's separate.

The composite score and recommendation are computed in Python
(`DealScore.composite` / `.recommendation`), not asked of the model — the
weights live in one place (models.AXIS_WEIGHTS) so the arithmetic can never
drift from what the dashboard displays, and so it's never a black box: any
composite can be recomputed by hand from the 5 axis scores.
"""

from __future__ import annotations

from pydantic import BaseModel, Field

from .llm.base import LLMClient
from .llm.prompts import SCORING_SYSTEM, scoring_prompt
from .models import (
    AxisKey,
    DealScore,
    Enrichment,
    NormalizedDeal,
    Qualification,
    Risk,
    ScoreAxis,
)


class _AxisOutput(BaseModel):
    key: AxisKey
    score: int = Field(ge=0, le=100)
    rationale: str
    missing: list[str] = Field(default_factory=list)
    risk: str | None = None


class _ScoreOutput(BaseModel):
    axes: list[_AxisOutput]
    strengths: list[str]
    risks: list[Risk]
    assessment: str


def _enrichment_summary(e: Enrichment) -> str:
    lines = [
        "Deck summary: " + "; ".join(e.deck_summary),
        "Product: " + e.product_description,
        "Traction: " + e.traction_summary,
        "Market: " + e.market_summary,
        "Competitors: " + "; ".join(f"{c.name} ({c.note})" for c in e.competitors),
        f"Data confidence: {e.fields_verified}/{e.fields_total} fields verified. "
        f"Missing: {', '.join(e.missing_fields) or 'none'}",
    ]
    return "\n".join(lines)


def score_deal(
    deal: NormalizedDeal,
    qualification: Qualification,
    enrichment: Enrichment,
    llm: LLMClient,
) -> DealScore:
    prompt = scoring_prompt(deal, qualification, _enrichment_summary(enrichment))
    out = llm.structured(prompt, _ScoreOutput, system=SCORING_SYSTEM)

    axes = [
        ScoreAxis(key=a.key, score=a.score, rationale=a.rationale, missing=a.missing, risk=a.risk)
        for a in out.axes
    ]

    return DealScore(
        deal_id=deal.id,
        axes=axes,
        strengths=out.strengths,
        risks=out.risks,
        assessment=out.assessment,
        model=llm.model_name,
    )
