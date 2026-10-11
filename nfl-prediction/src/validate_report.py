"""
validate_report.py - every Clark Report must agree with itself
==============================================================
Checks one exported game (or a whole predictions.json) for the contradictions
readers caught on the live site: a pick the listed factors argue against, a
"favorite" priced under 50%, "Even" rendered as a team, a market note citing a
factor the report doesn't show, and template leaks like "undefined".

    python3 src/validate_report.py ../primary-ui/public/predictions.json

Exits non-zero on any error so the export (and CI) refuses to ship it.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

TEMPLATE_LEAKS = re.compile(r"\b(undefined|NaN|None|null)\b")
# A negative number right before "more"/"fewer"/"less" is a double negative.
DOUBLE_NEGATIVE = re.compile(r"-\d+(\.\d+)?\s+\S*\s*(more|fewer|less)\b")
LOWERCASE_SENTENCE = re.compile(r"[.!?]\s+[a-z]")
# Filler the overhaul spec removes (CLARK_OVERHAUL_PLAN.md §2, §14).
BANNED_PHRASES = (
    "keeps coming back",
    "The one thing that could turn it",
    "rides on the overall blend",
    "No single factor dominates",
    "slight nod",
)
# Jargon is allowed in the numbers drawer (baseline_note), never in the prose.
JARGON = re.compile(r"\bEPA\b|\bCPOE\b|\bDVOA\b|success rate", re.IGNORECASE)
PCT_TO_WIN = re.compile(r"about an? (\d+)% chance to win")


def _prose_fields(game: dict) -> list[tuple[str, str]]:
    fields = [(k, game.get(k) or "") for k in
              ("football_story", "risk_factor", "market_note", "key_battle")]
    for i, card in enumerate(game.get("factor_cards") or []):
        fields.append((f"factor_cards[{i}].headline", card.get("headline") or ""))
        fields.append((f"factor_cards[{i}].explanation", card.get("explanation") or ""))
    return fields


def validate_game(game: dict) -> list[str]:
    """Return a list of human-readable problems; empty means the report is clean."""
    errors: list[str] = []
    gid = game.get("game_id", "?")
    home, away = game.get("home_team"), game.get("away_team")
    winner = game.get("predicted_winner")
    cards = game.get("factor_cards") or []
    teams = {home, away}

    if winner not in teams:
        errors.append(f"{gid}: predicted_winner {winner!r} is not one of the teams")

    # 1. The factors must add up to the pick. raw_edge is home-positive and the
    #    cards (Home Field included) sum to the model's log-odds.
    if cards:
        total = sum(float(c.get("raw_edge") or 0.0) for c in cards)
        side = home if total > 0 else away
        if abs(total) > 1e-6 and side != winner:
            errors.append(f"{gid}: factors sum toward {side} but the pick is {winner}")

    # 2. Every card's team is a real team or the neutral "Even".
    for c in cards:
        if c.get("advantage_team") not in teams | {"Even"}:
            errors.append(f"{gid}: card {c.get('name')!r} favors {c.get('advantage_team')!r}")
        if c.get("advantage_team") == "Even" and "Even" in (c.get("headline") or ""):
            errors.append(f"{gid}: card {c.get('name')!r} names 'Even' as a team")

    # 3. A favorite is never priced under 50%.
    for name, text in _prose_fields(game):
        for m in PCT_TO_WIN.finditer(text):
            if int(m.group(1)) < 50:
                errors.append(f"{gid}: {name} prices a favorite at {m.group(1)}%")

    # 4. The market note may only mention factors the report shows.
    shown = {c.get("name") for c in cards}
    legacy = ("QB Efficiency", "Turnover", "Sack Pressure", "Success Rate")
    note = game.get("market_note") or ""
    for name in legacy:
        if name in note and name not in shown:
            errors.append(f"{gid}: market_note cites {name!r}, which the report doesn't show")

    # 5. Template hygiene, filler and jargon in reader-facing prose.
    for name, text in _prose_fields(game):
        if not text and name.endswith(("headline", "explanation")):
            errors.append(f"{gid}: {name} is empty")
        if TEMPLATE_LEAKS.search(text):
            errors.append(f"{gid}: {name} leaks a template value: {text[:80]!r}")
        if "  " in text:
            errors.append(f"{gid}: {name} has a double space")
        if DOUBLE_NEGATIVE.search(text):
            errors.append(f"{gid}: {name} has a double negative: {text[:80]!r}")
        if LOWERCASE_SENTENCE.search(text) or (text and text[0].islower()):
            errors.append(f"{gid}: {name} has a sentence starting lowercase")
        if JARGON.search(text):
            errors.append(f"{gid}: {name} uses stat jargon: {text[:80]!r}")
        for phrase in BANNED_PHRASES:
            if phrase in text:
                errors.append(f"{gid}: {name} contains filler {phrase!r}")

    # 6. The upset path must not repeat a factor explanation word for word
    #    unless it is the explanation of an opposing factor (that's its source).
    risk = game.get("risk_factor") or ""
    for c in cards:
        if c.get("advantage_team") == winner and risk and risk == c.get("explanation"):
            errors.append(f"{gid}: risk_factor repeats a factor that supports the pick")

    return errors


def validate_file(path: Path) -> list[str]:
    with open(path, encoding="utf-8") as fh:
        games = json.load(fh)
    errors: list[str] = []
    for game in games:
        errors.extend(validate_game(game))
    return errors


def main(argv: list[str]) -> int:
    paths = [Path(p) for p in argv[1:]] or [
        Path(__file__).resolve().parents[2] / "primary-ui" / "public" / "predictions.json"
    ]
    failed = False
    for path in paths:
        errors = validate_file(path)
        if errors:
            failed = True
            print(f"✗ {path.name}: {len(errors)} problem(s)")
            for e in errors[:50]:
                print(f"   {e}")
            if len(errors) > 50:
                print(f"   ... and {len(errors) - 50} more")
        else:
            print(f"✓ {path.name}: clean")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
