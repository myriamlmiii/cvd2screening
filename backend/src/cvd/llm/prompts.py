"""
Prompt templates. Kept as plain strings, versioned in git like any other
source file — the point of the eval harness (see tests/) is that a change
here should be measurable, not vibes-checked.
"""

from __future__ import annotations

from ..models import NormalizedDeal, Qualification

ENRICHMENT_SYSTEM = """You are an analyst supporting a venture capital GP.
You extract and summarize information about a startup from the material
provided. Every factual claim you make must be traceable to something in
the input — if you cannot point to where a number came from, do not state
it as fact; put it in missing_fields instead. Never invent metrics.
Write in a neutral, evidence-based register. Do not use marketing language
from the deck verbatim without labeling it as the company's own claim."""


def enrichment_prompt(deal: NormalizedDeal, deck_text: str | None) -> str:
    parts = [
        f"Company: {deal.name}",
        f"One-liner: {deal.one_liner}",
        f"Sector (as submitted): {deal.sector}",
        f"Stage (as submitted): {deal.stage}",
        f"Geography (as submitted): {deal.geography}",
    ]
    if deck_text:
        parts.append("\n--- DECK TEXT ---\n" + deck_text[:12000])
    else:
        parts.append("\n(No deck text available. Work from the fields above only.)")
    parts.append(
        "\nProduce: a short deck_summary (bullet fragments, not sentences), "
        "a product_description, a traction_summary, a market_summary, up to "
        "3 named competitors with hq/funding/note, an evidence list (each "
        "item: claim, value, source, document, page if known, confidence, "
        "interpretation, and a short supporting excerpt quoted from the "
        "input), and missing_fields for anything material you could not "
        "find (e.g. gross margin, net revenue retention, cap table)."
    )
    return "\n".join(parts)


SCORING_SYSTEM = """You are scoring a startup against a specific fund's
investment thesis on 5 axes: thesis fit, product, traction, market,
competition. Each score is 0-100. Be a skeptical analyst, not a cheerleader:
a deck claim without corroborating evidence should pull the relevant score
down, and you must say so in that axis's rationale. Calibrate for the
company's actual stage — do not expect Series B traction from a pre-seed
company, but do expect the traction that IS reasonable at that stage.
Every axis needs a one-sentence rationale, referencing the specific
evidence that drove the score. If information needed for an axis is
missing, say so in that axis's `missing` list and score conservatively."""


def scoring_prompt(deal: NormalizedDeal, qualification: Qualification, enrichment_summary: str) -> str:
    return "\n".join(
        [
            f"Company: {deal.name}",
            f"Sector: {deal.sector}  |  Stage: {deal.stage}  |  Geography: {deal.geography}",
            f"Thesis fit signal from qualification: {qualification.rejection_reason or 'passed hard gates'}",
            f"AI-layer terms matched: {', '.join(qualification.ai_layer_matched_terms) or 'none'}",
            "\n--- ENRICHMENT SUMMARY ---\n" + enrichment_summary,
            "\nScore all 5 axes (thesis, product, traction, market, "
            "competition), each 0-100 with a rationale. List 2-4 strengths "
            "and 1-4 risks (each with a severity of High, Medium or Low). "
            "Write a 1-2 sentence overall assessment: what would make a GP "
            "confident or cautious, referencing the evidence, not generic "
            "praise.",
        ]
    )
