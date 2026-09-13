"""
Core data model. Every stage of the pipeline consumes and produces one of
these — no stage passes around raw dicts. This is what makes swapping the
LLM provider, or the source, a one-file change instead of a rewrite.

Field names intentionally line up with the frontend's `types/index.ts`
(Startup / Screening / ScoreAxis / Risk / Evidence) so a ScreeningRecord
serializes into something the dashboard can render close to as-is.
"""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Literal

from pydantic import BaseModel, Field, HttpUrl


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


# ---------------------------------------------------------------------------
# Stage 1-2: raw intake -> normalized deal
# ---------------------------------------------------------------------------

class SourceChannel(str, Enum):
    airtable_form = "airtable_form"
    email = "email"
    google_drive = "google_drive"
    crunchbase = "crunchbase"
    tracxn = "tracxn"
    github = "github"
    product_hunt = "product_hunt"
    manual = "manual"


class RawSubmission(BaseModel):
    """Whatever a source hands back, before normalization. Deliberately loose."""

    source: SourceChannel
    external_id: str  # source's own record id, for idempotency
    company_name: str
    one_liner: str | None = None
    website: HttpUrl | None = None
    sector_raw: str | None = None
    stage_raw: str | None = None
    geography_raw: str | None = None
    cumulative_raised_usd: float | None = None
    client_count: int | None = None
    user_count: int | None = None
    deck_url: str | None = None
    deck_local_path: str | None = None
    raw_text: str | None = None  # deck text, if already extracted
    received_at: datetime = Field(default_factory=_utcnow)
    extra: dict = Field(default_factory=dict)


class NormalizedDeal(BaseModel):
    """Source-agnostic shape. Everything downstream works on this."""

    id: str  # stable id, derived from domain or external_id
    source_record_id: str = ""  # the source's own record id verbatim (e.g. Airtable record id) — the join key the dashboard uses to attach a score to the real Airtable row, independent of how `id` was derived
    name: str
    one_liner: str = ""
    website: str | None = None
    sector: str | None = None
    stage: str | None = None
    geography: str | None = None
    cumulative_raised_usd: float | None = None
    client_count: int | None = None
    user_count: int | None = None
    source: SourceChannel
    deck_text: str | None = None
    submitted_at: datetime
    ingested_at: datetime = Field(default_factory=_utcnow)


# ---------------------------------------------------------------------------
# Stage 3: qualification (rules, no LLM)
# ---------------------------------------------------------------------------

class QualCheck(BaseModel):
    name: str
    passed: bool
    detail: str


class Qualification(BaseModel):
    deal_id: str
    passed: bool
    checks: list[QualCheck]
    rejection_reason: str | None = None
    ai_layer_matched_terms: list[str] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Stage 4: enrichment (LLM, structured output)
# ---------------------------------------------------------------------------

class Confidence(str, Enum):
    high = "High"
    medium = "Medium"
    low = "Low"


class EvidenceItem(BaseModel):
    """One claim, always traceable. This is what the evidence drawer renders."""

    claim: str
    value: str
    source: str
    document: str
    page: str | None = None
    confidence: Confidence
    interpretation: str
    excerpt: str | None = None


class Competitor(BaseModel):
    name: str
    hq: str | None = None
    funding: str | None = None
    note: str


class Enrichment(BaseModel):
    """The output of the enrichment LLM call. No scores here on purpose —
    scoring is a separate call against a (possibly) stronger model, so the
    two prompts can be iterated and evaled independently."""

    deal_id: str
    deck_summary: list[str] = Field(default_factory=list)
    product_description: str = ""
    traction_summary: str = ""
    market_summary: str = ""
    competitors: list[Competitor] = Field(default_factory=list)
    evidence: list[EvidenceItem] = Field(default_factory=list)
    fields_total: int = 17
    fields_verified: int = 0
    missing_fields: list[str] = Field(default_factory=list)
    model: str = ""
    generated_at: datetime = Field(default_factory=_utcnow)


# ---------------------------------------------------------------------------
# Stage 5: scoring (LLM, structured output — separate, possibly stronger model)
# ---------------------------------------------------------------------------

AxisKey = Literal["thesis", "product", "traction", "market", "competition"]

AXIS_WEIGHTS: dict[AxisKey, float] = {
    "thesis": 0.24,
    "product": 0.20,
    "traction": 0.22,
    "market": 0.20,
    "competition": 0.14,
}


class ScoreAxis(BaseModel):
    key: AxisKey
    score: int = Field(ge=0, le=100)
    rationale: str
    missing: list[str] = Field(default_factory=list)
    risk: str | None = None


class RiskSeverity(str, Enum):
    high = "High"
    medium = "Medium"
    low = "Low"


class Risk(BaseModel):
    label: str
    detail: str
    severity: RiskSeverity


Recommendation = Literal["Advance", "Review", "Hold", "Reject"]


def recommend(score: float) -> Recommendation:
    if score >= 85:
        return "Advance"
    if score >= 72:
        return "Review"
    if score >= 55:
        return "Hold"
    return "Reject"


class DealScore(BaseModel):
    deal_id: str
    axes: list[ScoreAxis]
    strengths: list[str]
    risks: list[Risk]
    assessment: str  # "CVD Assessment" — evidence-backed, never "AI thinks"
    model: str = ""
    generated_at: datetime = Field(default_factory=_utcnow)

    @property
    def composite(self) -> float:
        return round(
            sum(a.score * AXIS_WEIGHTS[a.key] for a in self.axes), 1
        )

    @property
    def recommendation(self) -> Recommendation:
        return recommend(self.composite)


# ---------------------------------------------------------------------------
# Stage 6-7: human review + the assembled screening record
# ---------------------------------------------------------------------------

GPDecision = Literal["Pending", "Advance", "Hold", "Pass"]
ScreeningStage = Literal[
    "Received", "Enriched", "Assessed", "Review", "Advanced", "Rejected"
]


class ScreeningRecord(BaseModel):
    """The full, denormalized record — one per deal. This is what gets
    written back to Airtable and what the dashboard's snapshot contains."""

    deal: NormalizedDeal
    qualification: Qualification
    enrichment: Enrichment | None = None
    score: DealScore | None = None
    gp_decision: GPDecision = "Pending"
    gp_note: str | None = None
    screening_stage: ScreeningStage = "Received"
    updated_at: datetime = Field(default_factory=_utcnow)

    def to_dashboard_dict(self) -> dict:
        """Shape close to the frontend's Screening type, for the JSON snapshot
        the dashboard reads. Deliberately permissive — the frontend already
        tolerates missing optional fields."""
        d = self.deal
        out: dict = {
            "id": d.id,
            "sourceRecordId": d.source_record_id,
            "name": d.name,
            "oneLiner": d.one_liner,
            "sector": d.sector,
            "geography": d.geography,
            "stage": d.stage,
            "source": d.source.value,
            "screening": {
                "gpDecision": self.gp_decision,
                "screeningStage": self.screening_stage,
            },
        }
        if self.score:
            out["screening"].update(
                {
                    "cvdScore": self.score.composite,
                    "recommendation": self.score.recommendation,
                    "axes": [a.model_dump() for a in self.score.axes],
                    "strengths": self.score.strengths,
                    "risks": [r.model_dump() for r in self.score.risks],
                    "assessment": self.score.assessment,
                }
            )
        if self.enrichment:
            out["screening"]["evidence"] = [
                e.model_dump() for e in self.enrichment.evidence
            ]
            out["screening"]["competitors"] = [
                c.model_dump() for c in self.enrichment.competitors
            ]
            out["screening"]["dataConfidence"] = {
                "fieldsVerified": self.enrichment.fields_verified,
                "fieldsTotal": self.enrichment.fields_total,
                "missing": self.enrichment.missing_fields,
            }
        return out
