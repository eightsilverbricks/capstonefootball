#!/usr/bin/env python3
"""
export_rosters.py - starters, player stats and position ranks for the site
==========================================================================
Feeds /team/:abbr/roster (starters on a field) and /player/:id
(CLARK_OVERHAUL_PLAN.md §7). Free nflverse data, written once per refresh to
primary-ui/public/rosters.json:

    {season, updated, teams: {TEAM: {offense: [...11], defense: [...11]}},
     players: {gsis_id: {name, team, pos, espn_id, headshot, rank, season, last5, injury}}}

Starters come from each team's latest depth chart: for every slot of the
base offense and base defense, the top-ranked player. Ranks compare a player
with others at his position this season (min. 2 games played).
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

import nflreadpy as nfl
import pandas as pd

PRED_DIR = Path(__file__).resolve().parent.parent
OUT_PATH = PRED_DIR.parent / "primary-ui" / "public" / "rosters.json"
INJURY_CACHE = PRED_DIR / "data" / "processed" / "current_injuries.json"
SEASON = 2026
MIN_GAMES = 2
LAST_N = 5

# Position group -> (stat used to rank, label for "Top N <label>").
RANK_RULES: dict[str, tuple[str, str]] = {
    "QB": ("passing_yards", "QB in passing yards"),
    "RB": ("rushing_yards", "RB in rushing yards"),
    "WR": ("receiving_yards", "WR in receiving yards"),
    "TE": ("receiving_yards", "TE in receiving yards"),
    "DL": ("def_sacks", "defensive lineman in sacks"),
    "LB": ("tackles", "linebacker in tackles"),
    "DB": ("takeaways", "defensive back in interceptions + passes defended"),
    "K": ("fg_made", "kicker in field goals made"),
}
POS_GROUP = {
    "QB": "QB", "RB": "RB", "FB": "RB", "WR": "WR", "TE": "TE",
    "DE": "DL", "DT": "DL", "NT": "DL", "LDE": "DL", "RDE": "DL", "LDT": "DL", "RDT": "DL", "EDGE": "DL",
    "LB": "LB", "OLB": "LB", "ILB": "LB", "MLB": "LB", "WLB": "LB", "SLB": "LB", "LILB": "LB", "RILB": "LB",
    "CB": "DB", "LCB": "DB", "RCB": "DB", "NB": "DB", "S": "DB", "SS": "DB", "FS": "DB", "DB": "DB",
    "K": "K", "PK": "K",
    "LT": "OL", "LG": "OL", "C": "OL", "RG": "OL", "RT": "OL", "T": "OL", "G": "OL", "OL": "OL",
}


def plural(n: int | float, one: str, many: str) -> str:
    return f"{n:g} {one if n == 1 else many}"


def latest_starters(depth: pd.DataFrame) -> dict[str, dict[str, list[dict]]]:
    teams: dict[str, dict[str, list[dict]]] = {}
    for team, rows in depth.groupby("team"):
        rows = rows[rows["dt"] == rows["dt"].max()]
        groups = rows["pos_grp"].unique().tolist()
        offense = next((g for g in groups if "WR" in g or "TE" in g), None)
        defense = next((g for g in groups if str(g).startswith("Base")), None)
        sides = {}
        for side, grp in (("offense", offense), ("defense", defense)):
            if not grp:
                sides[side] = []
                continue
            slots = rows[rows["pos_grp"] == grp].sort_values(["pos_slot", "pos_rank"])
            first = slots.groupby("pos_slot", as_index=False).first()
            sides[side] = [
                {"id": r.gsis_id, "name": r.player_name, "pos": r.pos_abb, "slot": int(r.pos_slot)}
                for r in first.itertuples(index=False) if isinstance(r.gsis_id, str)
            ]
        teams[str(team)] = sides
    return teams


def stat_line(group: str, s: pd.Series) -> str | None:
    n = lambda c: int(s.get(c) or 0) if pd.notna(s.get(c)) else 0  # noqa: E731
    if group == "OL":
        return None  # linemen have no box-score line; their games are listed without one
    if group == "QB":
        return f"{n('completions')}/{n('attempts')}, {n('passing_yards')} yds, {n('passing_tds')} TD, {n('passing_interceptions')} INT"
    if group == "RB":
        return f"{plural(n('carries'), 'carry', 'carries')}, {n('rushing_yards')} yds, {n('rushing_tds')} TD · {n('receptions')} rec"
    if group in ("WR", "TE"):
        return f"{plural(n('receptions'), 'catch', 'catches')}, {n('receiving_yards')} yds, {n('receiving_tds')} TD"
    if group == "K":
        return f"{n('fg_made')}/{n('fg_att')} field goals"
    tackles = n("def_tackles_solo") + n("def_tackle_assists")
    sacks = float(s.get("def_sacks") or 0) if pd.notna(s.get("def_sacks")) else 0.0
    return (f"{plural(tackles, 'tackle', 'tackles')}, {plural(sacks, 'sack', 'sacks')}, "
            f"{n('def_interceptions')} INT, {n('def_pass_defended')} PD")


def player_table(stats: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
    weekly = stats[stats["season_type"] == "REG"].copy()
    weekly["tackles"] = weekly["def_tackles_solo"].fillna(0) + weekly["def_tackle_assists"].fillna(0)
    weekly["takeaways"] = weekly["def_interceptions"].fillna(0) + weekly["def_pass_defended"].fillna(0)
    numeric = weekly.select_dtypes("number").columns.difference(["season", "week"])
    totals = weekly.groupby("player_id")[list(numeric)].sum()
    totals["games"] = weekly.groupby("player_id")["week"].nunique()
    meta = weekly.sort_values("week").groupby("player_id").last()[["player_display_name", "position", "team", "headshot_url"]]
    return totals.join(meta), weekly


def rank_text(pid: str, group: str, totals: pd.DataFrame) -> str | None:
    rule = RANK_RULES.get(group)
    if not rule or pid not in totals.index:
        return None
    col, label = rule
    pool = totals[(totals["position"].map(lambda p: POS_GROUP.get(p, p)) == group) & (totals["games"] >= MIN_GAMES)]
    if pid not in pool.index or pool.at[pid, col] <= 0:
        return None
    rank = int(pool[col].rank(ascending=False, method="min").at[pid])
    return f"#{rank} {label}"


def injuries_by_name() -> dict[str, dict]:
    try:
        data = json.loads(INJURY_CACHE.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        return {}
    out: dict[str, dict] = {}
    for week in sorted(data.get("weeks", {}), key=int):
        for team, players in data["weeks"][week].items():
            for p in players:
                out[f"{team}|{p['name']}"] = {"status": p["status"]}
    return out


def main() -> None:
    depth = nfl.load_depth_charts(seasons=[SEASON]).to_pandas()
    stats = nfl.load_player_stats(seasons=[SEASON]).to_pandas()
    teams = latest_starters(depth)
    totals, weekly = player_table(stats)
    injuries = injuries_by_name()
    espn = depth.drop_duplicates("gsis_id").set_index("gsis_id")["espn_id"].to_dict()

    players: dict[str, dict] = {}
    for team, sides in teams.items():
        for side, starters in sides.items():
            for st in starters:
                pid = st["id"]
                group = POS_GROUP.get(st["pos"], st["pos"])
                row = totals.loc[pid] if pid in totals.index else None
                games = weekly[weekly["player_id"] == pid].sort_values("week").tail(LAST_N)
                players[pid] = {
                    "name": st["name"], "team": team, "pos": st["pos"], "side": side, "group": group,
                    "espn_id": str(espn.get(pid) or "") or None,
                    "headshot": (row["headshot_url"] if row is not None and isinstance(row["headshot_url"], str) else None),
                    "games": int(row["games"]) if row is not None else 0,
                    "rank": rank_text(pid, group, totals),
                    "season": stat_line(group, row) if row is not None else None,
                    "last5": [{"week": int(g["week"]), "opp": g["opponent_team"], "line": stat_line(group, g)}
                              for _, g in games.iterrows()],
                    "injury": injuries.get(f"{team}|{st['name']}"),
                }

    out = {"season": SEASON, "updated": datetime.now(timezone.utc).isoformat(timespec="minutes"),
           "teams": teams, "players": players}
    OUT_PATH.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"✅  {len(teams)} teams, {len(players)} starters -> {OUT_PATH.name} ({OUT_PATH.stat().st_size / 1024:.0f} KB)")


if __name__ == "__main__":
    main()
