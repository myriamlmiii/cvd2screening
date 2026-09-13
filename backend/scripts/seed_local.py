"""
Writes ./data/raw_submissions.json with the same 8 example companies used
in the frontend mock data, so the pipeline and the dashboard are talking
about the same deals during development.

Run: python scripts/seed_local.py
Then: cvd-pipeline --local-file ./data/raw_submissions.json --no-llm
"""

from __future__ import annotations

import json
from pathlib import Path

SUBMISSIONS = [
    {
        "source": "airtable_form",
        "external_id": "seed-claimflow",
        "company_name": "ClaimFlow",
        "one_liner": "AI claims triage and settlement automation for mid-size insurers",
        "website": "https://claimflow.example",
        "sector_raw": "InsurTech",
        "stage_raw": "Series A",
        "geography_raw": "Casablanca, Morocco",
        "cumulative_raised_usd": 900_000,
        "client_count": 3,
        "user_count": None,
        "raw_text": (
            "ClaimFlow automates claims triage and settlement for mid-size "
            "insurers using a proprietary LLM extraction layer that reads "
            "Arabic and French claim documents. Three insurers signed, "
            "EUR 1.2M ARR, +94% over six months."
        ),
    },
    {
        "source": "airtable_form",
        "external_id": "seed-covercrop",
        "company_name": "CoverCrop",
        "one_liner": "Parametric crop insurance priced by a satellite ML model",
        "website": "https://covercrop.example",
        "sector_raw": "InsurTech",
        "stage_raw": "Seed",
        "geography_raw": "Agadir, Morocco",
        "cumulative_raised_usd": 400_000,
        "client_count": None,
        "user_count": 500,
        "raw_text": "Parametric crop insurance, machine learning rainfall model, 500 farmers insured season one.",
    },
    {
        "source": "email",
        "external_id": "seed-paynova",
        "company_name": "PayNova",
        "one_liner": "Embedded B2B payments with AI-assisted reconciliation",
        "website": "https://paynova.example",
        "sector_raw": "Fintech",
        "stage_raw": "Seed",
        "geography_raw": "Casablanca, Morocco",
        "cumulative_raised_usd": 600_000,
        "client_count": 40,
        "user_count": None,
        "raw_text": "B2B payments API with an AI reconciliation layer that matches transactions across bank feeds automatically.",
    },
    {
        "source": "airtable_form",
        "external_id": "seed-lendlocal",
        "company_name": "LendLocal",
        "one_liner": "Alternative credit scoring model for underbanked SMEs",
        "website": "https://lendlocal.example",
        "sector_raw": "Fintech",
        "stage_raw": "Pre-seed",
        "geography_raw": "Casablanca, Morocco",
        "cumulative_raised_usd": 150_000,
        "client_count": None,
        "user_count": None,
        "raw_text": "Machine learning credit scoring model for SMEs without formal credit history. Two microfinance pilots.",
    },
    {
        "source": "email",
        "external_id": "seed-assurlink",
        "company_name": "AssurLink",
        "one_liner": "Digital micro-insurance broker with a recommendation model",
        "website": "https://assurlink.example",
        "sector_raw": "InsurTech",
        "stage_raw": "Pre-seed",
        "geography_raw": "Rabat, Morocco",
        "cumulative_raised_usd": 90_000,
        "client_count": None,
        "user_count": None,
        "raw_text": "AI-personalized micro-insurance recommendations for informal-sector workers. Three pilot partnerships.",
    },
    {
        "source": "airtable_form",
        "external_id": "seed-medrendezvous",
        "company_name": "MedRendezvous",
        "one_liner": "Clinic booking and patient records for private practices",
        "website": "https://medrendezvous.example",
        "sector_raw": "HealthTech",
        "stage_raw": "Seed",
        "geography_raw": "Fes, Morocco",
        "cumulative_raised_usd": 300_000,
        "client_count": None,
        "user_count": 15_000,
        "raw_text": "Clinic booking and patient record platform. 15,000 monthly active users. No AI component yet.",
    },
    {
        "source": "email",
        "external_id": "seed-farmsense",
        "company_name": "FarmSense",
        "one_liner": "IoT soil sensors for smallholder irrigation",
        "website": "https://farmsense.example",
        "sector_raw": "AgriTech",
        "stage_raw": "Seed",
        "geography_raw": "Marrakech, Morocco",
        "cumulative_raised_usd": 500_000,
        "client_count": None,
        "user_count": None,
        "raw_text": "Hardware soil sensors for irrigation scheduling. 200 units deployed, no recurring revenue.",
    },
    {
        "source": "airtable_form",
        "external_id": "seed-shipease",
        "company_name": "ShipEase",
        "one_liner": "Last-mile delivery route optimization",
        "website": "https://shipease.example",
        "sector_raw": "Logistics",
        "stage_raw": "Seed",
        "geography_raw": "Tangier, Morocco",
        "cumulative_raised_usd": 700_000,
        "client_count": 3,
        "user_count": None,
        "raw_text": "Route optimization software for last-mile delivery fleets. Three pilot clients, not yet converted.",
    },
]


def main() -> None:
    out = Path(__file__).resolve().parent.parent / "data" / "raw_submissions.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(SUBMISSIONS, indent=2), encoding="utf-8")
    print(f"wrote {len(SUBMISSIONS)} submissions to {out}")


if __name__ == "__main__":
    main()
