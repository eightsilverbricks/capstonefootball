#!/usr/bin/env python3
"""
export_predictions.py
=====================
Generates the static predictions.json file used by the Vercel deployment.

Run this once (or after any model/data update) from inside the nfl-prediction
directory with the venv activated:

    cd nfl-prediction
    source .venv/bin/activate
    python3 src/export_predictions.py

The output lands in primary-ui/public/predictions.json, which Vite serves as a
static asset in both dev and production - there is no dev proxy. The frontend
only talks to the live FastAPI backend when VITE_API_BASE_URL is set.
"""

import sys
import json
from pathlib import Path

# Make `from src.api import ...` resolvable when run from the repo root
# or from the nfl-prediction/ directory.
THIS_DIR  = Path(__file__).resolve().parent          # .../nfl-prediction/src
PRED_DIR  = THIS_DIR.parent                          # .../nfl-prediction
REPO_ROOT = PRED_DIR.parent                          # .../capstonefootball

if str(PRED_DIR) not in sys.path:
    sys.path.insert(0, str(PRED_DIR))

# ---------------------------------------------------------------------------
# Import the live enrichment pipeline from api.py.
# Importing the module runs the model + data load at module level - that's
# intentional; it's exactly the same path the FastAPI server takes.
# ---------------------------------------------------------------------------
print("Loading model and data...")
from src.api import (  # noqa: E402
    get_predictions,
    ACTIVE_SEASON,
    DEMO_SEASON,
    DATA_MODE,
    MODEL_META,
)
from src.validate_report import validate_game  # noqa: E402
from src.clark_report import build_clark_report  # noqa: E402
from src.clark_llm import polish_reports  # noqa: E402

PUBLIC_DIR = REPO_ROOT / "primary-ui" / "public"

# Two files, because they answer different questions. predictions.json is the
# season being played and mostly has no outcomes yet; the demo file is a
# completed season where every pick resolves, which is the only way a new
# visitor can see records, streaks and the Clark Differential do anything
# before the live season has been played.
EXPORTS = {
    ACTIVE_SEASON: PUBLIC_DIR / "predictions.json",
    DEMO_SEASON: PUBLIC_DIR / f"predictions-{DEMO_SEASON}.json",
}


def validate_predictions(season: int, predictions: list[dict]) -> None:
    """Stop the export before incomplete or contradictory schedules ship."""
    if not predictions:
        raise ValueError(f"No predictions generated for {season}.")

    game_ids: set[str] = set()
    team_weeks: set[tuple[int, str]] = set()
    for game in predictions:
        game_id = str(game.get("game_id") or "")
        if not game_id or game_id in game_ids:
            raise ValueError(f"Duplicate or missing game_id in {season}: {game_id!r}")
        game_ids.add(game_id)

        week = int(game.get("week") or 0)
        for team in (game.get("away_team"), game.get("home_team")):
            key = (week, str(team or ""))
            if not team or key in team_weeks:
                raise ValueError(f"Duplicate or missing team/week in {season}: {key}")
            team_weeks.add(key)

        if game.get("game_type") == "REG" and season == ACTIVE_SEASON:
            missing = [
                field for field in ("game_date", "weekday", "gametime", "stadium", "kickoff_at")
                if not game.get(field)
            ]
            if missing:
                raise ValueError(f"{game_id} is missing schedule fields: {', '.join(missing)}")

    # Every report must agree with itself (pick vs factors, odds, filler, jargon).
    report_errors = [e for game in predictions for e in validate_game(game)]
    if report_errors:
        shown = "\n  ".join(report_errors[:20])
        raise ValueError(
            f"{len(report_errors)} Clark Report problem(s) in {season}:\n  {shown}"
        )



# Written into the shipped file by patch_live_week.py / espn_extras.py, not by
# the model pipeline. A re-export must not wipe them.
LIVE_FIELDS = ("actual_winner", "home_score", "away_score",
               "key_players", "injury_notes", "espn_event_id")


def carry_live_fields(out_path: Path, predictions: list[dict]) -> int:
    """Copy live fields from the file being replaced wherever the fresh export has none."""
    if not out_path.exists():
        return 0
    with open(out_path, encoding="utf-8") as fh:
        previous = {str(g.get("game_id")): g for g in json.load(fh)}
    carried = 0
    for game in predictions:
        old = previous.get(str(game.get("game_id")))
        if not old:
            continue
        for field in LIVE_FIELDS:
            if game.get(field) is None and old.get(field) is not None:
                game[field] = old[field]
                carried += 1
    return carried


def attach_clark_reports(season: int, predictions: list[dict]) -> None:
    """Add the in-depth Clark Report to every game; AI-polish only next week's (§15)."""
    for game in predictions:
        game["clark_report"] = build_clark_report(game)

    eligible: set[str] = set()
    if season == ACTIVE_SEASON:
        upcoming = [g["week"] for g in predictions if not g.get("actual_winner") and g["clark_report"]]
        if upcoming:
            week = min(upcoming)
            eligible = {str(g["game_id"]) for g in predictions if g["week"] == week}
    stats = polish_reports(predictions, eligible)
    built = sum(1 for g in predictions if g["clark_report"])
    print(f"   Clark Reports: {built} built · AI {stats}")


def main() -> None:
    PUBLIC_DIR.mkdir(parents=True, exist_ok=True)

    for season, out_path in EXPORTS.items():
        print(f"Running enrichment pipeline for {season}...")
        predictions = get_predictions(season=season)
        carried = carry_live_fields(out_path, predictions)
        if carried:
            print(f"   Kept {carried} live field value(s) from the existing {out_path.name}")
        attach_clark_reports(season, predictions)
        validate_predictions(season, predictions)

        with open(out_path, "w", encoding="utf-8") as fh:
            json.dump(predictions, fh, indent=2, ensure_ascii=False)

        resolved = sum(1 for game in predictions if game.get("actual_winner"))
        size_kb = out_path.stat().st_size / 1024
        print(f"   Games      : {len(predictions)} ({resolved} with final scores)")
        print(f"   Output     : {out_path.name}  ({size_kb:.1f} KB)")

    print(f"\n✅  Done.  Data mode: {DATA_MODE}   "
          f"Model accuracy: {MODEL_META.get('accuracy', '?')}")
    print(
        "   Commit both JSON files and push - Vercel serves them as static files."
    )


if __name__ == "__main__":
    main()
