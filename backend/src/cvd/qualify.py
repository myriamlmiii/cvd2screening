"""
Stage 3: Qualification. Pure rules, no LLM, no network call.

This runs on every deal before anything touches the LLM. It is the single
highest-leverage piece of the pipeline: cheap, instant, and it is the part
a GP will actually read the reasoning for ("why was this auto-rejected"),
so every check produces a human-readable detail string — never a bare
boolean.

Keep this deterministic and unit-tested (see tests/test_qualify.py). A
prompt can drift; this cannot.
"""

from __future__ import annotations

import re

from .models import NormalizedDeal, QualCheck, Qualification
from .thesis import DEFAULT_THESIS, Thesis

# Matches "AI" as a standalone token (AI-assisted, AI-powered, "an AI
# platform", ai_native.py, ...) without matching it as a substring of an
# unrelated word (maintain, again, claim, ...). Substring matching alone
# is why an earlier version of this check missed "AI-assisted" and
# "AI-personalized" — see tests/test_qualify.py for the regression cases.
_AI_WORD_RE = re.compile(r"\bai\b", re.IGNORECASE)


def _sector_check(deal: NormalizedDeal, thesis: Thesis) -> QualCheck:
    sector = (deal.sector or "").strip().lower()
    core = [s.lower() for s in thesis.core_sectors]
    opportunistic = [s.lower() for s in thesis.opportunistic_sectors]

    if any(s in sector for s in core):
        return QualCheck(name="sector", passed=True, detail=f"'{deal.sector}' matches a core sector")
    if any(s in sector for s in opportunistic):
        return QualCheck(
            name="sector",
            passed=True,
            detail=f"'{deal.sector}' is opportunistic (adjacent B2B), flag for GP judgment call",
        )
    return QualCheck(name="sector", passed=False, detail=f"'{deal.sector}' matches no thesis sector")


def _ai_layer_check(deal: NormalizedDeal, thesis: Thesis) -> tuple[QualCheck, list[str]]:
    haystack = " ".join(
        filter(None, [deal.one_liner, deal.sector, deal.deck_text])
    ).lower()

    matched = [kw for kw in thesis.ai_keywords if kw in haystack]
    if _AI_WORD_RE.search(haystack):
        matched = ["ai"] + matched

    if matched:
        return (
            QualCheck(name="ai_layer", passed=True, detail=f"matched: {', '.join(matched[:4])}"),
            matched,
        )
    return (
        QualCheck(name="ai_layer", passed=False, detail="no AI-native language found in one-liner or deck"),
        [],
    )


def _stage_check(deal: NormalizedDeal, thesis: Thesis) -> QualCheck:
    stage = (deal.stage or "").strip().lower()
    if not stage:
        return QualCheck(name="stage", passed=False, detail="stage not provided")
    if any(r in stage for r in thesis.allowed_rounds):
        return QualCheck(name="stage", passed=True, detail=f"'{deal.stage}' is an allowed round")
    return QualCheck(name="stage", passed=False, detail=f"'{deal.stage}' is outside pre-seed to pre-Series A")


def _capital_check(deal: NormalizedDeal, thesis: Thesis) -> QualCheck:
    if deal.cumulative_raised_usd is None:
        return QualCheck(name="capital_raised", passed=True, detail="not disclosed, deferred to enrichment")
    if deal.cumulative_raised_usd <= thesis.max_cumulative_raised_usd:
        return QualCheck(
            name="capital_raised",
            passed=True,
            detail=f"${deal.cumulative_raised_usd:,.0f} <= ${thesis.max_cumulative_raised_usd:,.0f} cap",
        )
    return QualCheck(
        name="capital_raised",
        passed=False,
        detail=f"${deal.cumulative_raised_usd:,.0f} exceeds ${thesis.max_cumulative_raised_usd:,.0f} cap",
    )


def _commercial_maturity_check(deal: NormalizedDeal, thesis: Thesis) -> QualCheck:
    over_clients = deal.client_count is not None and deal.client_count > thesis.max_clients
    over_users = deal.user_count is not None and deal.user_count > thesis.max_users
    if over_clients or over_users:
        return QualCheck(
            name="commercial_maturity",
            passed=False,
            detail=f"{deal.client_count or 0} clients / {deal.user_count or 0} users exceeds pre-seed to pre-A range",
        )
    return QualCheck(name="commercial_maturity", passed=True, detail="within pre-seed to pre-A commercial range")


def _geography_check(deal: NormalizedDeal, thesis: Thesis) -> QualCheck:
    geo = (deal.geography or "").strip().lower()
    if not geo:
        return QualCheck(name="geography", passed=True, detail="not provided, deferred to enrichment")
    if any(g.lower() in geo or geo in g.lower() for g in thesis.priority_geographies):
        return QualCheck(name="geography", passed=True, detail=f"'{deal.geography}' is a priority geography")
    return QualCheck(
        name="geography",
        passed=True,  # soft check: outside priority list is a flag, not an auto-reject
        detail=f"'{deal.geography}' is outside the priority list, exceptional-only",
    )


def qualify(deal: NormalizedDeal, thesis: Thesis = DEFAULT_THESIS) -> Qualification:
    sector = _sector_check(deal, thesis)
    ai_layer, matched_terms = _ai_layer_check(deal, thesis)
    checks = [
        sector,
        ai_layer,
        _stage_check(deal, thesis),
        _capital_check(deal, thesis),
        _commercial_maturity_check(deal, thesis),
        _geography_check(deal, thesis),
    ]

    # Hard gates: sector and the mandatory AI layer. Everything else is a
    # softer signal that still reaches enrichment (the GP may override).
    hard_gates = [sector, ai_layer]
    passed = all(c.passed for c in hard_gates)

    rejection_reason = None
    if not passed:
        failed = [c for c in hard_gates if not c.passed]
        rejection_reason = "; ".join(c.detail for c in failed)

    return Qualification(
        deal_id=deal.id,
        passed=passed,
        checks=checks,
        rejection_reason=rejection_reason,
        ai_layer_matched_terms=matched_terms,
    )
