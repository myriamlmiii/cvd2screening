"""
Airtable source: reads the real SITUATIONS base, PIPELINE table — the same
247-company table the Next.js dashboard reads (see ../../../lib/airtable.ts,
which this file's field-id map is deliberately kept in sync with).

Fetches by field id (`returnFieldsByFieldId=true`) instead of field name,
same as the frontend, so this doesn't depend on guessing the base's French
column labels. Plain REST + httpx rather than pyairtable: the base/table
here is fixed (SITUATIONS/PIPELINE), so there's nothing pyairtable's
higher-level API buys over a couple of paginated GETs.

Rate limit: Airtable enforces 5 requests/sec per base. A 247-record base is
3 pages at pageSize=100 — nowhere near the limit, so no retry/backoff here.
"""

from __future__ import annotations

from datetime import datetime, timezone

import httpx

from ..models import RawSubmission, SourceChannel

BASE_URL = "https://api.airtable.com/v0"
PIPELINE_TABLE = "tblRoZitopWuaCwdA"

# fieldId -> normalised key. Subset of lib/airtable.ts's PIPELINE_FIELDS
# that the screening pipeline actually consumes.
FIELD_MAP = {
    "fldu4ktuYyt06rkLH": "name",
    "flduIxMgylChkQN7x": "dateEntered",
    "fldUCbVIrDSAkBaiL": "description",
    "fldlYWfrEvpyOQygd": "pitchUrl",
    "fldcc5Jw7JUffe53B": "bpUrl",
    "fld3L3gwehqazATbZ": "sector",
    "fldzrdA7SqZWyk9uK": "country",
    "fldGTtrwJ4TS2TJiQ": "status",
    "fldBf4sJIlHWZKOV5": "fundingSought",
    "fld2j3c1mY7KIZkJm": "websiteUrl",
}


def _clean(value: object) -> str | None:
    if value is None:
        return None
    if isinstance(value, list):
        value = ", ".join(str(v) for v in value)
    s = str(value).strip()
    return s or None


def _parse_dt(value: str | None) -> datetime:
    if not value:
        return datetime.now(timezone.utc)
    from dateutil import parser

    try:
        return parser.isoparse(value)
    except (ValueError, TypeError):
        return datetime.now(timezone.utc)


def _parse_website(value: str | None) -> str | None:
    if not value:
        return None
    v = value.strip()
    if not v:
        return None
    if not v.startswith(("http://", "https://")):
        v = f"https://{v}"
    return v


class AirtableSource:
    name = "airtable_form"

    def __init__(self, api_key: str, base_id: str, table_id: str = PIPELINE_TABLE):
        self._api_key = api_key
        self._base_id = base_id
        self._table_id = table_id

    def fetch_new(self, seen_ids: set[str]) -> list[RawSubmission]:
        records = self._fetch_all()
        out: list[RawSubmission] = []
        for rec in records:
            rid = rec["id"]
            if rid in seen_ids:
                continue
            f = {FIELD_MAP.get(fid, fid): v for fid, v in rec.get("fields", {}).items()}
            name = _clean(f.get("name"))
            if not name:
                continue
            website = _parse_website(_clean(f.get("websiteUrl")))
            out.append(
                RawSubmission(
                    source=SourceChannel.airtable_form,
                    external_id=rid,
                    company_name=name,
                    website=website,
                    sector_raw=_clean(f.get("sector")),
                    geography_raw=_clean(f.get("country")),
                    deck_url=_clean(f.get("pitchUrl")) or _clean(f.get("bpUrl")),
                    raw_text=_clean(f.get("description")),
                    received_at=_parse_dt(_clean(f.get("dateEntered"))),
                    extra=f,
                )
            )
        return out

    def _fetch_all(self) -> list[dict]:
        records: list[dict] = []
        offset: str | None = None
        with httpx.Client(timeout=30) as client:
            while True:
                params = {"pageSize": 100, "returnFieldsByFieldId": "true"}
                if offset:
                    params["offset"] = offset
                res = client.get(
                    f"{BASE_URL}/{self._base_id}/{self._table_id}",
                    params=params,
                    headers={"Authorization": f"Bearer {self._api_key}"},
                )
                res.raise_for_status()
                payload = res.json()
                records.extend(payload.get("records", []))
                offset = payload.get("offset")
                if not offset:
                    break
        return records
