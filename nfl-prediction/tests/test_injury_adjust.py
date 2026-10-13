"""
Tests for injury_adjust.py: injuries move Clark's number by a fitted amount.
Run: python3 -m pytest tests/test_injury_adjust.py -q
"""
import json
import sys
import unittest
from pathlib import Path
from unittest import mock

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from src import injury_adjust as ia  # noqa: E402


class TestInjuryAdjust(unittest.TestCase):

    def tearDown(self):
        ia._espn.cache_clear()
        ia._nflverse.cache_clear()

    def test_weights(self):
        self.assertEqual(ia.player_weight("QB", "Out"), 10.0)
        self.assertEqual(ia.player_weight("QB", "Questionable"), 2.5)
        self.assertEqual(ia.player_weight("WR", "Injured Reserve"), 0.0)
        self.assertEqual(ia.player_weight("LS", "Out"), ia.DEFAULT_WEIGHT)

    def test_adjust_is_symmetric_and_bounded(self):
        self.assertAlmostEqual(ia.adjust_home_prob(0.5, 0.0), 0.5)
        up = ia.adjust_home_prob(0.6, 0.2)
        down = ia.adjust_home_prob(0.4, -0.2)
        self.assertAlmostEqual(up + down, 1.0)
        self.assertLess(ia.adjust_home_prob(0.999999, 5.0), 1.0)

    def test_more_hurt_home_team_lowers_home_chances(self):
        self.assertLess(ia.INJURY_LOGIT_PER_POINT, 0)
        with mock.patch.object(ia, "_nflverse", return_value={
            (2026, 6, "BUF"): [{"name": "Josh Allen", "position": "QB", "status": "Out"}],
            (2026, 6, "MIA"): [],
        }):
            report = ia.game_injuries(2026, 6, "BUF", "MIA")
        self.assertEqual(report["source"], "nflverse")
        self.assertEqual(report["home"]["burden"], 10.0)
        self.assertLess(report["logit"], 0)
        self.assertEqual(report["home"]["players"][0]["name"], "Josh Allen")

    def test_espn_fallback_only_for_its_own_week(self):
        teams = {"KC": [{"name": "A", "position": "CB", "status": "Doubtful"}]}
        with mock.patch.object(ia, "_nflverse", return_value={}), \
             mock.patch.object(ia, "_espn", return_value={(2026, 6): teams}):
            hit = ia.game_injuries(2026, 6, "LAC", "KC")
            miss = ia.game_injuries(2026, 7, "LAC", "KC")
        self.assertEqual(hit["source"], "espn")
        self.assertEqual(hit["away"]["burden"], 1.5)
        self.assertGreater(hit["logit"], 0)
        self.assertIsNone(miss)

    def test_espn_cache_reader(self):
        with mock.patch.object(ia, "ESPN_CACHE_PATH") as path:
            path.read_text.return_value = json.dumps({"season": 2026, "weeks": {"5": {}, "6": {"KC": []}}})
            self.assertEqual(ia._espn(), {(2026, 5): {}, (2026, 6): {"KC": []}})


if __name__ == "__main__":
    unittest.main()


class TestRefreshWeeks(unittest.TestCase):

    def test_week_detection(self):
        import pandas as pd
        from src.refresh import season_weeks
        sched = pd.DataFrame({
            "season": [2026] * 6, "game_type": ["REG"] * 6,
            "week": [1, 1, 2, 2, 3, 3],
            "home_score": [20, 17, 24, None, None, None],
        })
        self.assertEqual(season_weeks(sched), (2, 2))
        done = sched.assign(home_score=[1, 1, 1, 1, 1, 1])
        self.assertEqual(season_weeks(done), (3, None))
