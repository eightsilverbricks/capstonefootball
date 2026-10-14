#!/usr/bin/env python3
"""
refresh.py - one full data refresh for the live season
======================================================
Runs every step of the weekly routine in order and works out the weeks by
itself, so a scheduler (.github/workflows/refresh-data.yml) can call it often:

    .venv/bin/python src/refresh.py            # reuse cached play-by-play
    .venv/bin/python src/refresh.py --pbp      # re-download play-by-play too

Schedules (scores, betting lines), nflverse injury reports and ESPN's injury
list are fetched every run; stats are rebuilt from the play-by-play file.
Games that have kicked off keep Clark's published pick (export_predictions.py).
Any failing step stops the run, so a bad refresh never gets published.
"""
from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

import pandas as pd

PRED_DIR = Path(__file__).resolve().parent.parent
ACTIVE_SEASON = 2026
SCHEDULES_PATH = PRED_DIR / "data" / "raw" / "schedules.parquet"


def run(script: str, *args: str) -> None:
    print(f"\n▶ {script} {' '.join(args)}", flush=True)
    env = {**os.environ, "PYTHONPATH": str(PRED_DIR)}
    subprocess.run([sys.executable, f"src/{script}", *args], cwd=PRED_DIR, env=env, check=True)


def season_weeks(schedules: pd.DataFrame, season: int = ACTIVE_SEASON) -> tuple[int, int | None]:
    """(latest week with any final score, next week with an unplayed game).

    Finals are merged as soon as each game ends (patch_live_week.py only
    touches games that have a score), so a Sunday result shows up before
    Monday night's game is played.
    """
    games = schedules[(schedules["season"] == season) & (schedules["game_type"] == "REG")]
    played = games["home_score"].notna()
    unplayed_weeks = sorted(games.loc[~played, "week"].unique())
    next_week = int(unplayed_weeks[0]) if unplayed_weeks else None
    last_final = int(games.loc[played, "week"].max()) if played.any() else 0
    return last_final, next_week


def main() -> None:
    run("download_data.py", *([] if "--pbp" in sys.argv else ["--no-pbp"]))
    for script in ("build_team_game_stats.py", "build_training_table.py", "build_availability.py",
                   "build_player_context.py", "build_game_context.py", "build_pressure_context.py",
                   "build_schedule_dates.py"):
        run(script)

    last_done, next_week = season_weeks(pd.read_parquet(SCHEDULES_PATH))
    print(f"\nWeeks: finals through {last_done}, next up {next_week}")
    if next_week:
        # The week in progress plus the one after: on a Monday the current week
        # still has a game left, but next week's injury report already matters.
        weeks = [str(w) for w in (next_week, next_week + 1) if w <= 18]
        run("espn_extras.py", "--weeks", *weeks)
    run("export_predictions.py")
    run("export_rosters.py")
    if last_done:
        run("patch_live_week.py", "--results-through-week", str(last_done))
    run("validate_report.py")
    run("validate_alignment.py")


if __name__ == "__main__":
    main()
