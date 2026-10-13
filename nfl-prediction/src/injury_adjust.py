"""
injury_adjust.py - injuries move Clark's number
===============================================
The model's features are team rollups and the betting line; neither says who
is hurt this week. This adds one term on top of the model's log-odds:

    final logit = model logit + INJURY_LOGIT_PER_POINT * (home burden - away burden)

"Burden" is the injury report weighted by position and status, the same
weights as build_availability.py (a QB who is Out counts 10, a starting tackle
3, most players 1-2; Doubtful counts 3/4, Questionable 1/4).

The coefficient was fitted on 2009-2025 with the model's logit as the only
other input (`python3 src/injury_adjust.py --fit`). Walk-forward over
2016-2025 it lowered log loss 0.6081 -> 0.6079 and raised accuracy
66.6% -> 66.7%. Adding a separate "QB out" term made it worse: the betting
line, which the model already uses, prices quarterback injuries in.

Sources, in order: the nflverse injury report for that week, then the ESPN
injury list saved by espn_extras.py (data/processed/current_injuries.json),
which only covers the upcoming week. No data means no adjustment.
"""
from __future__ import annotations

import json
import math
import sys
from functools import lru_cache
from pathlib import Path

import pandas as pd

BASE_DIR = Path(__file__).resolve().parent.parent
PROCESSED = BASE_DIR / "data" / "processed"
PLAYERS_PATH = PROCESSED / "injury_players.parquet"
ESPN_CACHE_PATH = PROCESSED / "current_injuries.json"

INJURY_LOGIT_PER_POINT = -0.0136
MAX_NAMED = 4

# Mirrors build_availability.py (kept here so the export doesn't import nflreadpy).
POSITION_WEIGHT = {
    "QB": 10.0, "LT": 3.0, "T": 2.0, "OT": 2.0, "WR": 2.0, "CB": 2.0, "DE": 2.0,
    "RB": 1.5, "TE": 1.5, "G": 1.5, "OG": 1.5, "C": 1.5, "S": 1.5, "LB": 1.5,
    "DT": 1.5, "OLB": 1.5, "ILB": 1.0, "FS": 1.0, "SS": 1.0,
}
DEFAULT_WEIGHT = 1.0
STATUS_WEIGHT = {"Out": 1.0, "Doubtful": 0.75, "Questionable": 0.25}


def player_weight(position: str, status: str) -> float:
    return POSITION_WEIGHT.get(position, DEFAULT_WEIGHT) * STATUS_WEIGHT.get(status, 0.0)


@lru_cache(maxsize=1)
def _nflverse() -> dict[tuple[int, int, str], list[dict]]:
    if not PLAYERS_PATH.exists():
        return {}
    df = pd.read_parquet(PLAYERS_PATH)
    out: dict[tuple[int, int, str], list[dict]] = {}
    for row in df.itertuples(index=False):
        out.setdefault((int(row.season), int(row.week), row.team), []).append(
            {"name": row.name, "position": row.position or "", "status": row.status})
    return out


@lru_cache(maxsize=1)
def _espn() -> tuple[int, int, dict[str, list[dict]]] | None:
    try:
        data = json.loads(ESPN_CACHE_PATH.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        return None
    return int(data["season"]), int(data["week"]), data.get("teams") or {}


def _team_report(players: list[dict]) -> dict:
    ranked = sorted(players, key=lambda p: -player_weight(p["position"], p["status"]))
    return {
        "burden": round(sum(player_weight(p["position"], p["status"]) for p in players), 2),
        "players": [p for p in ranked if player_weight(p["position"], p["status"]) > 0][:MAX_NAMED],
    }


def game_injuries(season: int, week: int, home: str, away: str) -> dict | None:
    """{"source", "home": {burden, players}, "away": {...}, "logit"} or None when nobody has a report."""
    nflverse = _nflverse()
    if (season, week, home) in nflverse or (season, week, away) in nflverse:
        source = "nflverse"
        teams = {t: nflverse.get((season, week, t), []) for t in (home, away)}
    else:
        espn = _espn()
        if not espn or espn[:2] != (season, week):
            return None
        source = "espn"
        teams = {t: espn[2].get(t, []) for t in (home, away)}

    home_r, away_r = _team_report(teams[home]), _team_report(teams[away])
    logit = INJURY_LOGIT_PER_POINT * (home_r["burden"] - away_r["burden"])
    return {"source": source, "home": home_r, "away": away_r, "logit": round(logit, 5)}


def adjust_home_prob(home_prob: float, logit_shift: float) -> float:
    p = min(max(home_prob, 1e-6), 1 - 1e-6)
    return 1.0 / (1.0 + math.exp(-(math.log(p / (1 - p)) + logit_shift)))


def fit() -> None:
    """Re-fit INJURY_LOGIT_PER_POINT on 2009+ played games (prints; doesn't edit this file)."""
    import joblib
    from sklearn.linear_model import LogisticRegression

    sys.path.insert(0, str(BASE_DIR))
    from src.train_model import PRODUCTION_FEATURES

    model = joblib.load(BASE_DIR / "models" / "logreg_model.joblib")
    model = getattr(model, "best_estimator_", model)
    games = pd.read_csv(PROCESSED / "game_training_table.csv")
    games = games[games["is_played"] & (games["season"] >= 2009)].copy()
    games["logit"] = model.decision_function(games[PRODUCTION_FEATURES])
    avail = pd.read_parquet(PROCESSED / "availability.parquet")[["season", "week", "team", "injury_burden"]]
    for side in ("home", "away"):
        games = games.merge(avail.rename(columns={"team": f"{side}_team", "injury_burden": f"{side}_burden"}),
                            on=["season", "week", f"{side}_team"], how="left")
    games["inj"] = games["home_burden"].fillna(0) - games["away_burden"].fillna(0)
    lr = LogisticRegression().fit(games[["logit", "inj"]], games["home_win"].astype(int))
    print(f"logit coef {lr.coef_[0][0]:.4f}  injury coef {lr.coef_[0][1]:.4f}  (n={len(games)})")


if __name__ == "__main__":
    if "--fit" in sys.argv:
        fit()
