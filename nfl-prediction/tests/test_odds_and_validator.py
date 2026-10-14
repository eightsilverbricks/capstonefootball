"""
Tests for odds.py (line -> win probability) and validate_report.py (the
report consistency checker that gates every export).
Run: python3 -m pytest tests/test_odds_and_validator.py -q
"""
import copy
import sys
import unittest
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from src.odds import market_view, moneyline_to_prob, spread_to_home_prob  # noqa: E402
from src.validate_report import validate_game  # noqa: E402


class TestOdds(unittest.TestCase):

    def test_moneyline_conversion(self):
        self.assertAlmostEqual(moneyline_to_prob(-200), 2 / 3)
        self.assertAlmostEqual(moneyline_to_prob(200), 1 / 3)
        self.assertIsNone(moneyline_to_prob(0))

    def test_spread_conversion_is_symmetric_and_monotone(self):
        self.assertAlmostEqual(spread_to_home_prob(0.0), 0.5)
        self.assertAlmostEqual(spread_to_home_prob(3.0) + spread_to_home_prob(-3.0), 1.0)
        self.assertGreater(spread_to_home_prob(7.0), spread_to_home_prob(3.0))
        # 2.5-point favorite ~57%: the number the live site got wrong (47%).
        self.assertAlmostEqual(spread_to_home_prob(2.5), 0.571, places=2)

    def test_favorite_is_never_below_half(self):
        # Spread says home, moneyline (vig-free) says a hair the other way.
        view = market_view("NO", "ATL", 1.0, 105, -110)
        self.assertEqual(view["favorite"], "NO")
        self.assertGreaterEqual(view["favorite_prob"], 0.5)

    def test_away_favorite_from_spread_only(self):
        view = market_view("NYG", "ARI", -3.5, None, None)
        self.assertEqual(view["favorite"], "ARI")
        self.assertGreater(view["favorite_prob"], 0.5)
        self.assertEqual(view["spread"], 3.5)

    def test_no_line_is_none_and_pickem_has_no_favorite(self):
        self.assertIsNone(market_view("A", "B", 0.0, None, None))
        self.assertIsNone(market_view("A", "B", 0.0, -110, None)["favorite"]
                          if market_view("A", "B", 0.0, -110, None) else None)
        self.assertIsNone(market_view("A", "B", 0.0, -110, -110)["favorite"])


def _game(**overrides) -> dict:
    game = {
        "game_id": "2026_04_ATL_NO", "home_team": "NO", "away_team": "ATL",
        "predicted_winner": "NO",
        "football_story": "Clark picks NO with a 52% chance to win. The betting line agrees.",
        "risk_factor": "ATL get 3 more days of rest than NO, which helps in a close game.",
        "market_note": "Sportsbooks have NO as a 2.5-point favorite, about a 57% chance to win. Clark agrees.",
        "key_battle": "NO are at home.",
        "factor_cards": [
            {"name": "Home Field", "advantage_team": "NO", "raw_edge": 0.26,
             "headline": "NO are at home.", "explanation": "The game is at Caesars Superdome."},
            {"name": "Game Context", "advantage_team": "ATL", "raw_edge": -0.10,
             "headline": "Rest tilts toward ATL.",
             "explanation": "ATL get 3 more days of rest than NO, which helps in a close game."},
            {"name": "Market Edge", "advantage_team": "NO", "raw_edge": -0.05,
             "headline": "The betting line favors NO.",
             "explanation": "Sportsbooks have NO as a 2.5-point favorite, which works out to about a 57% chance to win."},
        ],
    }
    game.update(overrides)
    return game


class TestValidator(unittest.TestCase):

    def test_clean_report_passes(self):
        self.assertEqual(validate_game(_game()), [])

    def test_pick_against_the_factors_fails(self):
        game = _game(predicted_winner="ATL")
        self.assertTrue(any("factors sum toward NO" in e for e in validate_game(game)))

    def test_even_as_a_team_fails(self):
        game = _game()
        game["factor_cards"][2] = {**game["factor_cards"][2], "advantage_team": "Even",
                                   "headline": "Vegas gives Even the slight nod."}
        errors = validate_game(game)
        self.assertTrue(any("names 'Even'" in e for e in errors))
        self.assertTrue(any("slight nod" in e for e in errors))

    def test_favorite_under_fifty_fails(self):
        game = _game(market_note="Sportsbooks have NO as a 2.5-point favorite, about a 47% chance to win.")
        self.assertTrue(any("47%" in e for e in validate_game(game)))

    def test_market_note_citing_unshown_factor_fails(self):
        game = _game(market_note="Football factors - QB Efficiency and Turnover Edge - drive it.")
        self.assertTrue(any("QB Efficiency" in e for e in validate_game(game)))

    def test_jargon_double_negative_and_lowercase_fail(self):
        game = copy.deepcopy(_game())
        game["factor_cards"][1]["explanation"] = (
            "ATL allow -0.20 EPA/play more than NO recently. so treat this as a wash.")
        errors = validate_game(game)
        self.assertTrue(any("double negative" in e for e in errors))
        self.assertTrue(any("jargon" in e for e in errors))
        self.assertTrue(any("lowercase" in e for e in errors))

    def test_filler_fails(self):
        game = _game(football_story="The one thing that could turn it: rest.")
        self.assertTrue(any("filler" in e for e in validate_game(game)))


if __name__ == "__main__":
    unittest.main()


class TestDisplayPct(unittest.TestCase):

    def test_rounds_half_up_like_the_site(self):
        from src.odds import display_pct
        self.assertEqual(display_pct(0.595), 60)
        self.assertEqual(display_pct(0.585), 59)
        self.assertEqual(display_pct(0.5149), 51)
        self.assertEqual(display_pct(1.0), 100)
