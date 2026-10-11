#!/usr/bin/env python3
"""Export the schedule metadata consumed by the API and static exporter."""

from pathlib import Path

import pandas as pd


BASE_DIR = Path(__file__).resolve().parent.parent
RAW_PATH = BASE_DIR / "data" / "raw" / "schedules.parquet"
OUTPUT_PATH = BASE_DIR / "data" / "processed" / "schedule_dates.csv"
SCHEDULE_COLUMNS = [
    "game_id",
    "gameday",
    "weekday",
    "gametime",
    "game_type",
    "location",
    "stadium",
]


def main() -> None:
    schedules = pd.read_parquet(RAW_PATH, columns=SCHEDULE_COLUMNS)
    schedules = schedules.drop_duplicates(subset=["game_id"], keep="last")
    schedules = schedules.sort_values(["gameday", "gametime", "game_id"])

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    schedules.to_csv(OUTPUT_PATH, index=False)

    latest_season = int(schedules["game_id"].str.slice(0, 4).astype(int).max())
    latest = schedules[schedules["game_id"].str.startswith(f"{latest_season}_")]
    complete = latest[["gameday", "gametime", "stadium"]].notna().all(axis=1).sum()
    print(f"Saved {len(schedules)} games to {OUTPUT_PATH}")
    print(f"{latest_season} schedule completeness: {complete}/{len(latest)}")


if __name__ == "__main__":
    main()
