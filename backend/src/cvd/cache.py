"""
The dashboard's read model. It should never hit the Airtable API on every
page load (5 req/s, no query language) — it reads this JSON snapshot
instead. The pipeline rewrites the whole snapshot after each run; that's
fine at this volume (tens to low hundreds of records) and is the simplest
thing that works. If volume grows enough for this to matter, that's the
signal to move the dashboard's read model to Postgres (Supabase/Neon) and
keep Airtable as the team's editing surface — not before.
"""

from __future__ import annotations

import json
from pathlib import Path

from .models import ScreeningRecord


def write_snapshot(records: list[ScreeningRecord], path: str | Path) -> None:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = [r.to_dashboard_dict() for r in records]
    path.write_text(json.dumps(payload, indent=2, default=str), encoding="utf-8")


def load_snapshot(path: str | Path) -> list[dict]:
    path = Path(path)
    if not path.exists():
        return []
    return json.loads(path.read_text(encoding="utf-8"))
