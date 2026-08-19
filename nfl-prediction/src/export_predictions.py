#!/usr/bin/env python3
"""
export_predictions.py
=====================
Generates the static predictions.json file used by the Vercel deployment.

Run this once (or after any model/data update) from inside the nfl-prediction
directory with the venv activated:

    cd nfl-prediction
    source .venv/bin/activate
    python3 src/export_predictions.py

The output lands in primary-ui/public/predictions.json, which Vite serves as a
static asset in both dev and production — there is no dev proxy. The frontend
only talks to the live FastAPI backend when VITE_API_BASE_URL is set.
"""

import sys
import json
from pathlib import Path

# Make `from src.api import ...` resolvable when run from the repo root
# or from the nfl-prediction/ directory.
THIS_DIR  = Path(__file__).resolve().parent          # .../nfl-prediction/src
PRED_DIR  = THIS_DIR.parent                          # .../nfl-prediction
REPO_ROOT = PRED_DIR.parent                          # .../capstonefootball

if str(PRED_DIR) not in sys.path:
    sys.path.insert(0, str(PRED_DIR))

# ---------------------------------------------------------------------------
# Import the live enrichment pipeline from api.py.
# Importing the module runs the model + data load at module level — that's
# intentional; it's exactly the same path the FastAPI server takes.
# ---------------------------------------------------------------------------
print("Loading model and data...")
from src.api import (  # noqa: E402
    get_predictions,
    ACTIVE_SEASON,
    DEMO_SEASON,
    DATA_MODE,
    MODEL_META,
)

PUBLIC_DIR = REPO_ROOT / "primary-ui" / "public"

# Two files, because they answer different questions. predictions.json is the
# season being played and mostly has no outcomes yet; the demo file is a
# completed season where every pick resolves, which is the only way a new
# visitor can see records, streaks and the Clark Differential do anything
# before the live season has been played.
EXPORTS = {
    ACTIVE_SEASON: PUBLIC_DIR / "predictions.json",
    DEMO_SEASON: PUBLIC_DIR / f"predictions-{DEMO_SEASON}.json",
}


def main() -> None:
    PUBLIC_DIR.mkdir(parents=True, exist_ok=True)

    for season, out_path in EXPORTS.items():
        print(f"Running enrichment pipeline for {season}...")
        predictions = get_predictions(season=season)

        with open(out_path, "w", encoding="utf-8") as fh:
            json.dump(predictions, fh, indent=2, ensure_ascii=False)

        resolved = sum(1 for game in predictions if game.get("actual_winner"))
        size_kb = out_path.stat().st_size / 1024
        print(f"   Games      : {len(predictions)} ({resolved} with final scores)")
        print(f"   Output     : {out_path.name}  ({size_kb:.1f} KB)")

    print(f"\n✅  Done.  Data mode: {DATA_MODE}   "
          f"Model accuracy: {MODEL_META.get('accuracy', '?')}")
    print(
        "   Commit both JSON files and push — Vercel serves them as static files."
    )


if __name__ == "__main__":
    main()
