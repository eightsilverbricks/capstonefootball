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

The output lands in nfl-frontend/public/predictions.json, which Vite
serves as a static asset in production. In local dev, the Vite proxy
routes /predictions.json to the live FastAPI backend instead.
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
    DATA_MODE,
    MODEL_META,
)

OUTPUT_PATH = REPO_ROOT / "primary-ui" / "public" / "predictions.json"


def main() -> None:
    print("Running enrichment pipeline over all games...")
    predictions = get_predictions()

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as fh:
        json.dump(predictions, fh, indent=2, ensure_ascii=False)

    size_kb = OUTPUT_PATH.stat().st_size / 1024
    print(f"\n✅  Done.")
    print(f"   Games exported : {len(predictions)}")
    print(f"   Data mode      : {DATA_MODE}")
    print(f"   Model accuracy : {MODEL_META.get('accuracy', '?')}")
    print(f"   Output         : {OUTPUT_PATH}")
    print(f"   File size      : {size_kb:.1f} KB")
    print(
        "\n   Commit predictions.json and push to GitHub — "
        "Vercel will serve it as a static file."
    )


if __name__ == "__main__":
    main()
