"""Production response-contract and schedule-completeness checks."""

import sys
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from src.api import (  # noqa: E402
    ACTIVE_SEASON,
    HealthResponse,
    PredictionResponse,
    build_kickoff_at,
    get_predictions,
    health,
)


def test_live_schedule_is_complete_and_validated():
    games = get_predictions(ACTIVE_SEASON)
    assert len(games) == 272
    assert all(game["kickoff_at"] for game in games)
    assert all(game["kickoff_timezone"] == "America/New_York" for game in games)
    PredictionResponse.model_validate(games[0])


def test_health_reports_live_dataset_completeness():
    payload = HealthResponse.model_validate(health())
    assert payload.status == "ok"
    assert payload.dataset_season == ACTIVE_SEASON
    assert payload.game_count == 272
    assert payload.games_with_kickoff == 272
    assert payload.schedule_complete is True


def test_kickoff_builder_is_rfc3339_eastern():
    assert build_kickoff_at("2026-09-09", "20:20") == "2026-09-09T20:20:00-04:00"
