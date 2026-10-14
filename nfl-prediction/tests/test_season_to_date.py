"""
season_* features: this season so far, shrunk toward last season.
Run: python3 -m pytest tests/test_season_to_date.py -q
"""
import sys
import unittest
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from src.build_team_game_stats import add_season_to_date  # noqa: E402


def frame() -> pd.DataFrame:
    # Team A: 2023 averages 10 (two games), 2024 plays 20, 30, then two unplayed fixtures.
    return pd.DataFrame({
        "team":   ["A"] * 6,
        "season": [2023, 2023, 2024, 2024, 2024, 2024],
        "is_played": [True, True, True, True, False, False],
        "x": [8.0, 12.0, 20.0, 30.0, None, None],
    })


class TestSeasonToDate(unittest.TestCase):

    def test_formula_and_carry_forward(self):
        df = frame()
        add_season_to_date(df, {"season_x": "x"}, prior_games=2)
        s = df["season_x"].tolist()
        # Week 1 of 2024: no games yet -> last season's mean.
        self.assertAlmostEqual(s[2], 10.0)
        # After one game (20): (20 + 2*10) / 3.
        self.assertAlmostEqual(s[3], 40 / 3)
        # Unplayed fixtures see both played games: (50 + 20) / 4, and don't move.
        self.assertAlmostEqual(s[4], 17.5)
        self.assertAlmostEqual(s[5], 17.5)

    def test_first_season_uses_league_average(self):
        df = frame()
        add_season_to_date(df, {"season_x": "x"}, prior_games=2)
        # 2023 game 1: no prior season -> 2023 league mean (10).
        self.assertAlmostEqual(df["season_x"].iloc[0], 10.0)

    def test_no_leakage_of_the_current_game(self):
        df = frame()
        add_season_to_date(df, {"season_x": "x"}, prior_games=2)
        # Changing a game's own value must not change its feature.
        df2 = frame()
        df2.loc[3, "x"] = 999.0
        add_season_to_date(df2, {"season_x": "x"}, prior_games=2)
        self.assertAlmostEqual(df["season_x"].iloc[3], df2["season_x"].iloc[3])


if __name__ == "__main__":
    unittest.main()
