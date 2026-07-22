"""
Tests for the gsis_id -> espn_id join in build_player_context.py.
Run: python3 -m unittest tests.test_player_context_espn_id -v
"""
import sys
import unittest
from pathlib import Path

import pandas as pd

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from src.build_player_context import build  # noqa: E402


def _pbp_row(**overrides) -> dict:
    row = {
        "season": 2024, "posteam": "BUF", "defteam": "ARI", "home_team": "BUF",
        "play_type": "pass", "passer_player_name": None, "passer_player_id": None,
        "rusher_player_name": None, "rusher_player_id": None,
        "pass_attempt": 0, "rush_attempt": 0, "epa": 0.0, "cpoe": None,
        "yards_gained": 0, "sack": 0,
    }
    row.update(overrides)
    return row


class TestEspnIdJoin(unittest.TestCase):

    def _build_qb_frame(self, attempts: int) -> pd.DataFrame:
        rows = [
            _pbp_row(passer_player_name="J.Allen", passer_player_id="00-0034857",
                     pass_attempt=1, epa=0.2, cpoe=3.0)
            for _ in range(attempts)
        ]
        return pd.DataFrame(rows)

    def test_starter_gets_espn_id_from_crosswalk(self):
        df = self._build_qb_frame(60)
        ctx = build(df, gsis_to_espn={"00-0034857": "3918298"})
        qb = ctx[2024]["BUF"]["qb"]
        self.assertEqual(qb["name"], "J.Allen")
        self.assertEqual(qb["espn_id"], "3918298")

    def test_missing_crosswalk_entry_degrades_to_none(self):
        df = self._build_qb_frame(60)
        ctx = build(df, gsis_to_espn={})
        qb = ctx[2024]["BUF"]["qb"]
        self.assertEqual(qb["name"], "J.Allen")
        self.assertIsNone(qb["espn_id"])

    def test_no_qualifying_qb_has_none_espn_id(self):
        # Below MIN_QB_ATTEMPTS threshold -> no starter at all.
        df = self._build_qb_frame(5)
        ctx = build(df, gsis_to_espn={"00-0034857": "3918298"})
        qb = ctx[2024]["BUF"]["qb"]
        self.assertIsNone(qb["name"])
        self.assertIsNone(qb["espn_id"])

    def test_rb_also_gets_espn_id(self):
        rows = [
            _pbp_row(play_type="run", rusher_player_name="J.Cook",
                     rusher_player_id="00-0037746", rush_attempt=1,
                     yards_gained=4, epa=0.1)
            for _ in range(40)
        ]
        df = pd.DataFrame(rows)
        ctx = build(df, gsis_to_espn={"00-0037746": "4361739"})
        rb = ctx[2024]["BUF"]["rb"]
        self.assertEqual(rb["name"], "J.Cook")
        self.assertEqual(rb["espn_id"], "4361739")


if __name__ == "__main__":
    unittest.main()
