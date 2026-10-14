"""
odds.py - the one place betting lines become win probabilities
================================================================
Every sentence on the site that turns a line into a "% chance to win" goes
through here, so the report, the market note and the validator can never
disagree about what a 2.5-point spread means.

Spread convention (nflverse): positive = home team favored by that many points.
"""
from __future__ import annotations

import math

# Standard deviation of NFL final margins around the closing spread. 13.86 is
# the long-run figure (Stern, 1991; still holds within ~0.5 on 2010-2024 data).
SPREAD_SD = 13.86


def moneyline_to_prob(ml: float | int | None) -> float | None:
    """American moneyline -> implied win probability (vig not removed)."""
    if not ml:
        return None
    ml = float(ml)
    if ml < 0:
        return -ml / (-ml + 100.0)
    return 100.0 / (ml + 100.0)


def spread_to_home_prob(spread: float) -> float:
    """Home win probability implied by a spread (positive = home favored)."""
    return 0.5 * (1.0 + math.erf(spread / (SPREAD_SD * math.sqrt(2.0))))


def market_view(home: str, away: str, spread: float,
                home_ml: float | int | None, away_ml: float | int | None) -> dict | None:
    """
    The betting line in one consistent shape, or None when no line is posted.

    Returns {"favorite": team | None, "favorite_prob": 0-1, "spread": abs points}.
    favorite is None only for a true pick'em. The favorite's probability is
    always >= 0.5 by construction, which is the invariant the validator checks.
    """
    has_spread = abs(spread or 0.0) >= 0.01
    has_ml = bool(home_ml) and bool(away_ml)
    if not has_spread and not has_ml:
        return None

    if has_ml:
        home_p = moneyline_to_prob(home_ml)
        away_p = moneyline_to_prob(away_ml)
        # Remove the vig so the two sides sum to 1.
        home_prob = home_p / (home_p + away_p)
    else:
        home_prob = spread_to_home_prob(spread)

    if has_spread:
        favorite = home if spread > 0 else away
    elif abs(home_prob - 0.5) < 1e-9:
        favorite = None
    else:
        favorite = home if home_prob > 0.5 else away

    if favorite is None:
        return {"favorite": None, "favorite_prob": 0.5, "spread": 0.0}

    fav_prob = home_prob if favorite == home else 1.0 - home_prob
    # A moneyline can disagree with the spread's side by a hair on pick'em-ish
    # games; never publish a "favorite" below 50%.
    fav_prob = max(fav_prob, 0.5)
    return {"favorite": favorite, "favorite_prob": fav_prob, "spread": abs(spread or 0.0)}


def display_pct(prob: float) -> int:
    """A probability as the whole-number percent the site shows.

    Rounds half up, like the frontend's Math.round, so a published 0.595 is
    60% in the report text and on the page (Python's round() would give 60
    here but 58 for 0.585, where the page shows 59).
    """
    return int(math.floor(float(prob) * 100 + 0.5))
