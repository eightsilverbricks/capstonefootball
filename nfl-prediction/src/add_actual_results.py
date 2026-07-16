#!/usr/bin/env python3
"""
add_actual_results.py
=====================
Patches real 2024 game outcomes into the exported predictions.json so the
frontend can resolve picks (You / Clark / Vegas / Fans correct-or-not) and
build season records.

predictions.json ships with predictions only — no outcome field. The 2024
season is historical, so the actual results already exist in the nflverse
schedules parquet. This script joins them in by `game_id` (which is
nflverse-native, e.g. "2024_01_ARI_BUF") and writes three fields onto each
game:

    actual_winner : home/away team abbr, or null for a tie / unplayed game
    home_score    : final home points (int) or null
    away_score    : final away points (int) or null

It is idempotent — safe to re-run. Run after export_predictions.py:

    cd nfl-prediction
    .venv/bin/python src/add_actual_results.py
"""

import json
from pathlib import Path

import pandas as pd

THIS_DIR = Path(__file__).resolve().parent          # .../nfl-prediction/src
PRED_DIR = THIS_DIR.parent                           # .../nfl-prediction
REPO_ROOT = PRED_DIR.parent                          # .../capstonefootball

SCHEDULES_PATH = PRED_DIR / "data" / "raw" / "schedules.parquet"
PREDICTIONS_PATH = REPO_ROOT / "primary-ui" / "public" / "predictions.json"


def build_results_map() -> dict[str, dict]:
    """game_id -> {actual_winner, home_score, away_score} for played games."""
    df = pd.read_parquet(SCHEDULES_PATH)
    played = df[df["home_score"].notna() & df["away_score"].notna()]

    results: dict[str, dict] = {}
    for row in played.itertuples(index=False):
        home_score = int(row.home_score)
        away_score = int(row.away_score)
        if home_score > away_score:
            winner = row.home_team
        elif away_score > home_score:
            winner = row.away_team
        else:
            winner = None  # tie
        results[row.game_id] = {
            "actual_winner": winner,
            "home_score": home_score,
            "away_score": away_score,
        }
    return results


def main() -> None:
    results = build_results_map()

    with open(PREDICTIONS_PATH, encoding="utf-8") as fh:
        predictions = json.load(fh)

    matched = 0
    for game in predictions:
        outcome = results.get(game.get("game_id"))
        if outcome is None:
            game.setdefault("actual_winner", None)
            game.setdefault("home_score", None)
            game.setdefault("away_score", None)
            continue
        game["actual_winner"] = outcome["actual_winner"]
        game["home_score"] = outcome["home_score"]
        game["away_score"] = outcome["away_score"]
        matched += 1

    with open(PREDICTIONS_PATH, "w", encoding="utf-8") as fh:
        json.dump(predictions, fh, indent=2, ensure_ascii=False)

    unmatched = len(predictions) - matched
    print("✅  Actual results merged into predictions.json")
    print(f"   Games total    : {len(predictions)}")
    print(f"   Results matched: {matched}")
    print(f"   Unmatched      : {unmatched}")


if __name__ == "__main__":
    main()
