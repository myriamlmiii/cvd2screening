"""
Local JSON source. Reads a list of raw-submission dicts from a file —
used for local development, tests, and `scripts/seed_local.py`. This is
what lets you exercise normalize -> qualify -> enrich -> score end to end
before a single Airtable credential exists.
"""

from __future__ import annotations

import json
from pathlib import Path

from ..models import RawSubmission


class ManualJsonSource:
    name = "manual"

    def __init__(self, path: str | Path):
        self.path = Path(path)

    def fetch_new(self, seen_ids: set[str]) -> list[RawSubmission]:
        if not self.path.exists():
            return []
        raw = json.loads(self.path.read_text(encoding="utf-8"))
        submissions = [RawSubmission.model_validate(item) for item in raw]
        return [s for s in submissions if s.external_id not in seen_ids]
