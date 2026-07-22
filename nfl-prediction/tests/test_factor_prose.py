"""
Tests for the factor_prose reasoning layer.
Run: python3 -m unittest tests/test_factor_prose -v

These are pure-function tests over fixture contexts. They assert:
  - every field is non-empty and free of leaked placeholders (None/undefined)
  - prose is written from the advantage team's perspective
  - builders degrade gracefully when optional data is missing
"""
import sys
import unittest
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from src.factor_prose import (  # noqa: E402
    FactorContext,
    FactorProse,
    build_factor_prose,
    LedeContext,
    build_synthesis_lede,
    qb_form_note,
    _implied_prob,
    _trend_word,
    _legibility,
    _clean_record,
)

LEAK_TOKENS = ("none", "undefined", "nan", "null", "{", "}", "  ")


def _base_ctx(name: str, **overrides) -> FactorContext:
    defaults = dict(
        name=name, home="BUF", away="ARI", adv="BUF", opp="ARI",
        adv_is_home=True, contribution_strength=0.8, status="DECISIVE",
        league={"epa_mean": 0.0, "epa_std": 0.08},
    )
    defaults.update(overrides)
    return FactorContext(**defaults)


class TestProseIntegrity(unittest.TestCase):
    """No field may be empty or contain a leaked placeholder token."""

    FAMILIES = ["Market Edge", "Recent Offense", "Defensive Edge",
                "Momentum", "Game Context"]

    def _assert_clean(self, prose: FactorProse, ctx: FactorContext):
        for label, text in (("headline", prose.headline),
                            ("explanation", prose.explanation),
                            ("baseline_note", prose.baseline_note)):
            self.assertTrue(text and text.strip(),
                            f"{ctx.name}: {label} is empty")
            low = text.lower()
            for tok in LEAK_TOKENS:
                self.assertNotIn(tok, low,
                                 f"{ctx.name}: {label} leaked {tok!r}: {text!r}")

    def test_full_data_all_families_clean(self):
        rich = dict(
            spread=6.5, home_ml=-260, away_ml=210,
            season_epa=0.04, last3_epa=0.09,
            season_epa_allowed=0.05, last3_epa_allowed=0.08,
            season_sr=0.03, last3_sr=0.05,
            last3_winpct=0.34, last3_ptdiff=6.0,
            adv_last3_epa=0.12, opp_last3_epa=-0.03,
            adv_pts_for=27.0, adv_pts_ag=17.0,
            adv_last3_rec="3-0 last 3", opp_last3_rec="1-2 last 3",
            adv_season_rec="9-3", adv_qb="J.Allen", opp_qb="K.Murray",
            adv_pressure_gen=0.28, adv_pressure_faced=0.18,
            opp_pressure_faced=0.34,
            rest_diff=4.0, div_game=True,
            wind_mph=22.0, temp_f=34.0, wind_tier="high",
            wind_consequence="deep passing and kicking accuracy drop off",
            roof="outdoors", stadium="Highmark Stadium",
        )
        for fam in self.FAMILIES:
            ctx = _base_ctx(fam, **rich)
            prose = build_factor_prose(ctx)
            self._assert_clean(prose, ctx)

    def test_missing_optional_data_all_families_clean(self):
        """Sparse context: no players, records, pressure, weather, baselines."""
        sparse = dict(
            spread=0.0, home_ml=0, away_ml=0,
            adv_last3_epa=None, opp_last3_epa=None,
            adv_pts_for=None, adv_pts_ag=None,
            adv_last3_rec="", opp_last3_rec="", adv_season_rec="",
            adv_qb="", opp_qb="",
            adv_pressure_gen=None, adv_pressure_faced=None,
            opp_pressure_faced=None,
            rest_diff=0.0, div_game=False,
            wind_mph=0.0, temp_f=None, wind_tier="calm",
            wind_consequence="", roof="", stadium="",
            league={},
        )
        for fam in self.FAMILIES:
            ctx = _base_ctx(fam, **sparse)
            prose = build_factor_prose(ctx)
            self._assert_clean(prose, ctx)

    def test_away_advantage_perspective(self):
        """When the away team has the edge, prose names the away team."""
        ctx = _base_ctx(
            "Recent Offense", adv="ARI", opp="BUF", adv_is_home=False,
            last3_epa=-0.09, season_epa=-0.04, last3_sr=-0.05,
            adv_last3_epa=0.11, adv_qb="K.Murray", opp_qb="J.Allen",
        )
        prose = build_factor_prose(ctx)
        self.assertIn("ARI", prose.explanation)
        # The advantage clause should not claim BUF is more efficient
        self.assertTrue(prose.explanation.startswith("Over the last three weeks ARI"))

    def test_unknown_factor_falls_back(self):
        ctx = _base_ctx("Special Teams")
        prose = build_factor_prose(ctx)
        self.assertIn("BUF", prose.headline)
        self.assertTrue(prose.explanation)


class TestFamilySpecifics(unittest.TestCase):

    def test_market_agreement_vs_divergence(self):
        agree = build_factor_prose(_base_ctx(
            "Market Edge", adv="BUF", spread=6.5, home_ml=-260, away_ml=210))
        self.assertIn("Vegas", agree.explanation)
        self.assertIn("%", agree.baseline_note)  # implied probability rendered

        # Model on away team while spread favors home -> divergence language
        diverge = build_factor_prose(_base_ctx(
            "Market Edge", adv="ARI", opp="BUF", adv_is_home=False,
            spread=6.5, home_ml=-260, away_ml=210))
        self.assertIn("other side", diverge.explanation.lower())

    def test_defensive_pressure_optional(self):
        with_p = build_factor_prose(_base_ctx(
            "Defensive Edge", last3_epa_allowed=0.10, adv_pressure_gen=0.30,
            opp_qb="K.Murray"))
        self.assertIn("30%", with_p.explanation)
        no_p = build_factor_prose(_base_ctx(
            "Defensive Edge", last3_epa_allowed=0.10, adv_pressure_gen=None,
            opp_qb="K.Murray"))
        self.assertNotIn("pressure on", no_p.baseline_note.lower())

    def test_momentum_uses_records(self):
        prose = build_factor_prose(_base_ctx(
            "Momentum", adv_last3_rec="3-0 last 3", opp_last3_rec="1-2 last 3",
            last3_ptdiff=7.0, last3_winpct=0.34))
        self.assertIn("3-0", prose.explanation)
        self.assertIn("1-2", prose.explanation)
        self.assertNotIn("last 3", prose.baseline_note)  # suffix stripped

    def test_game_context_rest_headline(self):
        prose = build_factor_prose(_base_ctx(
            "Game Context", rest_diff=6.0, div_game=False, wind_tier="calm"))
        self.assertIn("Rest", prose.headline)
        self.assertIn("BUF", prose.explanation)


class TestHelpers(unittest.TestCase):

    def test_implied_prob(self):
        self.assertAlmostEqual(_implied_prob(-200), 200 / 300, places=4)
        self.assertAlmostEqual(_implied_prob(150), 100 / 250, places=4)
        self.assertIsNone(_implied_prob(0))
        self.assertIsNone(_implied_prob(None))

    def test_trend_word(self):
        # home advantage, last3 edge bigger than season -> widening
        self.assertEqual(_trend_word(0.02, 0.08, True, 0.02), "widening")
        self.assertEqual(_trend_word(0.08, 0.02, True, 0.02), "narrowing")
        self.assertEqual(_trend_word(0.05, 0.05, True, 0.02), "steady")

    def test_legibility_bands(self):
        self.assertEqual(_legibility(0.10, 0.0, 0.08), "elite")
        self.assertEqual(_legibility(0.0, 0.0, 0.08), "middle-of-the-pack")
        self.assertEqual(_legibility(-0.10, 0.0, 0.08), "bottom-tier")
        self.assertEqual(_legibility(None, 0.0, 0.08), "")
        self.assertEqual(_legibility(0.1, 0.0, 0), "")

    def test_clean_record(self):
        self.assertEqual(_clean_record("2-1 last 3"), "2-1")
        self.assertEqual(_clean_record(""), "")


def _card(name, adv, headline, baseline, status="DECISIVE"):
    return {"name": name, "advantage_team": adv, "status": status,
            "headline": headline, "baseline_note": baseline,
            "contribution_strength": 0.5}


class TestSynthesisLede(unittest.TestCase):

    QB_LEAGUE = {"epa_mean": 0.04, "epa_std": 0.13}

    def _clean(self, text):
        self.assertTrue(text and text.strip())
        low = text.lower()
        for tok in ("none", "undefined", "nan", "null", "{", "}", "  "):
            self.assertNotIn(tok, low, f"lede leaked {tok!r}: {text!r}")

    def test_market_primary_elevates_football_lead(self):
        primary = _card("Market Edge", "BUF", "The market leans BUF.",
                        "Vegas priced BUF as a 6.5-point favorite.")
        lead = _card("Defensive Edge", "BUF", "BUF's defense is the tougher unit.",
                     "BUF allow 0.07 fewer EPA/play than ARI.")
        risk = _card("Recent Offense", "ARI", "ARI still move the ball.",
                     "ARI produce +0.12 EPA/play — elite.", status="MODERATE")
        lede = build_synthesis_lede(LedeContext(
            winner="BUF", opponent="ARI", probability=0.73,
            primary=primary, football_lead=lead, secondary=None, risk=risk,
            winner_qb="J.Allen", winner_qb_epa=0.26, qb_league=self.QB_LEAGUE,
            spread_desc="a 6.5-point favorite"))
        self._clean(lede)
        self.assertIn("Clark", lede)
        self.assertIn("BUF", lede)
        self.assertIn("signal Clark keeps coming back to", lede)
        self.assertIn("J.Allen", lede)                 # A4 QB note fired
        self.assertIn("could turn it", lede)            # risk clause present

    def test_no_risk_uses_variance_fallback(self):
        primary = _card("Momentum", "KC", "KC are trending up.",
                        "Last three: KC 3-0, DEN 1-2.")
        lede = build_synthesis_lede(LedeContext(
            winner="KC", opponent="DEN", probability=0.61,
            primary=primary, football_lead=primary, secondary=None, risk=None))
        self._clean(lede)
        self.assertIn("plain variance", lede)

    def test_qb_note_suppressed_for_average_qb(self):
        # epa at the mean -> middle-of-the-pack -> no note
        note = qb_form_note(LedeContext(
            winner="X", opponent="Y", probability=0.6,
            winner_qb="A.Average", winner_qb_epa=0.04, qb_league=self.QB_LEAGUE))
        self.assertEqual(note, "")

    def test_qb_note_fires_for_elite_qb(self):
        note = qb_form_note(LedeContext(
            winner="X", opponent="Y", probability=0.6,
            winner_qb="J.Allen", winner_qb_epa=0.26, qb_league=self.QB_LEAGUE))
        self.assertIn("J.Allen", note)
        self.assertIn("this season", note)

    def test_conviction_scales_with_probability(self):
        primary = _card("Market Edge", "SF", "The market leans SF.",
                        "Vegas priced SF as a 9-point favorite.")
        strong = build_synthesis_lede(LedeContext(
            winner="SF", opponent="CHI", probability=0.80, primary=primary))
        weak = build_synthesis_lede(LedeContext(
            winner="SF", opponent="CHI", probability=0.52, primary=primary))
        self.assertIn("confident in SF", strong)
        self.assertIn("slight edge to SF", weak)


if __name__ == "__main__":
    unittest.main()
