#!/usr/bin/env python3
"""
experiment_model.py
===================
Feature and model sweep for the game-winner model.

Every variant is scored by walk-forward backtest over several held-out seasons:
for each test season, train on every prior season only, predict that season,
then pool the predictions. Pooling ~2,000 games instead of one 285-game season
matters — at 285 games a single result is 0.35% of accuracy, so picking a winner
on one season mostly selects noise.

    .venv/bin/python src/experiment_model.py

Confirm any winner with train_model.py's expanding-week protocol, which refits
weekly and is what the site quotes.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.calibration import CalibratedClassifierCV
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, brier_score_loss, log_loss
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from src.features import add_market_features

BASE_DIR = Path(__file__).resolve().parent.parent
PROCESSED_DIR = BASE_DIR / "data" / "processed"
RAW_DIR = BASE_DIR / "data" / "raw"

TARGET = "home_win"
TEST_SEASONS = [2019, 2020, 2021, 2022, 2023, 2024, 2025]

ELO_BASE = 1500.0


# ── Elo variants ─────────────────────────────────────────────────────────────
def compute_elo(
    df: pd.DataFrame,
    k: float = 20.0,
    hfa: float = 55.0,
    revert: float = 1.0 / 3.0,
    use_mov: bool = False,
) -> pd.DataFrame:
    """Pregame Elo ratings, optionally scaled by margin of victory.

    Binary Elo throws away how much a team won by, which is the more predictive
    signal — a 3-point win and a 30-point win move the rating identically. The
    margin multiplier is the FiveThirtyEight formulation, including its
    autocorrelation correction: without the denominator term, running up the
    score against an already-weak opponent would inflate a rating without bound.
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
                ratings[team] = ELO_BASE + (1 - revert) * (ratings[team] - ELO_BASE)
        last_season = season

        h, a = row["home_team"], row["away_team"]
        rh = ratings.setdefault(h, ELO_BASE)
        ra = ratings.setdefault(a, ELO_BASE)
        home_elo.loc[idx] = rh
        away_elo.loc[idx] = ra

        if pd.isna(row.get(TARGET)):
            continue

        delta = (rh + hfa) - ra
        expected = 1.0 / (1.0 + 10.0 ** (-delta / 400.0))
        actual = float(row[TARGET])

        multiplier = 1.0
        if use_mov:
            margin = row.get("point_margin")
            if pd.notna(margin):
                winner_delta = delta if actual == 1 else -delta
                multiplier = np.log(abs(margin) + 1.0) * (
                    2.2 / (0.001 * winner_delta + 2.2)
                )

        shift = k * multiplier * (actual - expected)
        ratings[h] = rh + shift
        ratings[a] = ra - shift

    df["elo_diff"] = home_elo - away_elo
    return df


# ── Opponent-adjusted EPA ────────────────────────────────────────────────────
def add_opponent_adjusted_epa(df: pd.DataFrame) -> pd.DataFrame:
    """Adjust each team's EPA for the quality of defenses/offenses it faced.

    season_epa_per_play is raw: a team that has played three of the worst
    defenses in the league looks identical to one that has played three of the
    best. Subtracting the average strength of the opponents actually faced is
    the cheap version of what DVOA does properly.
    """
    df = df.copy()

    # The training table keeps only diff_* columns, so the per-side values come
    # back from the team-games frame they were derived from.
    tg = pd.read_parquet(PROCESSED_DIR / "team_games_with_features.parquet")
    cols = ["season_epa_per_play", "season_epa_per_play_allowed"]
    for side, is_home in (("home", 1), ("away", 0)):
        part = tg[tg["is_home"] == is_home][["game_id"] + cols].rename(
            columns={c: f"{side}_{c}" for c in cols}
        )
        df = df.merge(part, on="game_id", how="left")

    # Strength faced, using each opponent's own season-to-date numbers, which are
    # already shifted so they contain no information from this game.
    df["home_sos_def"] = df["away_season_epa_per_play_allowed"]
    df["away_sos_def"] = df["home_season_epa_per_play_allowed"]
    df["adj_home_off"] = df["home_season_epa_per_play"] - df["home_sos_def"]
    df["adj_away_off"] = df["away_season_epa_per_play"] - df["away_sos_def"]
    df["diff_adj_off_epa"] = df["adj_home_off"] - df["adj_away_off"]
    return df


# ── Evaluation ───────────────────────────────────────────────────────────────
def build_model(C: float = 1.0, calibrate: bool = False):
    pipe = Pipeline(
        steps=[
            ("scaler", StandardScaler()),
            ("clf", LogisticRegression(max_iter=5000, C=C, random_state=42)),
        ]
    )
    if calibrate:
        return CalibratedClassifierCV(pipe, method="isotonic", cv=5)
    return pipe


def walk_forward(
    df: pd.DataFrame, features: list[str], C: float = 1.0, calibrate: bool = False
) -> dict:
    """Train on all prior seasons, predict each held-out season, pool results."""
    frames = []
    for season in TEST_SEASONS:
        train = df[df["season"] < season]
        test = df[df["season"] == season]
        if train.empty or test.empty:
            continue
        model = build_model(C, calibrate)
        model.fit(train[features], train[TARGET])
        probs = model.predict_proba(test[features])[:, 1]
        frames.append(pd.DataFrame({"y": test[TARGET].values, "p": probs}))

    pooled = pd.concat(frames, ignore_index=True)
    preds = (pooled["p"] >= 0.5).astype(int)
    return {
        "n": len(pooled),
        "n_features": len(features),
        "accuracy": float(accuracy_score(pooled["y"], preds)),
        "log_loss": float(log_loss(pooled["y"], pooled["p"], labels=[0, 1])),
        "brier": float(brier_score_loss(pooled["y"], pooled["p"])),
    }


def report(name: str, res: dict) -> None:
    print(
        f"{name:40s} {res['n_features']:5d} {res['accuracy']*100:6.2f}% "
        f"{res['log_loss']:8.4f} {res['brier']:7.4f}"
    )


def main() -> None:
    df = pd.read_csv(PROCESSED_DIR / "game_training_table.csv")
    df = df[df["is_played"]].copy()

    # Scores drive the margin-of-victory Elo and are not in the training table.
    sched = pd.read_parquet(RAW_DIR / "schedules.parquet")[
        ["game_id", "home_score", "away_score"]
    ]
    df = df.merge(sched, on="game_id", how="left")
    df["point_margin"] = df["home_score"] - df["away_score"]

    df = add_market_features(df)
    df = add_opponent_adjusted_epa(df)

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
    market = ["mkt_home_prob", "has_market", "spread_line_clean", "has_spread"]

    print(f"Walk-forward over {TEST_SEASONS[0]}–{TEST_SEASONS[-1]}, "
          f"training only on prior seasons.\n")

    # ── Elo tuning, judged on the no-market regime where it actually matters ──
    print("Elo variants (scored with context+form, no market):")
    print(f"{'variant':40s} {'nfeat':>5s} {'acc':>7s} {'logloss':>8s} {'brier':>7s}")
    print("-" * 72)

    elo_configs = {
        "binary K=20 HFA=55 rev=.33": dict(k=20, hfa=55, revert=1 / 3, use_mov=False),
        "binary K=32 HFA=55 rev=.33": dict(k=32, hfa=55, revert=1 / 3, use_mov=False),
        "MOV    K=20 HFA=55 rev=.33": dict(k=20, hfa=55, revert=1 / 3, use_mov=True),
        "MOV    K=12 HFA=55 rev=.33": dict(k=12, hfa=55, revert=1 / 3, use_mov=True),
        "MOV    K=20 HFA=48 rev=.25": dict(k=20, hfa=48, revert=0.25, use_mov=True),
        "MOV    K=12 HFA=48 rev=.25": dict(k=12, hfa=48, revert=0.25, use_mov=True),
    }

    elo_frames: dict[str, pd.Series] = {}
    football = context + recent_form + season_form
    for name, cfg in elo_configs.items():
        scored = compute_elo(df, **cfg)
        elo_frames[name] = scored["elo_diff"]
        tmp = df.assign(elo_diff=scored["elo_diff"])
        report(name, walk_forward(tmp, ["elo_diff"] + football, C=0.5))

    best_elo = min(
        elo_frames,
        key=lambda n: walk_forward(
            df.assign(elo_diff=elo_frames[n]), ["elo_diff"] + football, C=0.5
        )["log_loss"],
    )
    print(f"\nBest Elo: {best_elo}")
    df["elo_diff"] = elo_frames[best_elo]

    # ── Full comparison ──────────────────────────────────────────────────────
    print("\nFull variants:")
    print(f"{'variant':40s} {'nfeat':>5s} {'acc':>7s} {'logloss':>8s} {'brier':>7s}")
    print("-" * 72)

    variants = {
        "shipped: market+elo+form": market + context + ["elo_diff"] + recent_form + season_form,
        "  + opponent-adjusted EPA": market + context + ["elo_diff"] + recent_form + season_form + ["diff_adj_off_epa"],
        "market only": market + context,
        "no-market: elo+form": ["elo_diff"] + football,
        "no-market: elo+form+adjEPA": ["elo_diff"] + football + ["diff_adj_off_epa"],
    }
    results = {}
    for name, feats in variants.items():
        results[name] = walk_forward(df, feats, C=0.5)
        report(name, results[name])

    # ── Calibration and regularisation on the shipped set ────────────────────
    shipped = variants["shipped: market+elo+form"]
    print("\nRegularisation / calibration on the shipped set:")
    for C in (0.05, 0.1, 0.5, 1.0):
        report(f"  C={C}", walk_forward(df, shipped, C=C))
    report("  C=0.5 + isotonic", walk_forward(df, shipped, C=0.5, calibrate=True))

    # ── The market's own record over the same pooled games ───────────────────
    lined = df[(df["has_market"] == 1) & (df["season"].isin(TEST_SEASONS))]
    vegas_preds = (lined["mkt_home_prob"] >= 0.5).astype(int)
    print(
        f"\nVegas closing line over the same window ({len(lined)} lined games): "
        f"{accuracy_score(lined[TARGET], vegas_preds)*100:.2f}%  "
        f"logloss={log_loss(lined[TARGET], lined['mkt_home_prob'], labels=[0,1]):.4f}"
    )


if __name__ == "__main__":
    main()
