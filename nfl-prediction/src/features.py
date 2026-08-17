"""
features.py
===========
Engineered features shared by the training table, the model and the API.

These live here rather than inside build_training_table.py because the API has
to derive the exact same columns when it scores a game, and a second
implementation would drift. Import from here; do not re-derive.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

TARGET = "home_win"

# Elo constants. K sets how fast ratings move, HFA is home advantage in rating
# points (~2.2 points of spread), and a third of each rating reverts to the mean
# between seasons because rosters turn over.
ELO_K = 20.0
ELO_HFA = 55.0
ELO_BASE = 1500.0
ELO_SEASON_REVERT = 1.0 / 3.0


def american_to_prob(odds: pd.Series) -> pd.Series:
    """American odds -> implied probability. 0 means 'no line posted'.

    Raw American odds cannot be fed to a linear model: they run from -2540 to
    +1000 across a true probability range of roughly 0.5–0.96, and the sign
    flips discontinuously at even money, so the model reads a heavy favourite
    and a coin flip as thousands of units apart. Implied probability is the
    scale the coefficient actually means something on.
    """
    odds = pd.to_numeric(odds, errors="coerce").replace(0, np.nan)
    return pd.Series(
        np.where(odds < 0, -odds / (-odds + 100.0), 100.0 / (odds + 100.0)),
        index=odds.index,
    )


def devigged_home_prob(df: pd.DataFrame) -> pd.Series:
    """Home win probability with the bookmaker's margin divided out.

    The two sides' implied probabilities sum to more than 1 by the vig.
    Normalising recovers a real probability and strips out the part of the
    number that is pricing rather than opinion.
    """
    home = american_to_prob(df["home_moneyline"])
    away = american_to_prob(df["away_moneyline"])
    return home / (home + away)


def add_market_features(df: pd.DataFrame) -> pd.DataFrame:
    """Market columns that behave when no line has been posted.

    Most of an upcoming season has no line months out — 160 of 2026's 272
    fixtures at time of writing. The old encoding filled those with 0.0, which
    is not a valid moneyline and sat in the middle of the real range, so an
    unpriced game silently read as a near-even matchup. Here the probability is
    a neutral 0.5 and `has_market` says outright whether it is real, letting the
    model separate "priced pick'em" from "not priced yet".
    """
    df = df.copy()

    prob = devigged_home_prob(df)
    df["mkt_home_prob"] = prob.fillna(0.5)
    df["has_market"] = prob.notna().astype(int)

    # Computed before any fill: 0.0 is a legitimate spread (pick'em), so a
    # filled zero and a real zero must stay distinguishable.
    spread = pd.to_numeric(df["spread_line"], errors="coerce")
    df["spread_line_clean"] = spread.fillna(0.0)
    df["has_spread"] = spread.notna().astype(int)

    return df


def add_elo(df: pd.DataFrame) -> pd.DataFrame:
    """Attach pregame Elo ratings and their difference.

    Elo is the only feature that knows who a team played. The season_/last3_
    columns describe each team in isolation, so a 3-0 record against three weak
    opponents looks identical to one against three strong ones. Elo also carries
    across seasons, which is what gives an upcoming season's opening week any
    signal at all.

    Unplayed fixtures receive a rating but never update one, so every game of an
    unplayed season shares the ratings as of the last completed season.
    """
    df = df.copy()
    order = df.sort_values(["season", "week", "game_id"]).index

    ratings: dict[str, float] = {}
    last_season: int | None = None
    home_elo = pd.Series(index=df.index, dtype=float)
    away_elo = pd.Series(index=df.index, dtype=float)

    for idx in order:
        row = df.loc[idx]
        season = int(row["season"])

        if last_season is not None and season != last_season:
            for team in ratings:
                ratings[team] = ELO_BASE + (1 - ELO_SEASON_REVERT) * (
                    ratings[team] - ELO_BASE
                )
        last_season = season

        home_team, away_team = row["home_team"], row["away_team"]
        rating_home = ratings.setdefault(home_team, ELO_BASE)
        rating_away = ratings.setdefault(away_team, ELO_BASE)

        home_elo.loc[idx] = rating_home
        away_elo.loc[idx] = rating_away

        if pd.isna(row.get(TARGET)):
            continue

        delta = (rating_home + ELO_HFA) - rating_away
        expected_home = 1.0 / (1.0 + 10.0 ** (-delta / 400.0))
        actual_home = float(row[TARGET])

        # Margin of victory. Binary Elo treats a 3-point win and a 30-point win
        # identically, throwing away the more predictive half of the result;
        # measured over 2019–2025 this is worth ~0.004 log loss in the no-market
        # regime. The denominator is FiveThirtyEight's autocorrelation
        # correction — without it, blowouts by an already-strong team inflate
        # its rating without bound.
        multiplier = 1.0
        margin = row.get("point_margin")
        if pd.notna(margin):
            winner_delta = delta if actual_home == 1 else -delta
            multiplier = np.log(abs(margin) + 1.0) * (
                2.2 / (0.001 * winner_delta + 2.2)
            )

        shift = ELO_K * multiplier * (actual_home - expected_home)
        ratings[home_team] = rating_home + shift
        ratings[away_team] = rating_away - shift

    df["home_elo"] = home_elo
    df["away_elo"] = away_elo
    df["elo_diff"] = home_elo - away_elo
    df["elo_prob"] = 1.0 / (
        1.0 + 10.0 ** (-((home_elo + ELO_HFA) - away_elo) / 400.0)
    )
    return df


def add_engineered_features(df: pd.DataFrame) -> pd.DataFrame:
    """Every engineered column, in the order the pipeline expects."""
    return add_elo(add_market_features(df))
