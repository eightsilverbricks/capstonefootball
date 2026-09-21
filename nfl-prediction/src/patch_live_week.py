#!/usr/bin/env python3
"""
patch_live_week.py
==================
Brings the shipped predictions.json up to date with the live season's schedule
and with the results of the weeks that have actually been played.

Two jobs, both idempotent:

  1. Schedule fields. `predictions.json` was exported before the live season's
     fixtures were published, so every game carries a null `game_date`,
     `weekday`, `gametime`, `game_type`, `location` and `stadium`. Without a
     kickoff time the frontend can't print one and drops the whole week into
     the "Kickoff TBD" bucket. These are patched for every week.

  2. Results. Games that have been played get `actual_winner`, `home_score`
     and `away_score`, which is what the frontend resolves picks against (My
     Season's record, streak and Clark Differential are all derived from it)
     and what closes a game to further picking. Only weeks at or below
     --results-through-week are patched, so a week that is still in progress
     isn't half-resolved on the page.

Nothing else in the file is touched — no probability, factor or prose field is
re-derived. Re-run after each completed week:

    cd nfl-prediction
    .venv/bin/python src/patch_live_week.py --results-through-week 2
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

THIS_DIR = Path(__file__).resolve().parent            # .../nfl-prediction/src
PRED_DIR = THIS_DIR.parent                            # .../nfl-prediction
REPO_ROOT = PRED_DIR.parent                           # .../capstonefootball

SCHEDULES_PATH = PRED_DIR / "data" / "raw" / "schedules.parquet"
PREDICTIONS_PATH = REPO_ROOT / "primary-ui" / "public" / "predictions.json"

LIVE_SEASON = 2026
DEFAULT_RESULTS_THROUGH_WEEK = 1

# Written onto each game as (json field, schedule column).
SCHEDULE_FIELDS = (
    ("game_date", "gameday"),
    ("weekday", "weekday"),
    ("gametime", "gametime"),
    ("game_type", "game_type"),
    ("stadium", "stadium"),
)

# Deliberately NOT patched: nflverse's `location` column is "Home"/"Neutral",
# but the frontend reads `location` as the venue's city (see StadiumPanel and
# GameBanner). Leaving it null lets those fall back to the stadium metadata,
# which is the city they are actually asking for.



def load_schedule(season: int) -> list[dict]:
    """The season's fixtures, freshest source first.

    nflreadpy reads the published feed, which is the only place a game played
    after the last local download has a score. The on-disk parquet is the
    offline fallback so this script still repairs schedule fields without a
    network.
    """
    try:
        import nflreadpy as nfl

        return nfl.load_schedules(seasons=[season]).to_dicts()
    except Exception as exc:  # network down, package missing, feed moved
        print(f"   nflreadpy unavailable ({exc}); falling back to {SCHEDULES_PATH.name}")
        import pandas as pd

        frame = pd.read_parquet(SCHEDULES_PATH)
        frame = frame[frame["season"] == season]
        return frame.to_dict(orient="records")


def clean(value):
    """Schedule feeds spell 'missing' as NaN, NaT, empty string or None."""
    if value is None or value != value:  # NaN / NaT
        return None
    if isinstance(value, str) and not value.strip():
        return None
    return value


def winner_of(row: dict) -> tuple[str | None, int, int] | None:
    """(winner, home_score, away_score) for a played game; None if unplayed."""
    home, away = clean(row.get("home_score")), clean(row.get("away_score"))
    if home is None or away is None:
        return None
    home, away = int(home), int(away)
    if home > away:
        return row["home_team"], home, away
    if away > home:
        return row["away_team"], home, away
    return None, home, away  # a tie has no winner but is still final


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--season", type=int, default=LIVE_SEASON)
    parser.add_argument(
        "--results-through-week",
        type=int,
        default=DEFAULT_RESULTS_THROUGH_WEEK,
        help="Highest week whose finals are merged in (default: %(default)s).",
    )
    args = parser.parse_args()

    schedule = {str(row["game_id"]): row for row in load_schedule(args.season)}
    print(f"Loaded {len(schedule)} scheduled games for {args.season}.")

    with open(PREDICTIONS_PATH, encoding="utf-8") as fh:
        predictions = json.load(fh)

    scheduled = 0
    resolved = 0
    for game in predictions:
        row = schedule.get(str(game.get("game_id") or ""))
        if row is None:
            continue

        for field, column in SCHEDULE_FIELDS:
            value = clean(row.get(column))
            if value is not None:
                game[field] = value
        scheduled += 1

        if int(game.get("week") or 0) > args.results_through_week:
            continue
        outcome = winner_of(row)
        if outcome is None:
            continue
        game["actual_winner"], game["home_score"], game["away_score"] = outcome
        resolved += 1

    with open(PREDICTIONS_PATH, "w", encoding="utf-8") as fh:
        json.dump(predictions, fh, indent=2, ensure_ascii=False)

    print(f"   Schedule fields: {scheduled}/{len(predictions)} games")
    print(f"   Finals merged  : {resolved} (weeks 1–{args.results_through_week})")
    print(f"   Wrote {PREDICTIONS_PATH}")


if __name__ == "__main__":
    main()
