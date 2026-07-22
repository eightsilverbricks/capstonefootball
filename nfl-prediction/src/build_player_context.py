"""
build_player_context.py
=======================
Builds data/processed/player_context.json from the existing PBP parquet.

Outputs per-team per-season:
  - Starting QB: name, attempts, epa_per_att, cpoe
  - Top rusher: name, carries, ypc, total_epa
  - Passing offense: total pass EPA, yards per attempt
  - Rushing offense: total rush EPA, yards per carry
  - Defense: EPA allowed per pass play, sack rate

Run:
    python3 src/build_player_context.py
"""

from pathlib import Path
import json
import pandas as pd

BASE_DIR = Path(__file__).resolve().parent.parent
PBP_PATH  = BASE_DIR / "data" / "raw" / "pbp.parquet"
PLAYER_IDS_PATH = BASE_DIR / "data" / "raw" / "player_ids.parquet"
OUT_PATH  = BASE_DIR / "data" / "processed" / "player_context.json"

MIN_QB_ATTEMPTS  = 50
MIN_RB_CARRIES   = 30


def load_gsis_to_espn() -> dict[str, str]:
    """gsis_id -> espn_id crosswalk for building real headshot URLs.

    Returns {} (graceful degradation to TeamLogo fallback) if the crosswalk
    hasn't been fetched yet — run download_data.py to populate it.
    """
    if not PLAYER_IDS_PATH.exists():
        print(f"  (no {PLAYER_IDS_PATH.name} — run download_data.py for headshots; "
              "continuing without espn_id)")
        return {}
    ids = pd.read_parquet(PLAYER_IDS_PATH, columns=["gsis_id", "espn_id"])
    ids = ids.dropna(subset=["gsis_id", "espn_id"])
    return dict(zip(ids["gsis_id"], ids["espn_id"].astype(int).astype(str)))


def build(pbp: pd.DataFrame, gsis_to_espn: dict[str, str] | None = None) -> dict:
    """Returns {season: {team: {...player context...}}}"""
    gsis_to_espn = gsis_to_espn or {}
    context: dict = {}

    for season in sorted(pbp["season"].unique()):
        s = pbp[pbp["season"] == season]
        context[int(season)] = {}

        teams = set(s["home_team"].dropna().unique()) | set(s["posteam"].dropna().unique())

        for team in teams:
            team_plays = s[s["posteam"] == team]
            opp_plays  = s[s["defteam"] == team]   # plays where team is on defense

            # ── QB stats ────────────────────────────────────────────────────────
            qb_plays = team_plays[
                (team_plays["play_type"] == "pass") &
                team_plays["passer_player_name"].notna() &
                team_plays["epa"].notna()
            ]
            qb_agg = (
                qb_plays
                .groupby(["passer_player_name", "passer_player_id"], dropna=False)
                .agg(attempts=("pass_attempt", "sum"), epa=("epa", "sum"), cpoe=("cpoe", "mean"))
                .reset_index()
            )
            qb_agg = qb_agg[qb_agg["attempts"] >= MIN_QB_ATTEMPTS]
            qb_agg["epa_per_att"] = (qb_agg["epa"] / qb_agg["attempts"]).round(3)

            if not qb_agg.empty:
                starter = qb_agg.sort_values("attempts", ascending=False).iloc[0]
                qb_ctx = {
                    "name":        starter["passer_player_name"],
                    "attempts":    int(starter["attempts"]),
                    "epa_per_att": float(round(starter["epa_per_att"], 3)),
                    "cpoe":        float(round(starter["cpoe"], 2)) if pd.notna(starter["cpoe"]) else None,
                    "espn_id":     gsis_to_espn.get(starter["passer_player_id"]),
                }
            else:
                qb_ctx = {"name": None, "attempts": 0, "epa_per_att": 0.0, "cpoe": None, "espn_id": None}

            # ── RB stats ────────────────────────────────────────────────────────
            rush_plays = team_plays[
                (team_plays["play_type"] == "run") &
                team_plays["rusher_player_name"].notna() &
                team_plays["yards_gained"].notna()
            ]
            rb_agg = (
                rush_plays
                .groupby(["rusher_player_name", "rusher_player_id"], dropna=False)
                .agg(carries=("rush_attempt", "sum"), yards=("yards_gained", "sum"), epa=("epa", "sum"))
                .reset_index()
            )
            rb_agg = rb_agg[rb_agg["carries"] >= MIN_RB_CARRIES]
            rb_agg["ypc"] = (rb_agg["yards"] / rb_agg["carries"]).round(2)

            if not rb_agg.empty:
                top_rb = rb_agg.sort_values("carries", ascending=False).iloc[0]
                rb_ctx = {
                    "name":    top_rb["rusher_player_name"],
                    "carries": int(top_rb["carries"]),
                    "ypc":     float(round(top_rb["ypc"], 2)),
                    "epa":     float(round(top_rb["epa"], 1)),
                    "espn_id": gsis_to_espn.get(top_rb["rusher_player_id"]),
                }
            else:
                rb_ctx = {"name": None, "carries": 0, "ypc": 0.0, "epa": 0.0, "espn_id": None}

            # ── Offense summary ─────────────────────────────────────────────────
            pass_epa_total = float(round(qb_plays["epa"].sum(), 2)) if not qb_plays.empty else 0.0
            pass_att_total = int(qb_plays["pass_attempt"].sum()) if not qb_plays.empty else 0

            rush_epa_total = float(round(rush_plays["epa"].sum(), 2)) if not rush_plays.empty else 0.0
            rush_att_total = int(rush_plays["rush_attempt"].sum()) if not rush_plays.empty else 0

            # ── Defense ─────────────────────────────────────────────────────────
            def_pass = opp_plays[(opp_plays["play_type"] == "pass") & opp_plays["epa"].notna()]
            def_epa_per_play = (
                float(round(def_pass["epa"].mean(), 3)) if not def_pass.empty else 0.0
            )
            sacks = opp_plays[opp_plays.get("sack", pd.Series(dtype=float)).fillna(0) == 1] if "sack" in opp_plays.columns else pd.DataFrame()
            sack_rate = float(round(len(sacks) / max(pass_att_total, 1), 3))

            context[int(season)][team] = {
                "qb":            qb_ctx,
                "rb":            rb_ctx,
                "off_pass_epa":  pass_epa_total,
                "off_rush_epa":  rush_epa_total,
                "def_epa_per_play": def_epa_per_play,
            }

    return context


def main():
    print(f"Loading PBP from {PBP_PATH} …")
    pbp = pd.read_parquet(PBP_PATH)
    print(f"  {len(pbp):,} plays · seasons {sorted(pbp['season'].unique())}")

    print("Loading gsis_id -> espn_id crosswalk …")
    gsis_to_espn = load_gsis_to_espn()
    print(f"  {len(gsis_to_espn):,} players with an espn_id")

    print("Building player context …")
    ctx = build(pbp, gsis_to_espn)

    total_entries = sum(len(v) for v in ctx.values())
    print(f"  {total_entries} team-season entries")

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT_PATH, "w") as f:
        json.dump(ctx, f, separators=(",", ":"))

    size_kb = OUT_PATH.stat().st_size // 1024
    print(f"  Wrote {OUT_PATH} ({size_kb} KB)")


if __name__ == "__main__":
    main()
