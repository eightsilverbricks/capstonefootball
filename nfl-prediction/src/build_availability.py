#!/usr/bin/env python3
"""
build_availability.py
=====================
Team-week availability and environment features: who is hurt, whether the
starting quarterback changed, and what the game is being played in.

The model has been blind to all of this. Two teams with identical season EPA are
not the same matchup if one has lost its starting quarterback, and nothing in
the season_/last3_ rollups can express that — they average over the games the
previous starter played.

Writes data/processed/availability.parquet, keyed by (season, week, team).
"""

from pathlib import Path

import nflreadpy as nfl
import pandas as pd

BASE_DIR = Path(__file__).resolve().parent.parent
PROCESSED_DIR = BASE_DIR / "data" / "processed"
PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

FIRST_SEASON = 2009  # first season with injury reports in nflverse
LAST_SEASON = 2025

# Rough positional value. A missing quarterback is not one missing player, and a
# flat headcount of injuries would say it is.
POSITION_WEIGHT = {
    "QB": 10.0, "LT": 3.0, "T": 2.0, "WR": 2.0, "CB": 2.0, "DE": 2.0,
    "RB": 1.5, "TE": 1.5, "G": 1.5, "C": 1.5, "S": 1.5, "LB": 1.5,
    "DT": 1.5, "OLB": 1.5, "ILB": 1.0, "FS": 1.0, "SS": 1.0,
}
DEFAULT_WEIGHT = 1.0

# How much a report status actually costs you in expected availability.
STATUS_WEIGHT = {"Out": 1.0, "Doubtful": 0.75, "Questionable": 0.25}


def build_injury_features(seasons: list[int]) -> pd.DataFrame:
    inj = nfl.load_injuries(seasons=seasons).to_pandas()
    inj = inj[inj["report_status"].notna()].copy()

    inj["pos_weight"] = inj["position"].map(POSITION_WEIGHT).fillna(DEFAULT_WEIGHT)
    inj["status_weight"] = inj["report_status"].map(STATUS_WEIGHT).fillna(0.0)
    inj["burden"] = inj["pos_weight"] * inj["status_weight"]
    inj["qb_hit"] = (
        (inj["position"] == "QB") & (inj["report_status"].isin(["Out", "Doubtful"]))
    ).astype(int)

    grouped = inj.groupby(["season", "week", "team"], as_index=False).agg(
        injury_burden=("burden", "sum"),
        n_out=("report_status", lambda s: int((s == "Out").sum())),
        qb_out=("qb_hit", "max"),
    )
    return grouped.rename(columns={"team": "club_code"})


def build_qb_change(seasons: list[int]) -> pd.DataFrame:
    """Flag weeks where the listed QB1 differs from the previous week."""
    dc = nfl.load_depth_charts(seasons=seasons).to_pandas()

    pos_col = "depth_position" if "depth_position" in dc.columns else "position"
    starters = dc[(dc[pos_col] == "QB") & (dc["depth_team"].astype(str) == "1")].copy()
    starters = starters.sort_values(["season", "club_code", "week"])
    starters = starters.drop_duplicates(["season", "club_code", "week"], keep="first")

    starters["prev_qb"] = starters.groupby(["season", "club_code"])["gsis_id"].shift(1)
    starters["qb_change"] = (
        starters["prev_qb"].notna() & (starters["gsis_id"] != starters["prev_qb"])
    ).astype(int)

    return starters[["season", "week", "club_code", "qb_change"]]


def main() -> None:
    seasons = list(range(FIRST_SEASON, LAST_SEASON + 1))

    print(f"Loading injuries {FIRST_SEASON}-{LAST_SEASON}...")
    injuries = build_injury_features(seasons)
    print(f"  {len(injuries)} team-weeks")

    print("Loading depth charts...")
    qb = build_qb_change(seasons)
    print(f"  {len(qb)} team-weeks")

    merged = injuries.merge(qb, on=["season", "week", "club_code"], how="outer")
    merged = merged.rename(columns={"club_code": "team"})
    for col in ("injury_burden", "n_out", "qb_out", "qb_change"):
        merged[col] = merged[col].fillna(0.0)

    out = PROCESSED_DIR / "availability.parquet"
    merged.to_parquet(out, index=False)
    print(f"Saved: {out}  rows={len(merged)}")
    print(merged.head().to_string(index=False))


if __name__ == "__main__":
    main()
