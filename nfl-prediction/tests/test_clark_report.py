"""
Tests for the in-depth Clark Report: league ranks, the template report, and
the guard rails on the optional AI rewrite.
Run: python3 -m pytest tests/test_clark_report.py -q
"""
import copy
import json
import sys
import unittest
from pathlib import Path
from unittest import mock

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from src import clark_llm  # noqa: E402
from src.clark_report import build_clark_report, first_person, lower_first  # noqa: E402
from src.team_ranks import league_ranks, ordinal  # noqa: E402
from src.validate_report import validate_game  # noqa: E402

DEMO = BASE_DIR.parent / "primary-ui" / "public" / "predictions-2024.json"


def _demo_game(week: int = 8) -> dict:
    games = json.loads(DEMO.read_text(encoding="utf-8"))
    return copy.deepcopy(next(g for g in games if g["week"] == week))


class TestRanks(unittest.TestCase):

    def test_ordinals(self):
        self.assertEqual([ordinal(n) for n in (1, 2, 3, 4, 11, 12, 13, 21, 22, 32)],
                         ["1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "22nd", "32nd"])

    def test_early_weeks_fall_back_to_last_season(self):
        ranks = league_ranks(2024, 2)
        self.assertEqual(ranks["basis"]["kind"], "last_season")
        self.assertEqual(ranks["basis"]["season"], 2023)

    def test_midseason_uses_this_season_and_ranks_all_32(self):
        ranks = league_ranks(2024, 8)
        self.assertEqual(ranks["basis"]["kind"], "season")
        self.assertEqual(len(ranks["teams"]), 32)
        points = sorted(t["points"]["rank"] for t in ranks["teams"].values())
        self.assertEqual(points[0], 1)
        # Lower is better for points allowed: rank 1 allows the fewest.
        best = min(ranks["teams"].values(), key=lambda t: t["points_allowed"]["value"])
        self.assertEqual(best["points_allowed"]["rank"], 1)


class TestTemplateReport(unittest.TestCase):

    def test_report_is_complete_and_passes_the_validator(self):
        game = _demo_game()
        report = build_clark_report(game)
        for key in ("headline", "dek", "intro", "deciding", "other_side", "underdog",
                    "change_my_mind", "meaning", "numbers", "signoff"):
            self.assertTrue(report[key], key)
        self.assertEqual(validate_game({**game, "clark_report": report}), [])

    def test_meaning_matches_the_pick(self):
        game = _demo_game()
        report = build_clark_report(game)
        prob = game["home_win_prob"] if game["predicted_winner"] == game["home_team"] else game["away_win_prob"]
        self.assertEqual(report["meaning"]["pct"], round(prob * 100))
        self.assertIn(f"win {100 - report['meaning']['pct']}", report["meaning"]["body"])

    def test_deciding_matchup_involves_the_pick(self):
        game = _demo_game()
        table = build_clark_report(game)["deciding"]["table"]
        self.assertIn(game["predicted_winner"], (table["offense_team"], table["defense_team"]))

    def test_unknown_team_returns_none(self):
        game = _demo_game()
        game["home_team"] = "XXX"
        self.assertIsNone(build_clark_report(game))

    def test_voice_helpers(self):
        self.assertEqual(first_person("Worth 6.5 points in Clark's model."), "Worth 6.5 points in my model.")
        self.assertEqual(lower_first("LA have been better."), "LA have been better.")
        self.assertEqual(lower_first("The defenses are even."), "the defenses are even.")


class TestAiGuardRails(unittest.TestCase):

    def setUp(self):
        self.game = _demo_game()
        self.report = build_clark_report(self.game)
        self.fields = {
            "headline": self.report["headline"],
            "dek": self.report["dek"],
            "intro": ["I love this one."],
            "deciding_body": self.report["deciding"]["body"],
            "other_side_body": self.report["other_side"]["body"],
            "signoff": "Not a lock! I could be wrong.",
        }

    def test_clean_rewrite_is_accepted(self):
        merged = clark_llm.accept(self.game, self.report, self.fields)
        self.assertEqual(merged["source"], "gemini")
        self.assertEqual(merged["intro"], ["I love this one."])
        self.assertEqual(merged["numbers"], self.report["numbers"])

    def test_made_up_number_is_rejected(self):
        bad = {**self.fields, "dek": "They have scored 977 points this year."}
        self.assertIsNone(clark_llm.accept(self.game, self.report, bad))

    def test_jargon_is_rejected(self):
        bad = {**self.fields, "intro": ["Their EPA is great."]}
        self.assertIsNone(clark_llm.accept(self.game, self.report, bad))

    def test_wrong_shape_is_rejected(self):
        self.assertIsNone(clark_llm.accept(self.game, self.report, {"headline": "Hi"}))
        self.assertIsNone(clark_llm.accept(self.game, self.report, {**self.fields, "intro": []}))

    def test_no_key_means_no_call_and_template_stays(self):
        game = {**self.game, "clark_report": self.report}
        with mock.patch.dict("os.environ", {"GEMINI_API_KEY": ""}), \
             mock.patch.object(clark_llm, "_load_cache", return_value={}), \
             mock.patch.object(clark_llm, "_call_gemini") as call:
            stats = clark_llm.polish_reports([game], {str(game["game_id"])})
        call.assert_not_called()
        self.assertEqual(game["clark_report"]["source"], "template")
        self.assertEqual(stats["generated"], 0)

    def test_api_failure_keeps_the_template(self):
        game = {**self.game, "clark_report": self.report}
        with mock.patch.dict("os.environ", {"GEMINI_API_KEY": "test"}), \
             mock.patch.object(clark_llm, "_load_cache", return_value={}), \
             mock.patch.object(clark_llm, "_call_gemini", side_effect=OSError("quota")):
            stats = clark_llm.polish_reports([game], {str(game["game_id"])})
        self.assertEqual(stats["failed"], 1)
        self.assertEqual(game["clark_report"]["source"], "template")

    def test_good_response_is_used_and_cached(self):
        game = {**self.game, "clark_report": self.report}
        with mock.patch.dict("os.environ", {"GEMINI_API_KEY": "test"}), \
             mock.patch.object(clark_llm, "_load_cache", return_value={}), \
             mock.patch.object(clark_llm, "_call_gemini", return_value=self.fields), \
             mock.patch.object(clark_llm, "CACHE_PATH") as cache_path:
            stats = clark_llm.polish_reports([game], {str(game["game_id"])})
        self.assertEqual(stats["generated"], 1)
        self.assertEqual(game["clark_report"]["source"], "gemini")
        cache_path.write_text.assert_called_once()

    def test_ineligible_games_are_skipped(self):
        game = {**self.game, "clark_report": self.report}
        with mock.patch.dict("os.environ", {"GEMINI_API_KEY": "test"}), \
             mock.patch.object(clark_llm, "_call_gemini") as call:
            clark_llm.polish_reports([game], set())
        call.assert_not_called()


if __name__ == "__main__":
    unittest.main()
