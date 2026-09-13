"""
Local run state: which source records have been seen, and the last known
ScreeningRecord per deal. A JSON file, not a database — this is enough for
a single-engineer, single-machine v1 and makes idempotency ("don't
reprocess, don't double-write") trivial to reason about.

When this needs to be shared across machines/CI, swap this for a small
Postgres table with the same two operations (get/set). Nothing above this
layer needs to change.
"""

from __future__ import annotations

import json
from pathlib import Path

from .models import ScreeningRecord


class RunState:
    def __init__(self, path: str | Path):
        self.path = Path(path)
        self._data: dict = self._load()

    def _load(self) -> dict:
        if self.path.exists():
            return json.loads(self.path.read_text(encoding="utf-8"))
        return {"seen_ids": [], "records": {}}

    def save(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.path.write_text(json.dumps(self._data, indent=2, default=str), encoding="utf-8")

    @property
    def seen_ids(self) -> set[str]:
        return set(self._data.get("seen_ids", []))

    def mark_seen(self, external_id: str) -> None:
        ids = self._data.setdefault("seen_ids", [])
        if external_id not in ids:
            ids.append(external_id)

    def upsert_record(self, record: ScreeningRecord) -> None:
        self._data.setdefault("records", {})[record.deal.id] = record.model_dump(mode="json")

    def all_records(self) -> list[ScreeningRecord]:
        return [ScreeningRecord.model_validate(v) for v in self._data.get("records", {}).values()]
