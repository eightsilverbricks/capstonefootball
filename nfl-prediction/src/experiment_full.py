#!/usr/bin/env python3
"""
experiment_full.py
==================
Everything-on-the-table sweep: availability (injuries, QB changes), game
environment (weather, roof, total line), tuned gradient boosting, and ensembles.

Reports both the pooled walk-forward number and a per-season breakdown, because
a single season's accuracy swings several points on luck alone and the pooled
figure is the only one that generalises.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, brier_score_loss, log_loss
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from src.features import add_market_features

BASE_DIR = Path(__file__).resolve().parent.parent
PROCESSED = BASE_DIR / "data" / "processed"
RAW = BASE_DIR / "data" / "raw"

TARGET = "home_win"
# Injury reports start in 2009, so the whole comparison is held to 2009+ rather
# than imputing "nobody hurt" for seasons the data does not cover.
FIRST = 2009
TEST_SEASONS = list(range(2015, 2026))


def load() -> pd.DataFrame:
    df = pd.read_csv(PROCESSED / "game_training_table.csv")
    df = df[df["is_played"] & (df["season"] >= FIRST)].copy()

    sched = pd.read_parquet(RAW / "schedules.parquet")
    env_cols = ["game_id", "roof", "surface", "temp", "wind", "total_line",
                "home_score", "away_score"]
    df = df.merge(sched[[c for c in env_cols if c in sched.columns]],
                  on="game_id", how="left")

    df["is_dome"] = df["roof"].isin(["dome", "closed"]).astype(int)
    # Indoors has no weather; league-average fills would invent a 60-degree dome.
    df["temp_f"] = df["temp"].fillna(68.0)
    df["wind_mph"] = df["wind"].fillna(0.0)
    df["total_line"] = pd.to_numeric(df["total_line"], errors="coerce").fillna(44.0)

    avail = pd.read_parquet(PROCESSED / "availability.parquet")
    # The outer join in build_availability leaves rows keyed on one source only.
    avail = avail.dropna(subset=["season", "week", "team"]).copy()
    avail["season"] = avail["season"].astype(int)
    avail["week"] = avail["week"].astype(int)
    for side in ("home", "away"):
        part = avail.rename(columns={
            "team": f"{side}_team",
            "injury_burden": f"{side}_injury_burden",
            "n_out": f"{side}_n_out",
            "qb_out": f"{side}_qb_out",
            "qb_change": f"{side}_qb_change",
        })
        df = df.merge(part, on=["season", "week", f"{side}_team"], how="left")

    for col in ("injury_burden", "n_out", "qb_out", "qb_change"):
        for side in ("home", "away"):
            df[f"{side}_{col}"] = df[f"{side}_{col}"].fillna(0.0)
        df[f"diff_{col}"] = df[f"home_{col}"] - df[f"away_{col}"]

    return add_market_features(df)


def logit(C: float = 0.5) -> Pipeline:
    return Pipeline([
        ("scaler", StandardScaler()),
        ("clf", LogisticRegression(max_iter=5000, C=C, random_state=42)),
    ])


def walk_forward(df: pd.DataFrame, feats: list[str], make_model=logit) -> pd.DataFrame:
    """Train on all prior seasons, predict each held-out season."""
    rows = []
    for season in TEST_SEASONS:
        train, test = df[df.season < season], df[df.season == season]
        if train.empty or test.empty:
            continue
        m = make_model()
        m.fit(train[feats], train[TARGET])
        p = m.predict_proba(test[feats])[:, 1]
        rows.append(pd.DataFrame({"season": season, "y": test[TARGET].values, "p": p}))
    return pd.concat(rows, ignore_index=True)


def summarise(pooled: pd.DataFrame) -> dict:
    preds = (pooled["p"] >= 0.5).astype(int)
    return {
        "acc": accuracy_score(pooled["y"], preds),
        "ll": log_loss(pooled["y"], pooled["p"], labels=[0, 1]),
        "brier": brier_score_loss(pooled["y"], pooled["p"]),
    }


def main() -> None:
    df = load()

    context = ["rest_diff", "div_game"]
    recent = ["diff_last3_point_diff_pg", "diff_last3_win_pct",
              "diff_last3_epa_per_play", "diff_last3_epa_per_play_allowed",
              "diff_last3_success_rate", "diff_last3_success_rate_allowed"]
    season_form = ["diff_season_epa_per_play", "diff_season_epa_per_play_allowed",
                   "diff_season_success_rate", "diff_season_qb_epa_per_play",
                   "diff_season_turnover_diff_pg"]
    market = ["mkt_home_prob", "has_market", "spread_line_clean", "has_spread"]
    elo = ["elo_diff"]
    avail = ["diff_injury_burden", "diff_n_out", "diff_qb_out", "diff_qb_change"]
    env = ["is_dome", "temp_f", "wind_mph", "total_line"]

    base = market + context + elo + recent + season_form

    variants = {
        "shipped (market+elo+form)": base,
        "+ availability": base + avail,
        "+ environment": base + env,
        "+ availability + environment": base + avail + env,
        "no-market: elo+form": context + elo + recent + season_form,
        "no-market + availability": context + elo + recent + season_form + avail,
    }

    print(f"Walk-forward {TEST_SEASONS[0]}-{TEST_SEASONS[-1]}, train on prior seasons only.\n")
    print(f"{'variant':34s} {'n':>5s} {'acc':>7s} {'logloss':>8s} {'brier':>7s}")
    print("-" * 66)
    pooled_store = {}
    for name, feats in variants.items():
        pooled = walk_forward(df, feats)
        pooled_store[name] = pooled
        s = summarise(pooled)
        print(f"{name:34s} {len(pooled):5d} {s['acc']*100:6.2f}% {s['ll']:8.4f} {s['brier']:7.4f}")

    # Gradient boosting on the widest feature set.
    try:
        from xgboost import XGBClassifier

        full = base + avail + env
        print("\nGradient boosting (widest set):")
        best = None
        for depth, n, lr, mcw in [(3, 400, 0.03, 5), (2, 700, 0.02, 10),
                                  (4, 300, 0.03, 5), (3, 600, 0.015, 20)]:
            mk = lambda: XGBClassifier(
                max_depth=depth, n_estimators=n, learning_rate=lr,
                min_child_weight=mcw, subsample=0.8, colsample_bytree=0.8,
                reg_lambda=2.0, eval_metric="logloss", random_state=42,
            )
            pooled = walk_forward(df, full, mk)
            s = summarise(pooled)
            print(f"  d={depth} n={n} lr={lr} mcw={mcw:<3} "
                  f"{s['acc']*100:6.2f}% {s['ll']:8.4f} {s['brier']:7.4f}")
            if best is None or s["ll"] < best[1]["ll"]:
                best = (pooled, s, f"xgb d={depth} n={n}")

        # Ensemble: average the linear and tree probabilities.
        lin = pooled_store["+ availability + environment"]
        ens = lin.copy()
        ens["p"] = (lin["p"].values + best[0]["p"].values) / 2.0
        s = summarise(ens)
        print(f"\nEnsemble (logistic + {best[2]}): "
              f"{s['acc']*100:6.2f}% {s['ll']:8.4f} {s['brier']:7.4f}")
        pooled_store["ensemble"] = ens
    except ImportError:
        print("(xgboost missing)")

    # Per-season detail for the best pooled variant, and for the market.
    winner = max(pooled_store, key=lambda k: summarise(pooled_store[k])["acc"])
    print(f"\nPer-season accuracy — best variant: {winner}")
    print(f"{'season':>7s} {'n':>5s} {'model':>8s} {'vegas':>8s}")
    print("-" * 32)
    pooled = pooled_store[winner]
    for season in TEST_SEASONS:
        sub = pooled[pooled.season == season]
        if sub.empty:
            continue
        acc = accuracy_score(sub["y"], (sub["p"] >= 0.5).astype(int))
        vs = df[(df.season == season) & (df.has_market == 1)]
        vacc = accuracy_score(vs[TARGET], (vs["mkt_home_prob"] >= 0.5).astype(int))
        print(f"{season:7d} {len(sub):5d} {acc*100:7.2f}% {vacc*100:7.2f}%")

    overall = summarise(pooled)
    lined = df[df.season.isin(TEST_SEASONS) & (df.has_market == 1)]
    vacc = accuracy_score(lined[TARGET], (lined["mkt_home_prob"] >= 0.5).astype(int))
    print(f"\nPOOLED  model {overall['acc']*100:.2f}%   vegas {vacc*100:.2f}%")


if __name__ == "__main__":
    main()
