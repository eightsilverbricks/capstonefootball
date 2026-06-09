#!/usr/bin/env python3
"""
validate_alignment.py
=====================
CI gate: exits 1 if factor–prediction alignment is below 90%.

Run from nfl-prediction/ after exporting predictions.json:
    .venv/bin/python3 src/validate_alignment.py
"""
import json
import sys
from pathlib import Path

THIS_DIR  = Path(__file__).resolve().parent
REPO_ROOT = THIS_DIR.parent.parent
JSON_PATH = REPO_ROOT / "primary-ui" / "public" / "predictions.json"
THRESHOLD = 0.90


def check_alignment(predictions: list[dict]) -> tuple[float, int, int]:
    games = [g for g in predictions if g.get("factor_cards")]
    if not games:
        return 0.0, 0, 0
    aligned = sum(
        1 for g in games
        if g["factor_cards"][0].get("advantage_team") == g.get("predicted_winner")
    )
    return aligned / len(games), aligned, len(games)


def main() -> None:
    if not JSON_PATH.exists():
        print(f"❌  {JSON_PATH} not found — run export_predictions.py first", file=sys.stderr)
        sys.exit(1)

    with open(JSON_PATH) as f:
        predictions = json.load(f)

    rate, aligned, total = check_alignment(predictions)
    status = "✅" if rate >= THRESHOLD else "❌"
    print(f"{status}  Factor alignment: {rate:.1%} ({aligned}/{total}) — threshold {THRESHOLD:.0%}")

    if rate < THRESHOLD:
        print("FAIL: alignment below threshold. Re-run export after fixing api.py.", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
