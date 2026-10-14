"""
validate_clark_report.py - every number in a Clark Report matches its source
============================================================================
validate_report.py checks that a report agrees with itself (pick vs factors,
jargon, template leaks). This checks the data behind the in-depth report:

- the % in the headline, the "what N% means" section and the old summary
  prose all equal the published probability;
- every stat and rank quoted in a matchup paragraph is in that matchup's table;
- the edge named under each table is the side with the better ranks;
- the numbers drawer orders teams correctly (better value <=> better rank);
- the betting-line section matches the posted line;
- the injury section matches the injury report and the actual shift in Clark's %.
"""
from __future__ import annotations

import re

from src.clark_report import nick, ordinal
from src.odds import display_pct, market_view
from src.team_ranks import STATS

PCT_IN_TEXT = re.compile(r"(\d+)%")
STAT_SENTENCE = re.compile(r"\b(\d+(?:\.\d+)?%?)[^.()]*?\((\d+)(?:st|nd|rd|th)")


def _pick_pct(game: dict) -> int:
    prob = game["home_win_prob"] if game["predicted_winner"] == game["home_team"] else game["away_win_prob"]
    return display_pct(prob)


def _check_matchup(gid: str, name: str, section: dict) -> list[str]:
    errors: list[str] = []
    table = section["table"]
    allowed = {(r[side]["display"], r[side]["rank"]) for r in table["rows"] for side in ("offense", "defense")}
    for sentence in section["body"]:
        for value, rank in STAT_SENTENCE.findall(sentence):
            if (value, int(rank)) not in allowed and (value + "%", int(rank)) not in allowed:
                errors.append(f"{gid}: {name} quotes {value} ({ordinal(int(rank))}), not in its table")
    edge = sum(r["defense"]["rank"] - r["offense"]["rank"] for r in table["rows"])
    expected = table["offense_team"] if edge > 0 else table["defense_team"] if edge < 0 else None
    if table["edge_team"] != expected:
        errors.append(f"{gid}: {name} names {table['edge_team']} as the edge, ranks say {expected}")
    for r in table["rows"]:
        for side in ("offense", "defense"):
            if not 1 <= r[side]["rank"] <= 32:
                errors.append(f"{gid}: {name} has rank {r[side]['rank']}")
    return errors


# The matchup tables come from league ranks, not from the model, so the report
# may call them the biggest mismatch but never the cause of the pick.
OVERCLAIMS = ("whole pick is built on", "it starts with their", "the reason I picked")


def _check_drawer(gid: str, numbers: dict) -> list[str]:
    errors: list[str] = []
    by_label = {label: (key, higher) for key, (_, label, higher, _, _) in STATS.items()}
    parse = re.compile(r"([+-]?\d+(?:\.\d+)?)%? \((\d+)")
    for row in numbers["rows"]:
        if row["label"] not in by_label:
            continue
        _, higher = by_label[row["label"]]
        a, h = parse.match(row["away"]), parse.match(row["home"])
        if not a or not h:
            errors.append(f"{gid}: drawer row {row['label']!r} is unreadable")
            continue
        av, ar, hv, hr = float(a[1]), int(a[2]), float(h[1]), int(h[2])
        if av != hv and ar != hr and ((av > hv) == (ar < hr)) != higher:
            errors.append(f"{gid}: drawer {row['label']!r} ranks contradict values ({row['away']} vs {row['home']})")
    return errors


def validate_clark_report(game: dict) -> list[str]:
    report = game.get("clark_report")
    if not report:
        return []
    gid = game.get("game_id", "?")
    errors: list[str] = []
    pct = _pick_pct(game)
    pick, other = game["predicted_winner"], (game["away_team"] if game["predicted_winner"] == game["home_team"] else game["home_team"])

    if f"{nick(pick)} at {pct}%" not in report["headline"]:
        errors.append(f"{gid}: headline doesn't say {nick(pick)} at {pct}%")
    if report["meaning"]["pct"] != pct or f"about {pct} of them" not in report["meaning"]["body"] \
            or f"win {100 - pct}," not in report["meaning"]["body"]:
        errors.append(f"{gid}: 'what the % means' doesn't match {pct}%")
    for field in ("football_story", "explanation", "headline"):
        m = re.search(r"Clark picks (\w+) with an? (\d+)%", game.get(field) or "") or \
            re.search(r"Clark picks (\w+) \((\d+)%\)", game.get(field) or "")
        if m and (m[1] != pick or int(m[2]) != pct):
            errors.append(f"{gid}: {field} says {m[1]} {m[2]}%, published {pick} {pct}%")

    prose = " ".join([report["headline"], report["dek"], *report["intro"], *report["deciding"]["body"]])
    for phrase in OVERCLAIMS:
        if phrase in prose:
            errors.append(f"{gid}: report claims the matchup caused the pick ({phrase!r})")
    errors += _check_matchup(gid, "deciding matchup", report["deciding"])
    errors += _check_matchup(gid, "other side", report["other_side"])
    if pick not in (report["deciding"]["table"]["offense_team"], report["deciding"]["table"]["defense_team"]):
        errors.append(f"{gid}: deciding matchup doesn't involve the pick")
    errors += _check_drawer(gid, report["numbers"])

    mc = game.get("market_context") or {}
    view = market_view(game["home_team"], game["away_team"], mc.get("spread_line") or 0.0,
                       mc.get("home_moneyline"), mc.get("away_moneyline"))
    line = report.get("line")
    if view and view["favorite"]:
        if not line:
            errors.append(f"{gid}: a line is posted but the report has no line section")
        elif line["favorite"] != view["favorite"] or line["pct"] != display_pct(view["favorite_prob"]) \
                or abs(line["spread"] - view["spread"]) > 1e-9:
            errors.append(f"{gid}: line section {line['favorite']} {line['spread']} {line['pct']}% "
                          f"doesn't match the posted line")
    elif line:
        errors.append(f"{gid}: report quotes a line that isn't posted")

    inj, src = report.get("injuries"), game.get("injury_report")
    if inj:
        if not src or abs(float(inj["shift_pct"]) - float(src.get("shift_pct") or 0)) > 1e-9:
            errors.append(f"{gid}: injury shift in the report doesn't match the injury report")
        else:
            listed = {t["team"]: [p["name"] for p in t["players"]] for t in inj["teams"]}
            for side, team in (("home", game["home_team"]), ("away", game["away_team"])):
                want = [p["name"] for p in (src.get(side) or {}).get("players") or []]
                if listed.get(team, []) != want:
                    errors.append(f"{gid}: injury list for {team} doesn't match the injury report")
        for n in PCT_IN_TEXT.findall(inj["body"]):
            errors.append(f"{gid}: injury text quotes a percentage ({n}%)")
    for item in report["underdog"]["items"]:
        if pick in item["lead"].split() and "healthier" not in item["lead"]:
            errors.append(f"{gid}: 'how {other} wins' lists a reason for {pick}: {item['lead']!r}")
    return errors
