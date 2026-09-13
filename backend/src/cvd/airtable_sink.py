"""
Write-back to Airtable (stage 7 -> CRM history).

Upserts on a `Deal Id` field so re-running the pipeline updates the
existing record instead of duplicating it — this is the idempotency that
matters most, since scoring will legitimately re-run as enrichment
improves.
"""

from __future__ import annotations

from .models import ScreeningRecord


class AirtableSink:
    def __init__(self, api_key: str, base_id: str, table_name: str):
        from pyairtable import Api

        self._table = Api(api_key).table(base_id, table_name)

    def write(self, record: ScreeningRecord) -> None:
        fields = self._to_fields(record)
        existing = self._table.first(formula=f"{{Deal Id}} = '{record.deal.id}'")
        if existing:
            self._table.update(existing["id"], fields)
        else:
            self._table.create(fields)

    @staticmethod
    def _to_fields(record: ScreeningRecord) -> dict:
        s = record.score
        fields = {
            "Deal Id": record.deal.id,
            "Name": record.deal.name,
            "Sector": record.deal.sector,
            "Stage": record.deal.stage,
            "Geography": record.deal.geography,
            "Screening Stage": record.screening_stage,
            "GP Decision": record.gp_decision,
            "Qualified": record.qualification.passed,
            "Rejection Reason": record.qualification.rejection_reason,
        }
        if s:
            fields.update(
                {
                    "CVD Score": s.composite,
                    "Recommendation": s.recommendation,
                    "Assessment": s.assessment,
                    "Thesis Score": next((a.score for a in s.axes if a.key == "thesis"), None),
                    "Product Score": next((a.score for a in s.axes if a.key == "product"), None),
                    "Traction Score": next((a.score for a in s.axes if a.key == "traction"), None),
                    "Market Score": next((a.score for a in s.axes if a.key == "market"), None),
                    "Competition Score": next((a.score for a in s.axes if a.key == "competition"), None),
                }
            )
        return fields


class NullSink:
    """Used when DRY_RUN is on. Logs what would have been written."""

    def write(self, record: ScreeningRecord) -> None:
        print(  # noqa: T201 - intentional CLI feedback
            f"[dry-run] would write back: {record.deal.name} "
            f"({record.screening_stage}, GP={record.gp_decision})"
        )
