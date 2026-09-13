from cvd.models import DealScore, ScoreAxis, recommend


def make_score(**scores: int) -> DealScore:
    axes = [ScoreAxis(key=k, score=v, rationale="r") for k, v in scores.items()]
    return DealScore(deal_id="x", axes=axes, strengths=[], risks=[], assessment="a")


def test_composite_matches_hand_computed_weights():
    # weights: thesis .24, product .20, traction .22, market .20, competition .14
    score = make_score(thesis=96, product=90, traction=92, market=86, competition=82)
    expected = round(96 * 0.24 + 90 * 0.20 + 92 * 0.22 + 86 * 0.20 + 82 * 0.14, 1)
    assert score.composite == expected


def test_recommendation_bands():
    assert recommend(90) == "Advance"
    assert recommend(85) == "Advance"
    assert recommend(84.9) == "Review"
    assert recommend(72) == "Review"
    assert recommend(71.9) == "Hold"
    assert recommend(55) == "Hold"
    assert recommend(54.9) == "Reject"


def test_score_recommendation_property_matches_composite_band():
    score = make_score(thesis=20, product=20, traction=20, market=20, competition=20)
    assert score.composite == 20.0
    assert score.recommendation == "Reject"
