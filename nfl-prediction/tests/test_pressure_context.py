"""
Tests for build_pressure_context.py
Run: .venv/bin/python3 -m unittest tests.test_pressure_context -v
"""
import json
import sys
import unittest
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
OUTPUT   = BASE_DIR / "data" / "processed" / "pressure_context.json"


class TestPressureContextOutput(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        if not OUTPUT.exists():
            raise unittest.SkipTest("pressure_context.json not built yet — run build_pressure_context.py")
        with open(OUTPUT) as f:
            cls.data = json.load(f)

    def test_output_is_dict_keyed_by_game_id(self):
        self.assertIsInstance(self.data, dict)
        self.assertGreater(len(self.data), 200, "Expected ≥200 games")

    def test_each_game_has_two_team_entries(self):
        for game_id, teams in list(self.data.items())[:20]:
            self.assertEqual(len(teams), 2, f"{game_id} has {len(teams)} team entries, expected 2")

    def test_each_team_has_required_rate_fields(self):
        required = {"pressure_generated_rate", "pressure_faced_rate", "dropbacks_defended", "dropbacks_faced"}
        for game_id, teams in list(self.data.items())[:20]:
            for team, stats in teams.items():
                missing = required - set(stats.keys())
                self.assertFalse(missing, f"{game_id}/{team} missing {missing}")

    def test_rates_are_in_unit_range(self):
        for game_id, teams in self.data.items():
            for team, stats in teams.items():
                for field in ("pressure_generated_rate", "pressure_faced_rate"):
                    v = stats.get(field)
                    if v is not None:
                        self.assertGreaterEqual(v, 0.0, f"{game_id}/{team}/{field} < 0")
                        self.assertLessEqual(v, 1.0, f"{game_id}/{team}/{field} > 1")

    def test_dropback_counts_are_positive(self):
        for game_id, teams in list(self.data.items())[:50]:
            for team, stats in teams.items():
                for field in ("dropbacks_defended", "dropbacks_faced"):
                    v = stats.get(field, 0)
                    self.assertGreaterEqual(v, 0, f"{game_id}/{team}/{field} negative")


class TestBuildPressureContextImport(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        sys.path.insert(0, str(BASE_DIR))

    def test_module_importable(self):
        try:
            import src.build_pressure_context  # noqa: F401
        except ImportError as e:
            self.fail(f"Cannot import build_pressure_context: {e}")

    def test_build_function_exists(self):
        try:
            from src.build_pressure_context import build_pressure_context
            self.assertTrue(callable(build_pressure_context))
        except ImportError as e:
            self.fail(f"build_pressure_context() not found: {e}")


if __name__ == "__main__":
    unittest.main(verbosity=2)
