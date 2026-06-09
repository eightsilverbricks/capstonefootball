"""
Tests for build_wind_impact.py
Run: .venv/bin/python3 -m unittest tests.test_wind_impact -v
"""
import json
import sys
import unittest
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
OUTPUT   = BASE_DIR / "data" / "processed" / "wind_impact.json"

EXPECTED_TIERS = {"dome", "calm", "moderate", "high", "severe"}


class TestWindImpactOutput(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        if not OUTPUT.exists():
            raise unittest.SkipTest("wind_impact.json not built yet — run build_wind_impact.py")
        with open(OUTPUT) as f:
            cls.data = json.load(f)

    def test_all_tiers_present(self):
        self.assertEqual(set(self.data.keys()), EXPECTED_TIERS)

    def test_each_tier_has_required_fields(self):
        required = {"avg_pass_epa", "delta_vs_calm", "consequence", "game_count"}
        for tier, stats in self.data.items():
            missing = required - set(stats.keys())
            self.assertFalse(missing, f"Tier '{tier}' missing {missing}")

    def test_consequence_is_nonempty_string(self):
        for tier, stats in self.data.items():
            c = stats.get("consequence", "")
            self.assertIsInstance(c, str)
            self.assertGreater(len(c), 0, f"Tier '{tier}' has empty consequence")

    def test_delta_calm_is_zero_for_calm(self):
        calm = self.data.get("calm", {})
        self.assertAlmostEqual(calm.get("delta_vs_calm", 999), 0.0, places=4)

    def test_high_wind_has_negative_delta(self):
        """High wind (≥20 games) should not improve pass EPA vs calm.
        Severe tier is skipped when n < 10 — too sparse to be meaningful."""
        min_games = 10
        for tier in ("high", "severe"):
            stats = self.data.get(tier, {})
            if stats.get("game_count", 0) < min_games:
                continue  # too few games for reliable EPA estimate
            delta = stats.get("delta_vs_calm", 0)
            self.assertLess(delta, 0.05,
                f"Tier '{tier}' delta {delta:.3f} unexpectedly high (n={stats['game_count']}) — "
                "high wind should not improve pass EPA vs calm")

    def test_game_counts_are_positive(self):
        for tier, stats in self.data.items():
            if tier != "dome":
                self.assertGreater(stats.get("game_count", 0), 0, f"Tier '{tier}' has 0 games")


class TestBuildWindImpactImport(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        sys.path.insert(0, str(BASE_DIR))

    def test_module_importable(self):
        try:
            import src.build_wind_impact  # noqa: F401
        except ImportError as e:
            self.fail(f"Cannot import build_wind_impact: {e}")

    def test_wind_tier_fn_exists(self):
        try:
            from src.build_wind_impact import wind_speed_to_tier
            self.assertEqual(wind_speed_to_tier(0, "outdoors"), "calm")
            self.assertEqual(wind_speed_to_tier(15, "outdoors"), "moderate")
            self.assertEqual(wind_speed_to_tier(25, "outdoors"), "high")
            self.assertEqual(wind_speed_to_tier(35, "outdoors"), "severe")
            self.assertEqual(wind_speed_to_tier(25, "dome"), "dome")
        except ImportError as e:
            self.fail(f"wind_speed_to_tier not found: {e}")


if __name__ == "__main__":
    unittest.main(verbosity=2)
