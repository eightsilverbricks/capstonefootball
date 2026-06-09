#!/usr/bin/env python3
"""
build_wind_impact.py
====================
Computes historical pass EPA by wind speed tier from PBP data.

Wind tiers (mph):
  dome     — enclosed roof (dome/closed/retractable)
  calm     — 0–10 mph
  moderate — 11–20 mph
  high     — 21–30 mph
  severe   — 31+ mph

Outputs data/processed/wind_impact.json:
{
  "calm": {
    "avg_pass_epa":   0.130,
    "delta_vs_calm":  0.000,
    "game_count":     450,
    "consequence":    "Normal conditions — no weather impact on passing."
  },
  ...
}

Run from nfl-prediction/:
    .venv/bin/python3 src/build_wind_impact.py
"""

from __future__ import annotations

import json
from pathlib import Path

import pandas as pd

THIS_DIR = Path(__file__).resolve().parent
PRED_DIR = THIS_DIR.parent
PBP_PATH = PRED_DIR / "data" / "raw" / "pbp.parquet"
OUT_PATH = PRED_DIR / "data" / "processed" / "wind_impact.json"

_COLS = ["game_id", "pass_attempt", "epa", "wind", "roof"]

_CONSEQUENCES: dict[str, str] = {
    "dome":     "Indoors — no weather impact on passing.",
    "calm":     "Normal conditions — no weather impact on passing.",
    "moderate": "Moderate wind (11–20 mph): minimal impact; deep routes may be affected.",
    "high":     "High wind (21–30 mph): passing efficiency is significantly reduced. Expect more short-to-intermediate routes and potential run-game emphasis.",
    "severe":   "Severe wind (31+ mph): extreme weather. Passing game is heavily compromised — ground game and field position dominate.",
}


def wind_speed_to_tier(wind_mph: float | None, roof: str | None) -> str:
    """Classify a game into a wind impact tier."""
    roof = (roof or "").lower()
    if roof in ("dome", "closed", "retractable"):
        return "dome"
    mph = float(wind_mph or 0)
    if mph >= 31:
        return "severe"
    if mph >= 21:
        return "high"
    if mph >= 11:
        return "moderate"
    return "calm"


def build_wind_impact(pbp_path: Path = PBP_PATH) -> dict[str, dict]:
    """
    Compute mean pass EPA per wind tier and delta vs. calm baseline.
    Returns dict keyed by tier name.
    """
    df = pd.read_parquet(pbp_path, columns=_COLS)

    pass_plays = df[(df["pass_attempt"] == 1) & df["epa"].notna()].copy()

    # Game-level wind/roof (consistent within a game — take first non-null value)
    game_meta = (
        pass_plays.groupby("game_id")
        .agg(wind=("wind", "first"), roof=("roof", "first"))
        .reset_index()
    )
    game_meta["tier"] = game_meta.apply(
        lambda r: wind_speed_to_tier(r["wind"], r["roof"]), axis=1
    )

    # Merge tier back onto play level
    pass_plays = pass_plays.merge(game_meta[["game_id", "tier"]], on="game_id", how="left")

    tier_epa   = pass_plays.groupby("tier")["epa"].mean()
    tier_games = pass_plays.groupby("tier")["game_id"].nunique()

    calm_epa = float(tier_epa.get("calm", tier_epa.mean()))

    all_tiers = ["dome", "calm", "moderate", "high", "severe"]
    result: dict[str, dict] = {}
    for tier in all_tiers:
        avg   = float(tier_epa.get(tier, calm_epa))
        delta = round(avg - calm_epa, 4)
        count = int(tier_games.get(tier, 0))
        result[tier] = {
            "avg_pass_epa":  round(avg, 4),
            "delta_vs_calm": delta if tier != "calm" else 0.0,
            "game_count":    count,
            "consequence":   _consequence_with_delta(tier, delta),
        }

    return result


def _consequence_with_delta(tier: str, delta: float) -> str:
    base = _CONSEQUENCES[tier]
    if tier in ("dome", "calm") or delta >= 0:
        return base
    # Compute pct drop relative to typical calm EPA (~0.13)
    pct = round(abs(delta / 0.13) * 100)
    return base.replace("significantly", f"~{pct}%")


def main() -> None:
    print(f"Reading PBP from {PBP_PATH} …")
    result = build_wind_impact()
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT_PATH, "w") as fh:
        json.dump(result, fh, indent=2)
    print(f"✅  Wind impact tiers → {OUT_PATH}")
    for tier, stats in result.items():
        print(f"   {tier:10s}  games={stats['game_count']:4d}  "
              f"avg_epa={stats['avg_pass_epa']:+.4f}  "
              f"delta={stats['delta_vs_calm']:+.4f}")


if __name__ == "__main__":
    main()
