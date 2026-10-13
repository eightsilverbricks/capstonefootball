#!/usr/bin/env python3
"""
espn_extras.py - current-season key players and injuries for the Clark Report
=============================================================================
The model's player context stops at the last completed season, so the report
can't name this year's starters or say who is hurt. ESPN's public game summary
endpoint has both for every game (season leaders + the injury report), free and
without a key. This script pulls them and merges two fields into each game of
predictions.json:

    key_players  : [{name, team, position, role, stat_line, espn_id}]
    injury_notes : [{name, team, position, status, injury}]

Nothing else is touched - no probability or prose is re-derived. Re-run before
each week (Tuesday) and again before kickoff (Sunday morning) for late injuries:

    cd nfl-prediction
    .venv/bin/python src/espn_extras.py --weeks 4 5

ESPN's API is unofficial; every ESPN-specific detail lives in this file so a
change on their side is a one-file fix.
"""
from __future__ import annotations

import argparse
import json
import time
import urllib.request
from pathlib import Path

THIS_DIR = Path(__file__).resolve().parent
REPO_ROOT = THIS_DIR.parent.parent
PREDICTIONS_PATH = REPO_ROOT / "primary-ui" / "public" / "predictions.json"
INJURY_CACHE_PATH = THIS_DIR.parent / "data" / "processed" / "current_injuries.json"

SCOREBOARD_URL = ("https://site.api.espn.com/apis/site/v2/sports/football/nfl/"
                  "scoreboard?week={week}&seasontype=2&dates={season}")
SUMMARY_URL = ("https://site.api.espn.com/apis/site/v2/sports/football/nfl/"
               "summary?event={event_id}")
REQUEST_PAUSE_S = 0.4      # be polite: ~16 requests per week of games

# ESPN abbreviations that differ from nflverse's.
ESPN_TO_NFLVERSE = {"WSH": "WAS", "LAR": "LA"}

# Leader categories worth a key-player card, in display order.
LEADER_ROLES = {
    "passingYards": ("QB", "Leads {team} in passing"),
    "rushingYards": ("RB", "Leads {team} in rushing"),
    "receivingYards": ("WR", "Leads {team} in receiving"),
    "sacks": ("DEF", "Leads {team} in sacks"),
}

# Only statuses that change who plays this week. IR players are long gone and
# already priced in; listing them would bury the news.
INJURY_STATUSES = ("Out", "Doubtful", "Questionable")
STATUS_RANK = {status: i for i, status in enumerate(INJURY_STATUSES)}
POSITION_RANK = {pos: i for i, pos in enumerate(
    ("QB", "RB", "WR", "TE", "OT", "T", "G", "C", "OL", "DE", "DT", "LB", "CB", "S"))}
MAX_INJURIES_PER_TEAM = 4


def nflverse_abbr(espn_abbr: str) -> str:
    return ESPN_TO_NFLVERSE.get(espn_abbr, espn_abbr)


def _get_json(url: str) -> dict:
    req = urllib.request.Request(url, headers={"User-Agent": "clarkindex/1.0"})
    with urllib.request.urlopen(req, timeout=20) as resp:
        return json.load(resp)


def _plain_stat_line(category: str, display: str) -> str:
    """'73/105, 730 YDS, 7 TD, 1 INT' -> '730 yards, 7 TD, 1 INT this season'."""
    parts = [p.strip() for p in display.split(",")]
    kept = []
    for part in parts:
        if "/" in part and category == "passingYards":
            continue  # completions/attempts: noise for a casual reader
        if part.endswith(" CAR") or part.endswith(" REC"):
            n, unit = part.split(" ", 1)
            kept.append(f"{n} {'carries' if unit == 'CAR' else 'catches'}")
            continue
        kept.append(part.replace(" YDS", " yards"))
    if category == "sacks":
        n = display.strip()
        return f"{n} sack{'s' if n not in ('1', '1.0') else ''} this season"
    return ", ".join(kept) + " this season"


def parse_key_players(summary: dict) -> list[dict]:
    players: list[dict] = []
    for team_block in summary.get("leaders") or []:
        team = nflverse_abbr((team_block.get("team") or {}).get("abbreviation", ""))
        for cat in team_block.get("leaders") or []:
            role = LEADER_ROLES.get(cat.get("name"))
            entries = cat.get("leaders") or []
            if not role or not entries:
                continue
            leader = entries[0]
            athlete = leader.get("athlete") or {}
            players.append({
                "name": athlete.get("displayName") or athlete.get("shortName") or "",
                "team": team,
                "position": (athlete.get("position") or {}).get("abbreviation") or role[0],
                "role": role[1].format(team=team),
                "stat_line": _plain_stat_line(cat.get("name"), leader.get("displayValue") or ""),
                "espn_id": str(athlete.get("id") or "") or None,
            })
    return [p for p in players if p["name"]]


def parse_injury_report(summary: dict) -> list[dict]:
    """Every listed Out / Doubtful / Questionable player, uncapped (for Clark's injury factor)."""
    report: list[dict] = []
    for team_block in summary.get("injuries") or []:
        team = nflverse_abbr((team_block.get("team") or {}).get("abbreviation", ""))
        for item in team_block.get("injuries") or []:
            athlete = item.get("athlete") or {}
            if item.get("status") in STATUS_RANK and athlete.get("displayName"):
                report.append({
                    "name": athlete["displayName"], "team": team,
                    "position": (athlete.get("position") or {}).get("abbreviation") or "",
                    "status": item["status"],
                })
    return report


def parse_injury_notes(summary: dict) -> list[dict]:
    notes: list[dict] = []
    for team_block in summary.get("injuries") or []:
        team = nflverse_abbr((team_block.get("team") or {}).get("abbreviation", ""))
        team_notes = []
        for item in team_block.get("injuries") or []:
            status = item.get("status") or ""
            if status not in STATUS_RANK:
                continue
            athlete = item.get("athlete") or {}
            team_notes.append({
                "name": athlete.get("displayName") or "",
                "team": team,
                "position": (athlete.get("position") or {}).get("abbreviation") or "",
                "status": status,
                "injury": ((item.get("details") or {}).get("type") or "").strip(),
            })
        team_notes.sort(key=lambda n: (STATUS_RANK[n["status"]],
                                       POSITION_RANK.get(n["position"], 99)))
        notes.extend(n for n in team_notes[:MAX_INJURIES_PER_TEAM] if n["name"])
    return notes


def fetch_week(season: int, week: int) -> dict[tuple[str, str], dict]:
    """{(away, home): {key_players, injury_notes}} for one week."""
    board = _get_json(SCOREBOARD_URL.format(season=season, week=week))
    out: dict[tuple[str, str], dict] = {}
    for event in board.get("events") or []:
        comp = (event.get("competitions") or [{}])[0]
        sides = {c.get("homeAway"): nflverse_abbr(c["team"]["abbreviation"])
                 for c in comp.get("competitors") or []}
        if "home" not in sides or "away" not in sides:
            continue
        time.sleep(REQUEST_PAUSE_S)
        summary = _get_json(SUMMARY_URL.format(event_id=event["id"]))
        out[(sides["away"], sides["home"])] = {
            "espn_event_id": str(event["id"]),
            "key_players": parse_key_players(summary),
            "injury_notes": parse_injury_notes(summary),
            "_injury_report": parse_injury_report(summary),
        }
    return out


def write_injury_cache(season: int, week: int, extras: dict[tuple[str, str], dict]) -> None:
    """Save the full injury list so the export can move Clark's % for this week (injury_adjust.py)."""
    teams: dict[str, list[dict]] = {}
    for found in extras.values():
        for player in found.get("_injury_report") or []:
            teams.setdefault(player["team"], []).append(player)
    INJURY_CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(INJURY_CACHE_PATH, "w", encoding="utf-8") as fh:
        json.dump({"season": season, "week": week, "teams": teams}, fh, indent=1, ensure_ascii=False)


def merge_into_predictions(predictions: list[dict], season: int, week: int,
                           extras: dict[tuple[str, str], dict]) -> int:
    merged = 0
    for game in predictions:
        if int(game.get("season") or 0) != season or int(game.get("week") or 0) != week:
            continue
        found = extras.get((game.get("away_team"), game.get("home_team")))
        if found:
            game.update({k: v for k, v in found.items() if not k.startswith("_")})
            merged += 1
    return merged


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[1])
    parser.add_argument("--season", type=int, default=2026)
    parser.add_argument("--weeks", type=int, nargs="+", required=True)
    args = parser.parse_args()

    with open(PREDICTIONS_PATH, encoding="utf-8") as fh:
        predictions = json.load(fh)

    for week in args.weeks:
        extras = fetch_week(args.season, week)
        merged = merge_into_predictions(predictions, args.season, week, extras)
        if week == min(args.weeks):
            write_injury_cache(args.season, week, extras)
        print(f"   Week {week}: {merged}/{len(extras)} games updated from ESPN")

    with open(PREDICTIONS_PATH, "w", encoding="utf-8") as fh:
        json.dump(predictions, fh, indent=2, ensure_ascii=False)
    print(f"   Wrote {PREDICTIONS_PATH}")


if __name__ == "__main__":
    main()
