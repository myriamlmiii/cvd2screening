from datetime import datetime, timezone

from cvd.models import RawSubmission, SourceChannel
from cvd.normalize import normalize


def test_deal_id_derived_from_domain():
    raw = RawSubmission(
        source=SourceChannel.airtable_form,
        external_id="rec123",
        company_name="ClaimFlow",
        website="https://www.claimflow.example/pitch",
        received_at=datetime.now(timezone.utc),
    )
    deal = normalize(raw)
    assert deal.id == "claimflow.example"


def test_deal_id_falls_back_to_source_and_external_id_without_website():
    raw = RawSubmission(
        source=SourceChannel.email,
        external_id="msg-42",
        company_name="No Website Co",
        received_at=datetime.now(timezone.utc),
    )
    deal = normalize(raw)
    assert deal.id == "email-msg-42"


def test_normalize_preserves_deck_text():
    raw = RawSubmission(
        source=SourceChannel.manual,
        external_id="x",
        company_name="X",
        raw_text="some extracted deck text",
        received_at=datetime.now(timezone.utc),
    )
    deal = normalize(raw)
    assert deal.deck_text == "some extracted deck text"
