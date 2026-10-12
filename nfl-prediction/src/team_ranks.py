"""
team_ranks.py - league ranks for the Clark Report
=================================================
Turns the per-game team stats in team_games_with_features.parquet into
"Yards per play: 5.8, 4th" style numbers for the reader.

The model's own season_* columns are career-to-date means, so they can't be
shown as "this season". Instead, for a game in season S, week W we average
each team's *played* games of season S before week W. Until every team has
played MIN_GAMES of them (all of the upcoming season, and the first weeks of
any season), we fall back to last season's full-year numbers and say so.
"""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path

import pandas as pd

TEAM_GAMES_PATH = (
    Path(__file__).resolve().parent.parent / "data" / "processed" / "team_games_with_features.parquet"
)
MIN_GAMES = 3

# key -> (source column, label, higher is better, decimals, is a percentage)
STATS: dict[str, tuple[str, str, bool, int, bool]] = {
    "points": ("points_for", "Points per game", True, 1, False),
    "points_allowed": ("points_against", "Points allowed per game", False, 1, False),
    "ypp": ("ypp_off", "Yards per play", True, 1, False),
    "ypp_allowed": ("ypp_def", "Yards per play allowed", False, 1, False),
    "sacks_allowed": ("sack_rate_allowed", "Sack rate allowed", False, 1, True),
    "sack_rate": ("def_sack_rate", "Sack rate", True, 1, True),
    # Drawer-only (jargon is allowed there, never in the prose).
    "epa": ("epa_per_play", "Offense: EPA per play", True, 2, False),
    "epa_allowed": ("epa_per_play_allowed", "Defense: EPA per play allowed", False, 2, False),
    "success": ("success_rate", "Offense: success rate", True, 0, True),
}


def ordinal(n: int) -> str:
    if 10 <= n % 100 <= 20:
        return f"{n}th"
    return f"{n}{ {1: 'st', 2: 'nd', 3: 'rd'}.get(n % 10, 'th') }"


def format_value(key: str, value: float) -> str:
    _, _, _, decimals, is_pct = STATS[key]
    if is_pct:
        return f"{value * 100:.{decimals}f}%"
    if key in ("epa", "epa_allowed"):
        return f"{value:+.{decimals}f}"
    return f"{value:.{decimals}f}"


@lru_cache(maxsize=1)
def _played_games() -> pd.DataFrame:
    if not TEAM_GAMES_PATH.exists():
        return pd.DataFrame()
    games = pd.read_parquet(TEAM_GAMES_PATH)
    # Rows with a zero yards-per-play are games the play-by-play never covered.
    return games[games["is_played"] & (games["ypp_off"] > 0)].copy()


def _rank_table(rows: pd.DataFrame) -> dict[str, dict]:
    means = rows.groupby("team")[[src for src, *_ in STATS.values()]].mean()
    table: dict[str, dict] = {team: {} for team in means.index}
    for key, (src, label, higher, _, _) in STATS.items():
        ranks = means[src].rank(ascending=not higher, method="min")
        for team in means.index:
            value = float(means.at[team, src])
            table[team][key] = {
                "label": label,
                "value": value,
                "display": format_value(key, value),
                "rank": int(ranks.at[team]),
            }
    return table


@lru_cache(maxsize=64)
def league_ranks(season: int, week: int) -> dict | None:
    """{"basis": {...}, "teams": {TEAM: {stat_key: {label, value, display, rank}}}} or None."""
    games = _played_games()
    if games.empty:
        return None

    current = games[(games["season"] == season) & (games["week"] < week)]
    counts = current.groupby("team").size()
    if len(counts) >= 32 and counts.min() >= MIN_GAMES:
        rows = current
        basis = {"kind": "season", "season": season,
                 "label": f"this season (through Week {week - 1})", "games": int(counts.min())}
    else:
        rows = games[games["season"] == season - 1]
        if rows.groupby("team").size().size < 32:
            return None
        basis = {"kind": "last_season", "season": season - 1,
                 "label": f"last season ({season - 1})", "games": int(rows.groupby('team').size().min())}

    return {"basis": basis, "teams": _rank_table(rows)}
