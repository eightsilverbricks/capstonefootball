"""
clark_llm.py - optional AI polish for the Clark Report (free tier only)
=======================================================================
Rewrites the *prose* of a template Clark Report with Gemini Flash-Lite so it
reads less like a template. Tables, ranks, the line and the numbers drawer are
never touched. Rules from CLARK_OVERHAUL_PLAN.md §15:

- Runs only in the offline export, only when GEMINI_API_KEY is set, and only
  for the upcoming week's games (about 16 calls a week).
- Results are cached by a hash of the facts, so re-running the export costs
  nothing unless the numbers changed.
- Every number in the AI text must already appear in the template report, and
  the result must pass the report validator. Anything else falls back to the
  template, so a quota error or a made-up stat never reaches the site.
"""
from __future__ import annotations

import copy
import hashlib
import json
import logging
import os
import re
import urllib.request
from pathlib import Path

from src.validate_report import validate_game

log = logging.getLogger("clark_llm")

MODEL = os.environ.get("CLARK_LLM_MODEL", "gemini-2.5-flash-lite")
ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
CACHE_PATH = Path(__file__).resolve().parent.parent / "outputs" / "clark_report_cache.json"
MAX_CALLS = int(os.environ.get("CLARK_LLM_MAX_CALLS", "20"))
TIMEOUT_S = 30
NUMBER = re.compile(r"\d+(?:\.\d+)?")

PROSE_KEYS = ("headline", "dek", "intro", "deciding_body", "other_side_body", "signoff")

PROMPT = """You are Clark, the prediction model behind The Clark Index, writing your
game preview. Voice: a friendly stats-nerd buddy. First person ("I"), plain English,
excited about the numbers, honest that nothing is a lock. Short sentences.

Rewrite ONLY these fields of the draft so they sound natural and specific:
headline, dek, intro (2-4 short paragraphs), deciding_body, other_side_body, signoff.

Hard rules:
- Use ONLY numbers that appear in the FACTS. Never invent stats, players, injuries or history.
- No stat jargon: never write EPA, CPOE, DVOA or "success rate".
- Every sentence starts with a capital letter. No double spaces.
- headline: under 16 words. dek: one or two sentences. signoff starts with "Not a lock!".

Return JSON with exactly these keys: headline (string), dek (string), intro (array of
strings), deciding_body (array of strings), other_side_body (array of strings), signoff (string).

FACTS AND DRAFT:
{facts}
"""


def numbers_in(text: str) -> set[str]:
    return {n.rstrip("0").rstrip(".") if "." in n else n for n in NUMBER.findall(text)}


def unknown_numbers(fields: dict, report: dict) -> set[str]:
    """Numbers in the AI prose that the template report never mentions."""
    allowed = numbers_in(json.dumps(report))
    written = numbers_in(json.dumps(fields))
    return written - allowed


def facts_hash(report: dict) -> str:
    return hashlib.sha256(json.dumps(report, sort_keys=True).encode()).hexdigest()[:16]


def merge(report: dict, fields: dict) -> dict:
    out = copy.deepcopy(report)
    out["headline"], out["dek"], out["signoff"] = fields["headline"], fields["dek"], fields["signoff"]
    out["intro"] = list(fields["intro"])
    out["deciding"]["body"] = list(fields["deciding_body"])
    out["other_side"]["body"] = list(fields["other_side_body"])
    out["source"] = "gemini"
    return out


def _well_formed(fields: object) -> bool:
    if not isinstance(fields, dict) or set(fields) != set(PROSE_KEYS):
        return False
    for key in ("headline", "dek", "signoff"):
        if not isinstance(fields[key], str) or not fields[key].strip():
            return False
    return all(isinstance(fields[k], list) and fields[k] and all(isinstance(s, str) and s.strip() for s in fields[k])
               for k in ("intro", "deciding_body", "other_side_body"))


def _call_gemini(prompt: str, api_key: str) -> dict:
    body = json.dumps({
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"responseMimeType": "application/json", "temperature": 0.7},
    }).encode()
    req = urllib.request.Request(
        ENDPOINT.format(model=MODEL), data=body, method="POST",
        headers={"Content-Type": "application/json", "x-goog-api-key": api_key},
    )
    with urllib.request.urlopen(req, timeout=TIMEOUT_S) as resp:
        payload = json.load(resp)
    text = payload["candidates"][0]["content"]["parts"][0]["text"]
    return json.loads(text)


def accept(game: dict, report: dict, fields: object) -> dict | None:
    """The merged report if the AI output is safe to ship, else None."""
    if not _well_formed(fields):
        return None
    if unknown_numbers(fields, report):
        return None
    merged = merge(report, fields)
    if validate_game({**game, "clark_report": merged}):
        return None
    return merged


def _load_cache() -> dict:
    try:
        return json.loads(CACHE_PATH.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def polish_reports(games: list[dict], eligible: set[str]) -> dict[str, int]:
    """Replace template prose with cached or fresh AI prose, in place on each game's clark_report.

    Returns counts: {"cached", "generated", "rejected", "failed"}.
    """
    stats = {"cached": 0, "generated": 0, "rejected": 0, "failed": 0}
    api_key = os.environ.get("GEMINI_API_KEY", "")
    cache = _load_cache()
    calls = 0

    for game in games:
        report, gid = game.get("clark_report"), str(game.get("game_id"))
        if not report or gid not in eligible:
            continue
        key = facts_hash(report)
        hit = cache.get(gid)
        if hit and hit.get("hash") == key:
            merged = accept(game, report, hit.get("fields"))
            if merged:
                game["clark_report"] = merged
                stats["cached"] += 1
                continue
        if not api_key or calls >= MAX_CALLS:
            continue

        calls += 1
        try:
            fields = _call_gemini(PROMPT.format(facts=json.dumps(report, indent=1)), api_key)
        except Exception as exc:  # network, quota, bad JSON: the template stays
            log.warning("Gemini failed for %s: %s", gid, exc)
            stats["failed"] += 1
            continue
        merged = accept(game, report, fields)
        if not merged:
            stats["rejected"] += 1
            continue
        game["clark_report"] = merged
        cache[gid] = {"hash": key, "fields": fields}
        stats["generated"] += 1

    if stats["generated"]:
        CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
        CACHE_PATH.write_text(json.dumps(cache, indent=1, ensure_ascii=False), encoding="utf-8")
    return stats
