"""
Tests for factor-prediction alignment.
Run: python3 -m unittest tests/test_factor_alignment -v

RED: fails before build_factor_cards() is rewritten to use model coefficients.
GREEN: passes after the fix.
"""
import json
import re
import sys
import unittest
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
PREDICTIONS_JSON = BASE_DIR.parent / "primary-ui" / "public" / "predictions.json"


def load_predictions():
    if not PREDICTIONS_JSON.exists():
        raise FileNotFoundError(f"predictions.json not found at {PREDICTIONS_JSON}")
    with open(PREDICTIONS_JSON) as f:
        return json.load(f)


class TestFactorPredictionAlignment(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.predictions = load_predictions()

    def _top_factor_agrees(self, game: dict) -> bool:
        cards = game.get("factor_cards") or []
        if not cards:
            return True
        return cards[0].get("advantage_team") == game.get("predicted_winner")

    def test_top_factor_aligns_with_predicted_winner_90pct(self):
        """Top factor must point toward predicted winner for >=90% of games."""
        games_with_cards = [g for g in self.predictions if g.get("factor_cards")]
        self.assertGreater(len(games_with_cards), 200)
        aligned = sum(1 for g in games_with_cards if self._top_factor_agrees(g))
        rate = aligned / len(games_with_cards)
        self.assertGreaterEqual(
            rate, 0.90,
            f"Alignment {rate:.1%} ({aligned}/{len(games_with_cards)}) below 90% threshold"
        )

    def test_top_two_factors_align_with_winner_80pct(self):
        """At least one of top 2 factors must agree with winner for >=80% of games."""
        games_with_cards = [g for g in self.predictions if g.get("factor_cards")]
        agreed = sum(
            1 for g in games_with_cards
            if any(c.get("advantage_team") == g.get("predicted_winner")
                   for c in g.get("factor_cards", [])[:2])
        )
        rate = agreed / len(games_with_cards)
        self.assertGreaterEqual(rate, 0.80,
                                f"Top-2 agreement {rate:.1%} below 80%")

    def test_contribution_strength_in_unit_range(self):
        """contribution_strength must be in [0, 1]."""
        for game in self.predictions:
            for card in game.get("factor_cards", []):
                s = card.get("contribution_strength", 0)
                self.assertGreaterEqual(s, 0.0)
                self.assertLessEqual(s, 1.001,
                                     f"Strength {s} > 1 in {game.get('game_id')}")

    def test_factor_cards_have_required_fields(self):
        """Every card must have name, advantage_team, contribution_strength, explanation, status."""
        required = {"name", "advantage_team", "contribution_strength", "explanation", "status"}
        for game in self.predictions:
            for card in game.get("factor_cards", []):
                missing = required - set(card.keys())
                self.assertFalse(missing,
                                 f"Card missing {missing} in {game.get('game_id')}")

    def test_factor_explanation_contains_real_numbers(self):
        """Explanation or baseline_note must contain at least one number (not a generic placeholder)."""
        number_pattern = re.compile(r'\d+')
        for game in self.predictions:
            for card in game.get("factor_cards", []):
                text = card.get("explanation", "") + " " + card.get("baseline_note", "")
                self.assertTrue(
                    number_pattern.search(text),
                    f"No numbers in explanation for {game.get('game_id')}: '{text[:80]}'"
                )


class TestComputeFactorContributions(unittest.TestCase):
    """Unit tests for the new compute_factor_contributions() function in api.py."""

    @classmethod
    def setUpClass(cls):
        sys.path.insert(0, str(BASE_DIR))

    def test_function_exists(self):
        """compute_factor_contributions must be importable from api."""
        try:
            from src.api import compute_factor_contributions  # noqa: F401
        except ImportError:
            self.fail("compute_factor_contributions not found in src/api.py — implement it")

    def test_home_favored_market_edge(self):
        """Positive spread_line (home favored) → Market Edge advantage = home team."""
        try:
            from src.api import compute_factor_contributions
        except ImportError:
            self.skipTest("Not yet implemented")
        row = {
            "home_team": "KC", "away_team": "PHI",
            "spread_line": 3.5, "home_moneyline": -180.0, "away_moneyline": 155.0,
            "rest_diff": 0.0, "div_game": 0.0,
            "diff_last3_point_diff_pg": 0.0, "diff_last3_win_pct": 0.0,
            "diff_last3_epa_per_play": 0.0, "diff_last3_epa_per_play_allowed": 0.0,
            "diff_last3_success_rate": 0.0, "diff_last3_success_rate_allowed": 0.0,
        }
        contribs = compute_factor_contributions(row)
        market = contribs.get("Market Edge")
        self.assertIsNotNone(market, "Market Edge bucket missing")
        self.assertEqual(market["advantage_team"], "KC",
                         f"Expected KC (home+spread+ml), got {market['advantage_team']}")
        self.assertGreater(market["score"], 0)

    def test_away_favored_market_edge(self):
        """Negative spread_line (away favored) → Market Edge advantage = away team."""
        try:
            from src.api import compute_factor_contributions
        except ImportError:
            self.skipTest("Not yet implemented")
        row = {
            "home_team": "KC", "away_team": "PHI",
            "spread_line": -4.5, "home_moneyline": 170.0, "away_moneyline": -200.0,
            "rest_diff": 0.0, "div_game": 0.0,
            "diff_last3_point_diff_pg": 0.0, "diff_last3_win_pct": 0.0,
            "diff_last3_epa_per_play": 0.0, "diff_last3_epa_per_play_allowed": 0.0,
            "diff_last3_success_rate": 0.0, "diff_last3_success_rate_allowed": 0.0,
        }
        contribs = compute_factor_contributions(row)
        market = contribs.get("Market Edge")
        self.assertEqual(market["advantage_team"], "PHI")

    def test_all_five_buckets_present(self):
        """compute_factor_contributions must return exactly 5 buckets."""
        try:
            from src.api import compute_factor_contributions
        except ImportError:
            self.skipTest("Not yet implemented")
        row = {
            "home_team": "KC", "away_team": "PHI",
            "spread_line": 0.0, "home_moneyline": -110.0, "away_moneyline": -110.0,
            "rest_diff": 0.0, "div_game": 0.0,
            "diff_last3_point_diff_pg": 0.0, "diff_last3_win_pct": 0.0,
            "diff_last3_epa_per_play": 0.0, "diff_last3_epa_per_play_allowed": 0.0,
            "diff_last3_success_rate": 0.0, "diff_last3_success_rate_allowed": 0.0,
        }
        contribs = compute_factor_contributions(row)
        self.assertEqual(len(contribs), 5, f"Expected 5 buckets, got {list(contribs.keys())}")


if __name__ == "__main__":
    unittest.main(verbosity=2)
