"""
Source protocol. A source's only job: hand back RawSubmissions that
haven't been seen yet. Idempotency (not re-fetching/re-processing the same
record) is the source's responsibility via `seen_ids`, so the pipeline
itself stays simple.
"""

from __future__ import annotations

from typing import Protocol

from ..models import RawSubmission


class Source(Protocol):
    name: str

    def fetch_new(self, seen_ids: set[str]) -> list[RawSubmission]:
        """Return submissions whose `external_id` is not in `seen_ids`."""
        ...
