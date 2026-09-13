"""
The qualifier is the piece that must never silently drift — these are the
golden cases. Add one every time the thesis changes or a mis-qualification
is found in production, the same way you'd extend the GP's eval set.
"""

from datetime import datetime, timezone

import pytest

from cvd.models import NormalizedDeal, SourceChannel
from cvd.qualify import qualify
from cvd.thesis import DEFAULT_THESIS


def make_deal(**overrides) -> NormalizedDeal:
    base = dict(
        id="test-co",
        name="Test Co",
        one_liner="AI-native platform for something",
        sector="Fintech",
        stage="Seed",
        geography="Casablanca, Morocco",
        cumulative_raised_usd=500_000,
        client_count=10,
        user_count=None,
        source=SourceChannel.manual,
        deck_text=None,
        submitted_at=datetime.now(timezone.utc),
    )
    base.update(overrides)
    return NormalizedDeal(**base)


def test_on_thesis_deal_passes():
    deal = make_deal()
    result = qualify(deal)
    assert result.passed
    assert result.rejection_reason is None


def test_off_sector_is_rejected():
    deal = make_deal(sector="Logistics", one_liner="Route optimization with machine learning")
    result = qualify(deal)
    assert not result.passed
    assert "sector" in (result.rejection_reason or "").lower()


def test_no_ai_layer_is_rejected():
    deal = make_deal(one_liner="A payments API for SMEs", sector="Fintech")
    result = qualify(deal)
    assert not result.passed
    assert "ai" in (result.rejection_reason or "").lower() or "no ai" in (result.rejection_reason or "").lower()


def test_opportunistic_sector_passes_if_ai_native():
    deal = make_deal(sector="HRTech", one_liner="An LLM copilot for recruiters")
    result = qualify(deal)
    assert result.passed


def test_late_stage_is_flagged_but_not_a_hard_reject():
    # Stage is a soft check in v1 (see qualify.py) — it still reaches
    # enrichment so the GP can see a strong but late-stage deal rather
    # than have it silently disappear.
    deal = make_deal(stage="Series C")
    result = qualify(deal)
    assert result.passed
    stage_check = next(c for c in result.checks if c.name == "stage")
    assert not stage_check.passed


def test_over_capital_is_flagged_but_not_a_hard_reject():
    deal = make_deal(cumulative_raised_usd=9_000_000)
    result = qualify(deal)
    assert result.passed
    capital_check = next(c for c in result.checks if c.name == "capital_raised")
    assert not capital_check.passed


def test_missing_stage_and_capital_do_not_block_qualification():
    deal = make_deal(stage=None, cumulative_raised_usd=None)
    result = qualify(deal)
    assert result.passed


@pytest.mark.parametrize(
    "keyword",
    ["agentic", "LLM", "computer vision", "generative AI", "predictive"],
)
def test_various_ai_keywords_match(keyword):
    deal = make_deal(one_liner=f"A {keyword} product for insurers")
    result = qualify(deal, DEFAULT_THESIS)
    assert result.passed


@pytest.mark.parametrize(
    "one_liner",
    [
        "Embedded B2B payments with AI-assisted reconciliation",
        "AI-personalized micro-insurance recommendations",
        "An AI platform for underwriters",
    ],
)
def test_standalone_ai_word_is_matched_not_just_exact_phrases(one_liner):
    # Regression: substring matching against the keyword list alone missed
    # "AI-assisted" / "AI-personalized" because those exact phrases aren't
    # in the list. The word-boundary "AI" check catches them.
    deal = make_deal(one_liner=one_liner)
    result = qualify(deal)
    assert result.passed


def test_ai_as_a_word_fragment_inside_another_word_does_not_match():
    deal = make_deal(one_liner="We maintain a claims database", sector="Fintech")
    result = qualify(deal)
    assert not result.passed
