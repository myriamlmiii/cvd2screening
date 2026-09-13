"""
Stage 2: Ingestion. RawSubmission (whatever the source gave us) ->
NormalizedDeal (one consistent shape every later stage relies on).

The important property here is idempotency: `deal_id` is derived from the
domain when available, falling back to a slug of (source, external_id), so
the same company arriving from two sources on two different days still
gets *a* stable id per source-record — true cross-source dedup is entity
resolution (see the architecture notes) and is explicitly out of scope for
v1. Don't build it until you have enough volume for duplicates to hurt.
"""

from __future__ import annotations

import re
from urllib.parse import urlparse

from .models import NormalizedDeal, RawSubmission


def _slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def _domain(website: str | None) -> str | None:
    if not website:
        return None
    host = urlparse(str(website)).netloc or urlparse(str(website)).path
    host = host.removeprefix("www.")
    return host.lower() or None


def deal_id_for(raw: RawSubmission) -> str:
    domain = _domain(str(raw.website)) if raw.website else None
    if domain:
        return domain  # already a stable, readable identifier as-is
    return f"{raw.source.value}-{_slug(raw.external_id)}"


def normalize(raw: RawSubmission) -> NormalizedDeal:
    return NormalizedDeal(
        id=deal_id_for(raw),
        source_record_id=raw.external_id,
        name=raw.company_name.strip(),
        one_liner=(raw.one_liner or "").strip(),
        website=str(raw.website) if raw.website else None,
        sector=(raw.sector_raw or "").strip() or None,
        stage=(raw.stage_raw or "").strip() or None,
        geography=(raw.geography_raw or "").strip() or None,
        cumulative_raised_usd=raw.cumulative_raised_usd,
        client_count=raw.client_count,
        user_count=raw.user_count,
        source=raw.source,
        deck_text=raw.raw_text,
        submitted_at=raw.received_at,
    )
