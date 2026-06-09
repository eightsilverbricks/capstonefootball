#!/usr/bin/env python3
"""
build_pressure_context.py
=========================
Computes per-game, per-team pressure rates from play-by-play data.

Pressure proxy: a dropback is "pressured" when qb_hit == 1 OR sack == 1.
(was_pressure is absent from the nflverse PBP parquet for older seasons.)

Outputs data/processed/pressure_context.json:
{
  "2024_01_KC_BAL": {
    "KC": {
      "pressure_generated_rate": 0.32,
      "pressure_faced_rate":     0.18,
      "dropbacks_defended":      34,
      "dropbacks_faced":         28
    },
    "BAL": { ... }
  }
}

Run from nfl-prediction/:
    .venv/bin/python3 src/build_pressure_context.py
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pandas as pd

THIS_DIR = Path(__file__).resolve().parent
PRED_DIR = THIS_DIR.parent
PBP_PATH = PRED_DIR / "data" / "raw" / "pbp.parquet"
OUT_PATH = PRED_DIR / "data" / "processed" / "pressure_context.json"

_COLS = ["game_id", "posteam", "defteam", "pass_attempt", "qb_hit", "sack"]


def build_pressure_context(pbp_path: Path = PBP_PATH) -> dict[str, dict[str, dict[str, Any]]]:
    """
    Return nested dict: game_id → team → pressure stats.

    pressure_generated_rate: fraction of opponent dropbacks where this team's
                             defense generated pressure (as defteam).
    pressure_faced_rate:     fraction of own dropbacks where this team's QB
                             faced pressure (as posteam).
    """
    df = pd.read_parquet(pbp_path, columns=_COLS)

    dropbacks = df[df["pass_attempt"] == 1].copy()
    dropbacks["qb_hit"]    = dropbacks["qb_hit"].fillna(0).astype(int)
    dropbacks["sack"]      = dropbacks["sack"].fillna(0).astype(int)
    dropbacks["pressured"] = ((dropbacks["qb_hit"] == 1) | (dropbacks["sack"] == 1)).astype(int)
    dropbacks = dropbacks.dropna(subset=["game_id", "posteam", "defteam"])

    result: dict[str, dict[str, dict[str, Any]]] = {}

    for game_id, game_df in dropbacks.groupby("game_id"):
        game_id = str(game_id)
        teams = game_df["posteam"].dropna().unique().tolist()
        if len(teams) != 2:
            continue

        entry: dict[str, dict[str, Any]] = {}
        for team in teams:
            off_rows = game_df[game_df["posteam"] == team]
            faced_total    = len(off_rows)
            faced_pressure = int(off_rows["pressured"].sum())

            def_rows = game_df[game_df["defteam"] == team]
            defended_total    = len(def_rows)
            defended_pressure = int(def_rows["pressured"].sum())

            entry[team] = {
                "pressure_generated_rate": round(defended_pressure / defended_total, 4)
                                           if defended_total > 0 else None,
                "pressure_faced_rate":     round(faced_pressure / faced_total, 4)
                                           if faced_total > 0 else None,
                "dropbacks_defended":      defended_total,
                "dropbacks_faced":         faced_total,
            }

        if len(entry) == 2:
            result[game_id] = entry

    return result


def main() -> None:
    print(f"Reading PBP from {PBP_PATH} …")
    ctx = build_pressure_context()
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT_PATH, "w") as fh:
        json.dump(ctx, fh, indent=2)
    print(f"✅  {len(ctx)} games → {OUT_PATH}")


if __name__ == "__main__":
    main()
