#!/usr/bin/env python3
"""
experiment_model.py
===================
Feature and model sweep for the game-winner model, scored on a held-out season.

Every variant is trained on the same games and scored on the same held-out
season, so the numbers below are directly comparable. Run it before changing
what train_model.py ships:

    .venv/bin/python src/experiment_model.py

The sweep uses a single train/test split (fast, and identical across variants).
The winner should then be confirmed with train_model.py's expanding-week
protocol, which is stricter and is what the site quotes.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, brier_score_loss, log_loss
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

BASE_DIR = Path(__file__).resolve().parent.parent
PROCESSED_DIR = BASE_DIR / "data" / "processed"
RAW_DIR = BASE_DIR / "data" / "raw"

TARGET = "home_win"
TEST_SEASON = 2025

# Elo constants. Standard NFL-tuned values: K sets how fast ratings move, HFA is
# home advantage in rating points (~2.2 pts ≈ 55 Elo), and each new season pulls
# a third of the way back to the mean because rosters turn over.
ELO_K = 20.0
ELO_HFA = 55.0
ELO_BASE = 1500.0
ELO_SEASON_REVERT = 1.0 / 3.0


# ── Market encoding ──────────────────────────────────────────────────────────
def american_to_prob(odds: pd.Series) -> pd.Series:
    """American odds -> implied probability. 0 means 'no line posted'.

    Raw American odds are unusable as a linear feature: they jump from -100 to
    -2540 across a probability range of only 0.5 to 0.96, and the sign flips
    discontinuously around even money. Implied probability is the scale the
    model actually wants.
    """
    odds = pd.to_numeric(odds, errors="coerce").replace(0, np.nan)
    return pd.Series(
        np.where(odds < 0, -odds / (-odds + 100.0), 100.0 / (odds + 100.0)),
        index=odds.index,
    )


def devigged_home_prob(df: pd.DataFrame) -> pd.Series:
    """Home win probability with the bookmaker's margin divided out.

    Implied probabilities sum to >1 by the vig; normalising recovers a genuine
    probability and removes the part of the number that is pricing, not opinion.
    """
    home = american_to_prob(df["home_moneyline"])
    away = american_to_prob(df["away_moneyline"])
    total = home + away
    return home / total


def add_market_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    prob = devigged_home_prob(df)
    df["mkt_home_prob"] = prob.fillna(0.5)
    # An explicit flag beats a magic filler: the model can learn "when no line
    # exists, lean on football" instead of reading 0.5 as a genuine pick'em.
    df["has_market"] = prob.notna().astype(int)
    spread = pd.to_numeric(df["spread_line"], errors="coerce")
    df["spread_line_clean"] = spread.fillna(0.0)
    df["has_spread"] = spread.notna().astype(int)
    return df


# ── Elo ──────────────────────────────────────────────────────────────────────
def add_elo(df: pd.DataFrame) -> pd.DataFrame:
    """Attach each team's pregame Elo and the difference between them.

    Elo compresses every prior result into one number that travels across
    seasons, which none of the existing season_/last3_ features do — they only
    ever look at a team in isolation, never at who it played.
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

        h, a = row["home_team"], row["away_team"]
        rh = ratings.setdefault(h, ELO_BASE)
        ra = ratings.setdefault(a, ELO_BASE)

        home_elo.loc[idx] = rh
        away_elo.loc[idx] = ra

        # Unplayed games get a rating but never update it.
        if pd.isna(row[TARGET]):
            continue

        expected_home = 1.0 / (1.0 + 10.0 ** (-((rh + ELO_HFA) - ra) / 400.0))
        actual_home = float(row[TARGET])
        shift = ELO_K * (actual_home - expected_home)
        ratings[h] = rh + shift
        ratings[a] = ra - shift

    df["home_elo"] = home_elo
    df["away_elo"] = away_elo
    df["elo_diff"] = home_elo - away_elo
    df["elo_prob"] = 1.0 / (
        1.0 + 10.0 ** (-((home_elo + ELO_HFA) - away_elo) / 400.0)
    )
    return df


# ── Evaluation ───────────────────────────────────────────────────────────────
def build_model(C: float = 1.0) -> Pipeline:
    return Pipeline(
        steps=[
            ("scaler", StandardScaler()),
            ("clf", LogisticRegression(max_iter=5000, C=C, random_state=42)),
        ]
    )


def evaluate(df: pd.DataFrame, features: list[str], C: float = 1.0) -> dict:
    train = df[df["season"] < TEST_SEASON]
    test = df[df["season"] == TEST_SEASON]

    model = build_model(C)
    model.fit(train[features], train[TARGET])
    probs = model.predict_proba(test[features])[:, 1]
    preds = (probs >= 0.5).astype(int)

    return {
        "n_features": len(features),
        "accuracy": float(accuracy_score(test[TARGET], preds)),
        "log_loss": float(log_loss(test[TARGET], probs, labels=[0, 1])),
        "brier": float(brier_score_loss(test[TARGET], probs)),
    }


def main() -> None:
    df = pd.read_csv(PROCESSED_DIR / "game_training_table.csv")
    df = df[df["is_played"]].copy()

    df = add_market_features(df)
    df = add_elo(df)

    context = ["rest_diff", "div_game"]
    recent_form = [
        "diff_last3_point_diff_pg",
        "diff_last3_win_pct",
        "diff_last3_epa_per_play",
        "diff_last3_epa_per_play_allowed",
        "diff_last3_success_rate",
        "diff_last3_success_rate_allowed",
    ]
    season_form = [
        "diff_season_epa_per_play",
        "diff_season_epa_per_play_allowed",
        "diff_season_success_rate",
        "diff_season_qb_epa_per_play",
        "diff_season_turnover_diff_pg",
    ]
    raw_market = ["spread_line", "home_moneyline", "away_moneyline"]
    clean_market = ["mkt_home_prob", "has_market", "spread_line_clean"]

    variants: dict[str, list[str]] = {
        # Reproduces what train_model.py ships today, home_field included.
        "baseline_production": raw_market + context + ["home_field"] + recent_form,
        "baseline_minus_dead_home_field": raw_market + context + recent_form,
        "clean_market_only": clean_market + context,
        "clean_market + recent_form": clean_market + context + recent_form,
        "clean_market + elo": clean_market + context + ["elo_diff"],
        "clean_market + elo + recent_form": (
            clean_market + context + ["elo_diff"] + recent_form
        ),
        "clean_market + elo + season_form": (
            clean_market + context + ["elo_diff"] + season_form
        ),
        "clean_market + elo + both_form": (
            clean_market + context + ["elo_diff"] + recent_form + season_form
        ),
        "elo_only": ["elo_diff"] + context,
        "no_market_elo_form": ["elo_diff"] + context + recent_form + season_form,
    }

    print(f"Train: {df[df.season < TEST_SEASON].shape[0]} games "
          f"(2018–{TEST_SEASON - 1})   Test: {df[df.season == TEST_SEASON].shape[0]} "
          f"games ({TEST_SEASON})\n")
    print(f"{'variant':38s} {'nfeat':>5s} {'acc':>7s} {'logloss':>8s} {'brier':>7s}")
    print("-" * 70)

    results = {}
    for name, features in variants.items():
        missing = [f for f in features if f not in df.columns]
        if missing:
            print(f"{name:38s}  SKIP (missing {missing})")
            continue
        res = evaluate(df, features)
        results[name] = res
        print(
            f"{name:38s} {res['n_features']:5d} "
            f"{res['accuracy']*100:6.2f}% {res['log_loss']:8.4f} {res['brier']:7.4f}"
        )

    print("\nRegularisation sweep on the best-by-logloss variant:")
    best = min(results, key=lambda k: results[k]["log_loss"])
    for C in (0.01, 0.05, 0.1, 0.5, 1.0, 5.0):
        res = evaluate(df, variants[best], C=C)
        print(
            f"  C={C:<5} {res['accuracy']*100:6.2f}%  logloss={res['log_loss']:.4f} "
            f" brier={res['brier']:.4f}"
        )
    print(f"\nBest by log loss: {best}")

    # Vegas itself, as a reference point the model has to be judged against.
    test = df[df["season"] == TEST_SEASON]
    lined = test[test["has_market"] == 1]
    vegas_preds = (lined["mkt_home_prob"] >= 0.5).astype(int)
    print(
        f"\nVegas closing line on the same {len(lined)} lined games: "
        f"{accuracy_score(lined[TARGET], vegas_preds)*100:.2f}%  "
        f"logloss={log_loss(lined[TARGET], lined['mkt_home_prob'], labels=[0,1]):.4f}"
    )

    # ── The regime that actually decides 2026 ────────────────────────────────
    # Most of the upcoming season has no line posted, so those games are scored
    # entirely by the football features. A linear model cannot express "use the
    # line when there is one, otherwise use form", so measure the no-market
    # model on its own rather than trusting has_market to switch regimes.
    football = ["elo_diff"] + context + recent_form + season_form
    print("\nNo-market regime (what the unlined 2026 games will actually use):")
    for name, feats in {
        "elo only": ["elo_diff"],
        "elo + context": ["elo_diff"] + context,
        "elo + recent_form": ["elo_diff"] + context + recent_form,
        "elo + both_form": football,
        "form only (no elo)": context + recent_form + season_form,
    }.items():
        for C in (0.05, 0.5):
            res = evaluate(df, feats, C=C)
            print(
                f"  {name:22s} C={C:<5} {res['accuracy']*100:6.2f}%  "
                f"logloss={res['log_loss']:.4f}  brier={res['brier']:.4f}"
            )

    # Gradient boosting: handles the market/no-market interaction natively,
    # which the linear model structurally cannot.
    try:
        from xgboost import XGBClassifier

        full = clean_market + context + ["elo_diff"] + recent_form + season_form
        train, test_df = df[df.season < TEST_SEASON], df[df.season == TEST_SEASON]
        print("\nXGBoost on the full feature set:")
        for depth, n_est, lr in ((3, 300, 0.03), (4, 400, 0.03), (2, 600, 0.02)):
            xgb = XGBClassifier(
                max_depth=depth,
                n_estimators=n_est,
                learning_rate=lr,
                subsample=0.8,
                colsample_bytree=0.8,
                reg_lambda=2.0,
                eval_metric="logloss",
                random_state=42,
            )
            xgb.fit(train[full], train[TARGET])
            probs = xgb.predict_proba(test_df[full])[:, 1]
            preds = (probs >= 0.5).astype(int)
            print(
                f"  depth={depth} n={n_est} lr={lr}  "
                f"{accuracy_score(test_df[TARGET], preds)*100:6.2f}%  "
                f"logloss={log_loss(test_df[TARGET], probs, labels=[0,1]):.4f}  "
                f"brier={brier_score_loss(test_df[TARGET], probs):.4f}"
            )
    except ImportError:
        print("\n(xgboost not installed — skipping)")


if __name__ == "__main__":
    main()
