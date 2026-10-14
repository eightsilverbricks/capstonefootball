#!/usr/bin/env python3
"""
experiment_retraining.py - which season features, and how often to retrain
==========================================================================
Two questions, answered on the same walk-forward backtest (2015-2025, every
regular-season and playoff game, ~2,900 games):

1. Feature build: "career" season_* stats (every game since 2006, the old
   behaviour) vs "season" stats (this season so far, shrunk toward last
   season by K games; K = 2, 4, 8).
2. Retraining cadence: once before each season vs before every week
   (seasons < S plus weeks < W of season S).

Hyperparameters are grid-searched once per test season on the prior seasons
and reused for that season's weekly refits, so the cadence comparison isn't
confounded by tuning. Pooled log loss is the deciding number (lower is
better); accuracy and Brier are reported alongside.

    .venv/bin/python src/experiment_retraining.py           # rebuild tables + evaluate
    .venv/bin/python src/experiment_retraining.py --reuse   # evaluate saved tables only
"""
from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.base import clone
from sklearn.metrics import accuracy_score, brier_score_loss, log_loss

PRED_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PRED_DIR))
from src.train_model import PRODUCTION_FEATURES, TARGET, build_model  # noqa: E402

TABLE = PRED_DIR / "data" / "processed" / "game_training_table.csv"
WORK = PRED_DIR / "outputs" / "experiments"
RESULTS = PRED_DIR / "outputs" / "retraining_experiment.json"
TEST_SEASONS = list(range(2015, 2026))
CONFIGS = {"career": ("career", "4"), "season_k2": ("season", "2"), "season_k4": ("season", "4"), "season_k8": ("season", "8")}


def build_table(name: str, mode: str, k: str) -> Path:
    env = {**os.environ, "SEASON_MODE": mode, "SEASON_PRIOR_GAMES": k, "PYTHONPATH": str(PRED_DIR)}
    for script in ("build_team_game_stats.py", "build_training_table.py"):
        subprocess.run([sys.executable, f"src/{script}"], cwd=PRED_DIR, env=env, check=True, stdout=subprocess.DEVNULL)
    WORK.mkdir(parents=True, exist_ok=True)
    out = WORK / f"{name}.csv"
    shutil.copy(TABLE, out)
    return out


def walk_forward(df: pd.DataFrame) -> dict[str, dict]:
    df = df[df["is_played"]].sort_values(["season", "week", "game_id"]).reset_index(drop=True)
    X, y = df[list(PRODUCTION_FEATURES)], df[TARGET].astype(int)
    preds = {"season_start": [], "weekly": []}
    truth: list[int] = []

    for season in TEST_SEASONS:
        prior = df["season"] < season
        tuned = build_model().fit(X[prior], y[prior])
        best = tuned.best_estimator_
        test_idx = df.index[df["season"] == season]
        preds["season_start"].extend(best.predict_proba(X.loc[test_idx])[:, 1])

        for week in sorted(df.loc[test_idx, "week"].unique()):
            train = prior | ((df["season"] == season) & (df["week"] < week))
            week_idx = df.index[(df["season"] == season) & (df["week"] == week)]
            model = clone(best).fit(X[train], y[train])
            preds["weekly"].extend(model.predict_proba(X.loc[week_idx])[:, 1])
        truth.extend(y.loc[test_idx])
        print(f"   {season} done", flush=True)

    t = np.array(truth)
    return {
        cadence: {
            "log_loss": round(float(log_loss(t, p)), 5),
            "accuracy": round(float(accuracy_score(t, np.array(p) >= 0.5)), 4),
            "brier": round(float(brier_score_loss(t, p)), 5),
            "n": int(len(t)),
        }
        for cadence, p in ((c, np.array(v)) for c, v in preds.items())
    }


def main() -> None:
    reuse = "--reuse" in sys.argv
    results: dict[str, dict] = {}
    for name, (mode, k) in CONFIGS.items():
        path = WORK / f"{name}.csv"
        if not (reuse and path.exists()):
            print(f"Building {name} (SEASON_MODE={mode}, K={k})...", flush=True)
            path = build_table(name, mode, k)
        print(f"Evaluating {name}...", flush=True)
        results[name] = walk_forward(pd.read_csv(path))
        print(f"   {results[name]}", flush=True)

    RESULTS.write_text(json.dumps(results, indent=2), encoding="utf-8")
    print("\nconfig        cadence        log_loss  accuracy  brier")
    for name, by in results.items():
        for cadence, m in by.items():
            print(f"{name:13} {cadence:14} {m['log_loss']:.5f}  {m['accuracy']:.4f}    {m['brier']:.5f}")


if __name__ == "__main__":
    main()
