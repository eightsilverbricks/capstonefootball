"""Parsing tests for espn_extras.py, against the shape of ESPN's summary feed."""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.espn_extras import (  # noqa: E402
    merge_into_predictions, parse_injury_notes, parse_key_players,
)


def _athlete(name, pos, aid="1"):
    return {"id": aid, "displayName": name, "position": {"abbreviation": pos}}


SUMMARY = {
    "leaders": [{
        "team": {"abbreviation": "WSH"},
        "leaders": [
            {"name": "passingYards", "leaders": [{"athlete": _athlete("Jayden Daniels", "QB", "9"),
                                                   "displayValue": "73/105, 730 YDS, 7 TD, 1 INT"}]},
            {"name": "rushingYards", "leaders": [{"athlete": _athlete("Austin Ekeler", "RB"),
                                                   "displayValue": "43 CAR, 169 YDS, 2 TD"}]},
            {"name": "totalTackles", "leaders": [{"athlete": _athlete("Bobby Wagner", "LB"),
                                                   "displayValue": "21"}]},
        ],
    }],
    "injuries": [{
        "team": {"abbreviation": "LAR"},
        "injuries": [
            {"athlete": _athlete("Some Tackle", "OT"), "status": "Questionable", "details": {"type": "Knee"}},
            {"athlete": _athlete("Long Gone", "WR"), "status": "Injured Reserve", "details": {"type": "ACL"}},
            {"athlete": _athlete("Star Qb", "QB"), "status": "Out", "details": {"type": "Ankle"}},
        ],
    }],
}


class TestEspnExtras(unittest.TestCase):

    def test_key_players_are_plain_and_use_nflverse_abbreviations(self):
        players = parse_key_players(SUMMARY)
        self.assertEqual([p["name"] for p in players], ["Jayden Daniels", "Austin Ekeler"])
        qb = players[0]
        self.assertEqual(qb["team"], "WAS")
        self.assertEqual(qb["role"], "Leads WAS in passing")
        self.assertEqual(qb["stat_line"], "730 yards, 7 TD, 1 INT this season")
        self.assertEqual(qb["espn_id"], "9")
        self.assertEqual(players[1]["stat_line"], "43 carries, 169 yards, 2 TD this season")

    def test_injuries_skip_ir_and_sort_out_first(self):
        notes = parse_injury_notes(SUMMARY)
        self.assertEqual([n["name"] for n in notes], ["Star Qb", "Some Tackle"])
        self.assertEqual(notes[0]["team"], "LA")
        self.assertEqual(notes[0]["status"], "Out")
        self.assertEqual(notes[0]["injury"], "Ankle")

    def test_merge_only_touches_matching_week(self):
        preds = [
            {"season": 2026, "week": 4, "away_team": "ATL", "home_team": "NO"},
            {"season": 2026, "week": 5, "away_team": "ATL", "home_team": "NO"},
        ]
        extras = {("ATL", "NO"): {"key_players": [{"name": "X"}], "injury_notes": []}}
        self.assertEqual(merge_into_predictions(preds, 2026, 4, extras), 1)
        self.assertIn("key_players", preds[0])
        self.assertNotIn("key_players", preds[1])

    def test_missing_blocks_are_empty_not_errors(self):
        self.assertEqual(parse_key_players({}), [])
        self.assertEqual(parse_injury_notes({"injuries": None}), [])


if __name__ == "__main__":
    unittest.main()
