"""
clark_report.py - the Clark Report, in Clark's voice
====================================================
Builds `clark_report` for one exported game from numbers the pipeline already
has: the pick, the factor cards, the betting line and league ranks
(team_ranks.py). Clark is a stats-nerd buddy: first person, plain English,
excited about the numbers, honest about uncertainty.

Everything here is a template. clark_llm.py may rewrite the prose afterwards,
but only with these same facts, so this module is also the fallback.
"""
from __future__ import annotations

import hashlib

from src.odds import market_view
from src.team_ranks import league_ranks, ordinal

REPORT_VERSION = 1

TEAM_NAMES = {
    "ARI": "Cardinals", "ATL": "Falcons", "BAL": "Ravens", "BUF": "Bills",
    "CAR": "Panthers", "CHI": "Bears", "CIN": "Bengals", "CLE": "Browns",
    "DAL": "Cowboys", "DEN": "Broncos", "DET": "Lions", "GB": "Packers",
    "HOU": "Texans", "IND": "Colts", "JAX": "Jaguars", "KC": "Chiefs",
    "LA": "Rams", "LAC": "Chargers", "LV": "Raiders", "MIA": "Dolphins",
    "MIN": "Vikings", "NE": "Patriots", "NO": "Saints", "NYG": "Giants",
    "NYJ": "Jets", "PHI": "Eagles", "PIT": "Steelers", "SEA": "Seahawks",
    "SF": "49ers", "TB": "Buccaneers", "TEN": "Titans", "WAS": "Commanders",
}

# (offense stat, defense stat, row label) for a "when X has the ball" table.
MATCHUP_ROWS = (
    ("points", "points_allowed", "Points per game"),
    ("ypp", "ypp_allowed", "Yards per play"),
    ("sacks_allowed", "sack_rate", "Sack rate"),
)
DRAWER_STATS = ("points", "points_allowed", "ypp", "ypp_allowed",
                "sacks_allowed", "sack_rate", "epa", "epa_allowed", "success")
# Factors that are context, not football reasons.
NON_FOOTBALL = {"Market Edge"}
# Factors that describe something the underdog can actually do on the field.
UNDERDOG_FACTORS = {"Momentum", "Recent Offense", "Defensive Edge"}
# The factor cards speak about Clark in the third person; the report is his voice.
FIRST_PERSON = (
    ("in Clark's model", "in my model"),
    ("Clark also picks", "I also pick"),
    ("Clark's model", "my model"),
    ("Clark picks", "I pick"),
)


def nick(team: str) -> str:
    return TEAM_NAMES.get(team, team)


def first_person(text: str) -> str:
    for old, new in FIRST_PERSON:
        text = text.replace(old, new)
    return text


def lower_first(text: str) -> str:
    """Lowercase the first letter for use mid-sentence, unless it starts a team code like "LA"."""
    first = text.split(" ", 1)[0]
    return text if first.isupper() else text[:1].lower() + text[1:]


def _variant(game_id: str, options: tuple[str, ...]) -> str:
    """Pick a phrasing deterministically, so re-exports don't churn the text."""
    digest = int(hashlib.sha1(game_id.encode()).hexdigest(), 16)
    return options[digest % len(options)]


# ---------------------------------------------------------------------------
# Matchup tables
# ---------------------------------------------------------------------------

def build_matchup(offense: str, defense: str, teams: dict) -> dict:
    """Offense vs defense, row by row. edge > 0 means the offense has the better ranks."""
    rows = []
    edge = 0
    for off_key, def_key, label in MATCHUP_ROWS:
        off, dfn = teams[offense][off_key], teams[defense][def_key]
        gap = dfn["rank"] - off["rank"]
        edge += gap
        rows.append({
            "label": label, "off_key": off_key, "def_key": def_key, "gap": gap,
            "offense": {"display": off["display"], "rank": off["rank"]},
            "defense": {"display": dfn["display"], "rank": dfn["rank"]},
        })
    return {
        "offense_team": offense, "defense_team": defense,
        "title": f"When the {nick(offense)} have the ball",
        "rows": rows, "edge": edge,
        "edge_team": offense if edge > 0 else defense if edge < 0 else None,
    }


def _row_sentence(row: dict, offense: str, defense: str) -> str:
    off, dfn = row["offense"], row["defense"]
    o_rank, d_rank = ordinal(off["rank"]), ordinal(dfn["rank"])
    if row["off_key"] == "points":
        return (f"The {nick(offense)} score {off['display']} points a game ({o_rank} in the league), "
                f"and the {nick(defense)} allow {dfn['display']} ({d_rank}).")
    if row["off_key"] == "ypp":
        return (f"On a typical play the {nick(offense)} gain {off['display']} yards ({o_rank}), "
                f"while the {nick(defense)} give up {dfn['display']} ({d_rank}).")
    return (f"The {nick(offense)} line gives up a sack on {off['display']} of dropbacks ({o_rank}), "
            f"and the {nick(defense)} get home on {dfn['display']} ({d_rank}).")


def _matchup_body(m: dict, pick: str, is_deciding: bool) -> list[str]:
    offense, defense = m["offense_team"], m["defense_team"]
    ordered = sorted(m["rows"], key=lambda r: -abs(r["gap"]))
    lines = [_row_sentence(ordered[0], offense, defense)]
    if abs(ordered[1]["gap"]) >= 8:
        lines.append(_row_sentence(ordered[1], offense, defense))
    if m["edge_team"] is None:
        lines.append("On paper this side of the ball is a wash, so I'm not leaning on it either way.")
    elif is_deciding and m["edge_team"] == pick:
        lines.append(f"That's the number that jumped out at me. It's the biggest edge on the field, "
                     f"and it belongs to the {nick(pick)}.")
    elif m["edge_team"] == pick:
        lines.append(f"So the {nick(pick)} have the better of this side too, which is part of why I'm comfortable.")
    else:
        lines.append(f"I'll be honest: this side of the ball favors the {nick(m['edge_team'])}, "
                     f"and it's the part that keeps my number from going higher.")
    return lines


# ---------------------------------------------------------------------------
# Sections
# ---------------------------------------------------------------------------

def _opener(game_id: str, pct: int) -> str:
    if pct >= 70:
        return _variant(game_id, (
            "This is one of my more confident calls of the week.",
            "I don't say this often, but I feel good about this one.",
        ))
    if pct >= 58:
        return _variant(game_id, (
            "I like this pick, but it's not a runaway.",
            "There's a clear lean here, even if it isn't a blowout on paper.",
        ))
    return _variant(game_id, (
        "Okay, this one's close. I went back and forth on it.",
        "Honestly? This is close to a coin flip, and I want to show you why.",
    ))


def _reasons(cards: list[dict], team: str) -> list[dict]:
    return [c for c in cards
            if c.get("advantage_team") == team and c.get("name") not in NON_FOOTBALL
            and c.get("status") != "NEUTRAL"]


def _underdog_path(other: str, against: list[dict], teams: dict) -> list[dict]:
    plays = [c for c in against if c.get("name") in UNDERDOG_FACTORS]
    items = [{"lead": c["headline"], "text": first_person(c["explanation"])} for c in plays[:2]]
    best_key = min(("points", "ypp", "points_allowed", "ypp_allowed"),
                   key=lambda k: teams[other][k]["rank"])
    best = teams[other][best_key]
    if best["rank"] <= 12:
        items.append({
            "lead": "Lean on what they do best.",
            "text": f"The {nick(other)} are {ordinal(best['rank'])} in {best['label'].lower()} "
                    f"({best['display']}). If that shows up, this gets tight fast.",
        })
    items.append({
        "lead": "Win the turnover battle.",
        "text": f"Two extra possessions for the {nick(other)} would erase most of the edge I just described.",
    })
    return items[:3]


def _change_my_mind(pick: str, other: str, deciding: dict) -> list[str]:
    if deciding["offense_team"] == pick:
        watch = (f"If the {nick(pick)} have fewer than 10 points at halftime, the matchup I'm counting on "
                 f"isn't happening, and I'd call it a coin flip.")
    else:
        watch = (f"If the {nick(other)} score 14 or more in the first half, the {nick(pick)} defense isn't "
                 f"doing what I expected, and I'd lean their way.")
    return [
        watch,
        f"If the {nick(other)} win the turnover battle by 2 or more, I'd make them the favorite.",
        "If either starting quarterback is ruled out before kickoff, ignore this report and check back.",
    ]


def _meaning(pick: str, other: str, pct: int) -> str:
    rest = 100 - pct
    weight = ("which is a lot" if rest >= 35 else "which is not nothing" if rest >= 20 else "so an upset would be a real surprise")
    return (f"If this game were played 100 times, I think the {nick(pick)} win about {pct} of them. "
            f"That means the {nick(other)} win {rest}, {weight}.")


def _line_note(game: dict, pick: str, pct: int, reasons: list[dict]) -> dict | None:
    mc = game.get("market_context") or {}
    view = market_view(game["home_team"], game["away_team"], mc.get("spread_line") or 0.0,
                       mc.get("home_moneyline"), mc.get("away_moneyline"))
    if not view or not view["favorite"]:
        return None
    fav, line_pct = view["favorite"], round(view["favorite_prob"] * 100)
    spread = f"{view['spread']:g}"
    head = f"The line has the {nick(fav)} by {spread}, about {line_pct}%."
    why = f" Most of the gap comes from {reasons[0]['name'].lower()}." if reasons else ""
    if fav != pick:
        body = f"{head} I'm on the other side at {pct}% for the {nick(pick)}.{why} That's a real disagreement, and I'll own it either way."
    elif abs(line_pct - pct) <= 4:
        body = f"{head} I'm at {pct}%, so we basically agree on this one."
    elif pct > line_pct:
        body = f"{head} I'm higher at {pct}%.{why}"
    else:
        body = f"{head} I'm a bit lower at {pct}%. I like the {nick(pick)}, just not quite as much as the market does."
    return {"favorite": fav, "spread": view["spread"], "pct": line_pct, "body": body}


def _numbers(game: dict, teams: dict) -> dict:
    away, home = game["away_team"], game["home_team"]
    rows = []
    for key in DRAWER_STATS:
        a, h = teams[away][key], teams[home][key]
        rows.append({"label": a["label"],
                     "away": f"{a['display']} ({ordinal(a['rank'])})",
                     "home": f"{h['display']} ({ordinal(h['rank'])})"})
    return {"away": away, "home": home, "rows": rows}


def _dek(m: dict) -> str:
    row = max(m["rows"], key=lambda r: abs(r["gap"]))
    off, dfn = nick(m["offense_team"]), nick(m["defense_team"])
    return (f"{row['label']}: the {off} offense ranks {ordinal(row['offense']['rank'])}, "
            f"the {dfn} defense ranks {ordinal(row['defense']['rank'])}. "
            f"That's the gap this whole pick is built on.")


def _table(m: dict) -> dict:
    return {
        "offense_team": m["offense_team"], "defense_team": m["defense_team"],
        "edge_team": m["edge_team"],
        "rows": [{"label": r["label"], "offense": r["offense"], "defense": r["defense"]} for r in m["rows"]],
    }


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

def build_clark_report(game: dict) -> dict | None:
    """The template Clark Report for one game, or None when ranks aren't available."""
    ranks = league_ranks(int(game["season"]), int(game["week"]))
    home, away, pick = game["home_team"], game["away_team"], game["predicted_winner"]
    if not ranks or home not in ranks["teams"] or away not in ranks["teams"] or pick not in (home, away):
        return None

    teams, gid = ranks["teams"], str(game["game_id"])
    other = away if pick == home else home
    prob = game["home_win_prob"] if pick == home else game["away_win_prob"]
    pct = round(float(prob) * 100)
    cards = game.get("factor_cards") or []
    reasons, against = _reasons(cards, pick), _reasons(cards, other)

    pick_off = build_matchup(pick, other, teams)
    pick_def = build_matchup(other, pick, teams)
    # The deciding matchup is the side of the ball where the pick's edge is biggest.
    deciding, other_side = (pick_off, pick_def) if pick_off["edge"] >= -pick_def["edge"] else (pick_def, pick_off)

    unit = "offense" if deciding["offense_team"] == pick else "defense"
    headline = (
        f"I'm on the {nick(pick)} at {pct}%, and it starts with their {unit}."
        if deciding["edge_team"] == pick else
        f"I'm on the {nick(pick)} at {pct}%, even though the matchups are closer than that sounds."
    )
    intro = [_opener(gid, pct)]
    if reasons:
        intro.append(f"The biggest reason? {first_person(reasons[0]['explanation'])}")
    if len(reasons) > 1:
        intro.append(f"On top of that, {lower_first(first_person(reasons[1]['headline']))}")
    basis = ranks["basis"]
    if basis["kind"] == "last_season":
        intro.append(f"Quick note: the stats below are from {basis['label']}, because teams haven't "
                     f"played enough games yet this year to rank them fairly.")

    return {
        "version": REPORT_VERSION,
        "source": "template",
        "basis": basis,
        "headline": headline,
        "dek": _dek(deciding),
        "intro": intro,
        "deciding": {"title": "The matchup that decides it",
                     "sub": f"{nick(deciding['offense_team'])} offense vs {nick(deciding['defense_team'])} defense",
                     "table": _table(deciding), "body": _matchup_body(deciding, pick, True)},
        "other_side": {"title": other_side["title"],
                       "sub": f"{nick(other_side['offense_team'])} offense vs {nick(other_side['defense_team'])} defense",
                       "table": _table(other_side), "body": _matchup_body(other_side, pick, False)},
        "underdog": {"title": f"How the {nick(other)} win this",
                     "items": _underdog_path(other, against, teams)},
        "change_my_mind": _change_my_mind(pick, other, deciding),
        "meaning": {"title": f"What {pct}% actually means", "pct": pct, "body": _meaning(pick, other, pct)},
        "line": _line_note(game, pick, pct, reasons),
        "numbers": _numbers(game, teams),
        "signoff": f"Not a lock! If the {nick(other)} win the turnover battle, I'm probably wrong, "
                   f"and you'll hear about it in the recap.",
    }
