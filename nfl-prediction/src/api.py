"""
NFL Matchup Lab — FastAPI backend
==================================
Data mode: historical_backtest (2024 season)
Model:      Logistic Regression, 71.2% accuracy on expanding-window backtest
Trained on: 2018–2023 seasons (1,640 games), evaluated on 2024 (285 games)

See the TODO block below for the live-season upgrade path.
"""

from pathlib import Path
import json
import math
import joblib
import pandas as pd
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

BASE_DIR             = Path(__file__).resolve().parent.parent
MODEL_PATH           = BASE_DIR / "models" / "logreg_model.joblib"
DATA_PATH            = BASE_DIR / "data" / "processed" / "game_training_table.csv"
SCHEDULE_DATES_PATH  = BASE_DIR / "data" / "processed" / "schedule_dates.csv"
PREDICTIONS_PATH     = BASE_DIR / "outputs" / "predictions.csv"
METRICS_PATH         = BASE_DIR / "outputs" / "metrics.json"
PLAYER_CONTEXT_PATH  = BASE_DIR / "data" / "processed" / "player_context.json"

# ---------------------------------------------------------------------------
# Feature sets — must match train_model.py exactly
# ---------------------------------------------------------------------------

FEATURES = [
    "rest_diff", "div_game", "spread_line", "home_moneyline", "away_moneyline",
    "diff_season_turnover_diff_pg", "diff_season_epa_per_play",
    "diff_season_epa_per_play_allowed", "diff_season_success_rate",
    "diff_season_success_rate_allowed", "diff_season_pass_epa_per_play",
    "diff_season_rush_epa_per_play", "diff_season_qb_epa_per_play",
    "diff_season_cpoe", "diff_last3_turnover_diff_pg", "diff_last3_epa_per_play",
    "diff_last3_success_rate", "diff_last3_pass_epa_per_play",
    "diff_last3_qb_epa_per_play", "match_season_pass_off_vs_def",
    "match_season_success_off_vs_def", "match_season_sack_pressure",
    "match_season_qb_vs_def", "match_last3_pass_off_vs_def",
    "match_last3_success_off_vs_def", "match_last3_sack_pressure",
    "match_last3_qb_vs_def", "home_field",
]

PRODUCTION_FEATURES = [
    "spread_line", "home_moneyline", "away_moneyline",
    "rest_diff", "div_game", "home_field",
    "diff_last3_point_diff_pg", "diff_last3_win_pct",
    "diff_last3_epa_per_play", "diff_last3_epa_per_play_allowed",
    "diff_last3_success_rate", "diff_last3_success_rate_allowed",
]

PRODUCTION_MODEL_NAME = "market_context_recent_form"

# ---------------------------------------------------------------------------
# Data mode + model metadata
# ---------------------------------------------------------------------------

DATA_MODE = "historical_backtest"

CURRENT_SEASON_READY_NOTE = (
    "This version runs on historical backtest data. During a live season, "
    "the same pipeline refreshes weekly using current nflfastR/nflverse data — "
    "only games already played are used to build features."
)

PREDICTION_VERSION = "game_diagnosis_engine_v1"
SEASON_MODE = "historical_expanding_backtest"

# Real metrics loaded from outputs/metrics.json
def _load_model_meta() -> dict:
    if METRICS_PATH.exists():
        with open(METRICS_PATH) as f:
            m = json.load(f)
        accuracy_pct = f"{m.get('accuracy', 0) * 100:.1f}%"
        train_seasons = m.get("train_seasons", [])
        test_season   = m.get("test_season", "")
    else:
        accuracy_pct   = "71.2%"
        train_seasons  = [2018, 2019, 2020, 2021, 2022, 2023]
        test_season    = 2024

    return {
        "model_type":        "Logistic Regression (scikit-learn)",
        "accuracy":          accuracy_pct,
        "train_seasons":     train_seasons,
        "test_season":       test_season,
        "n_train_games":     1640,
        "n_test_games":      285,
        "evaluation_method": "Expanding-window weekly validation — trained on all prior weeks, predicted each week forward",
        "feature_categories": [
            "QB EPA per play (season + last 3 games)",
            "Turnover differential per game",
            "Offensive EPA per play",
            "Defensive EPA allowed per play",
            "Pass pressure matchup (sack rates)",
            "Vegas spread & moneyline (context only)",
        ],
        "market_note": (
            "Vegas spread and moneyline are included as model inputs because they encode "
            "information the model can't fully capture from box-score stats alone. "
            "However, all explanations prioritize football factors over market signals."
        ),
        "mode": DATA_MODE,
    }

MODEL_META = _load_model_meta()

# ---------------------------------------------------------------------------
# TODO: live-season mode upgrade path
#
# 1. Load latest nflfastR schedules weekly
# 2. Separate completed games from upcoming games
# 3. Rebuild rolling team features only from completed games
# 4. Generate matchup rows for upcoming games (no final scores needed)
# 5. Use saved model to predict upcoming games
# 6. Return data_mode = "live_weekly_prediction"
#
# The API response shape already supports both modes.
# ---------------------------------------------------------------------------

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------

app = FastAPI(title="NFL Matchup Lab API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", "http://127.0.0.1:5173",
        "http://localhost:5174", "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

df          = pd.read_csv(DATA_PATH)
schedule_df = pd.read_csv(SCHEDULE_DATES_PATH) if SCHEDULE_DATES_PATH.exists() else pd.DataFrame()
model       = joblib.load(MODEL_PATH)

# Player context: {season: {team: {qb: {...}, rb: {...}, ...}}}
if PLAYER_CONTEXT_PATH.exists():
    with open(PLAYER_CONTEXT_PATH) as _f:
        PLAYER_CONTEXT: dict = json.load(_f)
else:
    PLAYER_CONTEXT = {}


def get_player_context(season: int, team: str) -> dict:
    """Returns player context for a team-season, or empty defaults."""
    return PLAYER_CONTEXT.get(str(season), {}).get(team, {
        "qb": {"name": None, "epa_per_att": 0.0, "cpoe": None},
        "rb": {"name": None, "carries": 0, "ypc": 0.0},
    })


# ===========================================================================
# Utilities
# ===========================================================================

def safe_get(row: dict, col: str, default: float = 0.0) -> float:
    val = row.get(col)
    if val is None:
        return default
    try:
        fval = float(val)
        return default if (math.isnan(fval) or math.isinf(fval)) else fval
    except (TypeError, ValueError):
        return default


def clean_record(record: dict) -> dict:
    return {
        k: (None if isinstance(v, float) and (math.isnan(v) or math.isinf(v)) else v)
        for k, v in record.items()
    }


# ===========================================================================
# Helper 1 — Confidence
# ===========================================================================

def get_confidence(prob: float) -> tuple[str, float]:
    """
    Low:    edge < 0.08   (winner < 58% probability)
    Medium: 0.08 ≤ edge < 0.15
    High:   edge ≥ 0.15   (winner > 65% probability)
    """
    edge = abs(prob - 0.5)
    if edge >= 0.15:
        label = "High"
    elif edge >= 0.08:
        label = "Medium"
    else:
        label = "Low"
    return label, round(min(edge * 200, 100.0), 1)


# ===========================================================================
# Helper 2 — Team advantage from signed diff value
# ===========================================================================

def get_team_advantage(value: float, home_team: str, away_team: str) -> str:
    """positive → home, negative → away (all diff cols are home minus away)"""
    if value > 0:
        return home_team
    elif value < 0:
        return away_team
    return "Even"


def get_opponent(advantage_team: str, home_team: str, away_team: str) -> str:
    return away_team if advantage_team == home_team else home_team


# ===========================================================================
# Helper 3 — Factor magnitude descriptor
# ===========================================================================

def magnitude_word(score: float) -> str:
    """Human-readable strength label for use inside reason sentences."""
    if score >= 8:
        return "significantly"
    if score >= 6:
        return "meaningfully"
    if score >= 4:
        return "modestly"
    return "slightly"


def factor_tier(score: float) -> str:
    """
    strong  ≥ 7  → green, used in explanations
    medium  4–6.9 → amber, used in explanations
    weak    < 4   → gray, labeled 'Minor Factor', excluded from explanations
    """
    if score >= 7:
        return "strong"
    if score >= 4:
        return "medium"
    return "weak"


# ===========================================================================
# Helper 4 — Build a single factor object
# ===========================================================================

def build_factor(
    name: str,
    value: float,
    home_team: str,
    away_team: str,
    reason_template: str,
    max_val: float = 0.2,
) -> dict:
    """
    reason_template placeholders:
      {team}      — the team with the advantage
      {opponent}  — the other team
      {value}     — absolute value of the diff
      {magnitude} — 'significantly' / 'meaningfully' / 'modestly' / 'slightly'
      {home}      — home team abbr
      {away}      — away team abbr
    """
    adv  = get_team_advantage(value, home_team, away_team)
    opp  = get_opponent(adv, home_team, away_team)
    sc   = round(min(abs(value) / max_val * 10, 10.0), 1)
    mag  = magnitude_word(sc)
    tier = factor_tier(sc)

    reason = reason_template.format(
        team=adv, opponent=opp, value=abs(value),
        magnitude=mag, home=home_team, away=away_team,
    )
    return {
        "name":           name,
        "advantage_team": adv,
        "opponent":       opp,
        "score":          sc,
        "tier":           tier,
        "reason":         reason,
    }


# ===========================================================================
# Helper 5 — Build all five football factors
# ===========================================================================

def build_football_factors(row: dict) -> list[dict]:
    """
    Five factors, all using home-minus-away sign convention (positive = home advantage).
    Defensive-allowed and sack-pressure columns are sign-inverted before use.

    Columns used
    ─────────────────────────────────────────────────────────────
    QB Efficiency:         diff_season_qb_epa_per_play + diff_last3_qb_epa_per_play
    Turnover Edge:         diff_season_turnover_diff_pg + diff_last3_turnover_diff_pg
    Offensive Efficiency:  diff_season_epa_per_play + diff_last3_epa_per_play
    Defensive Resistance:  diff_season_epa_per_play_allowed (negated)
    Pressure Matchup:      match_season_sack_pressure + match_last3_sack_pressure (negated)
    """
    home, away = row["home_team"], row["away_team"]

    # QB Efficiency
    qb_val = (safe_get(row, "diff_season_qb_epa_per_play")
              + safe_get(row, "diff_last3_qb_epa_per_play")) / 2
    qb = build_factor(
        "QB Efficiency", qb_val, home, away,
        "{team}'s QB efficiency is {magnitude} higher than {opponent}'s this season "
        "({value:.3f} EPA/play difference) — a gap that shapes drive consistency and big-play rate.",
        max_val=0.25,
    )

    # Turnover Edge
    to_val = (safe_get(row, "diff_season_turnover_diff_pg")
              + safe_get(row, "diff_last3_turnover_diff_pg")) / 2
    to = build_factor(
        "Turnover Edge", to_val, home, away,
        "{team} wins the turnover battle {magnitude} — a {value:.2f} turnover-per-game edge "
        "that creates shorter fields and extra possessions.",
        max_val=1.5,
    )

    # Offensive Efficiency
    off_val = (safe_get(row, "diff_season_epa_per_play")
               + safe_get(row, "diff_last3_epa_per_play")) / 2
    off = build_factor(
        "Offensive Efficiency", off_val, home, away,
        "{team}'s offense generates {magnitude} more expected points per play than {opponent}'s "
        "({value:.3f} EPA/play difference), keeping drives alive and converting more consistently.",
        max_val=0.2,
    )

    # Defensive Resistance (negate: positive diff_allowed = home allows MORE → away advantage)
    def_val = -safe_get(row, "diff_season_epa_per_play_allowed")
    defs = build_factor(
        "Defensive Resistance", def_val, home, away,
        "{team}'s defense is {magnitude} more stingy than {opponent}'s — "
        "allowing {value:.3f} fewer EPA per play and limiting opponent scoring opportunities.",
        max_val=0.2,
    )

    # Pressure Matchup (negate: positive raw = home OL more vulnerable → away pass rush wins)
    pres_raw = (safe_get(row, "match_season_sack_pressure")
                + safe_get(row, "match_last3_sack_pressure")) / 2
    pres = build_factor(
        "Pressure Matchup", -pres_raw, home, away,
        "{team} wins the pass rush vs. protection battle {magnitude} "
        "({value:.3f} sack-rate edge) — a mismatch that can collapse key third-down drives.",
        max_val=0.08,
    )

    return [qb, to, off, defs, pres]


# ===========================================================================
# Helper 6 — Key battle
# ===========================================================================

def build_key_battle(row: dict, factors: list[dict]) -> str:
    top = max(factors, key=lambda f: f["score"])
    opp = top["opponent"]
    return (
        f"{top['name']}: {top['advantage_team']} has the clearest edge over {opp} — "
        f"score {top['score']:.1f}/10."
    )


# ===========================================================================
# Helper 7 — Football-first explanation (skips weak factors)
# ===========================================================================

def build_explanation(row: dict, factors: list[dict]) -> str:
    """
    Uses only strong/medium factors. Falls back to top 2 if everything is weak.
    Language is team-specific and magnitude-aware throughout.
    """
    winner = row["predicted_winner"]

    # Prefer strong, then medium; fall back to top 2 by score
    decisive = [f for f in factors if f["tier"] in ("strong", "medium")]
    if not decisive:
        decisive = sorted(factors, key=lambda f: f["score"], reverse=True)[:2]
    top2 = sorted(decisive, key=lambda f: f["score"], reverse=True)[:2]

    if len(top2) == 1:
        f1 = top2[0]
        return (
            f"The model projects {winner} to win, driven primarily by {f1['name']}: "
            f"{f1['reason']}"
        )

    f1, f2 = top2
    return (
        f"The model projects {winner} to win based on two decisive football factors. "
        f"First, {f1['name']}: {f1['reason']} "
        f"Second, {f2['name']}: {f2['reason']}"
    )


# ===========================================================================
# Helper 8 — Market note
# ===========================================================================

def build_market_note(row: dict, factors: list[dict]) -> str:
    spread  = safe_get(row, "spread_line")
    home_ml = safe_get(row, "home_moneyline")
    home, away, winner = row["home_team"], row["away_team"], row["predicted_winner"]

    has_spread = abs(spread) > 0.1
    has_ml     = abs(home_ml) > 1

    if not has_spread and not has_ml:
        return "Market comparison unavailable for this game."

    if has_spread:
        market_fav  = home if spread > 0 else away
        spread_desc = f"a {abs(spread):.1f}-point spread"
    else:
        market_fav  = home if home_ml < 0 else away
        spread_desc = "the moneyline"

    top2_names = [
        f["name"]
        for f in sorted(factors, key=lambda f: f["score"], reverse=True)[:2]
    ]
    factors_str = " and ".join(top2_names)

    if market_fav == winner:
        return (
            f"The market also favors {winner} via {spread_desc}, aligning with the model. "
            f"Football factors — {factors_str} — are the primary driver, "
            f"with market data providing secondary confirmation."
        )
    return (
        f"The model diverges from market consensus here: the model picks {winner} despite "
        f"the market favoring {market_fav} via {spread_desc}. "
        f"Football factors — {factors_str} — outweigh the market signal in this matchup."
    )


# ===========================================================================
# GAME_DIAGNOSIS_ENGINE
# ===========================================================================

FOOTBALL_TRANSLATIONS = {
    "QB Efficiency": "Efficient quarterbacks sustain drives and create explosive plays without needing perfect field position.",
    "EPA/play": "EPA/play measures down-to-down value creation, not just yards or final score.",
    "Turnover Control": "Turnovers swing possessions, field position, and hidden scoring chances.",
    "Sack Pressure": "Pressure changes timing, limits deep concepts, and can kill third-down drives.",
    "Success Rate": "Success rate captures whether an offense stays ahead of the chains snap after snap.",
    "Recent Form": "Recent form catches whether current performance is moving ahead of or behind season-long averages.",
}

WHY_IT_MATTERS = {
    "QB Efficiency": "Quarterback efficiency is usually the cleanest single football signal because it drives both explosive plays and third-down survival.",
    "EPA/play": "Teams creating more EPA per snap can score without relying only on turnovers or short fields.",
    "Turnover Control": "A possession swing can erase a statistical edge quickly, especially in close probability ranges.",
    "Sack Pressure": "Pressure can force checkdowns, stalled drives, negative plays, and turnover-worthy throws.",
    "Success Rate": "A success-rate edge points to repeatable drive quality rather than one-off explosive plays.",
    "Recent Form": "Recent three-game form helps identify whether the matchup is being shaped by current trajectory.",
}

LEARNING_MODULES = {
    "QB Efficiency": {
        "concept": "QB EPA/play",
        "simple_explanation": "Measures how much value a quarterback creates per passing play.",
        "why_predictive": "Efficient quarterbacks sustain drives, avoid wasted downs, and generate explosives more reliably.",
    },
    "EPA/play": {
        "concept": "EPA/play",
        "simple_explanation": "Measures how much value a team creates every snap.",
        "why_predictive": "Teams consistently generating positive EPA sustain offense better and do not need fluky field position.",
    },
    "Turnover Control": {
        "concept": "Turnover margin",
        "simple_explanation": "Compares how often teams gain or lose extra possessions.",
        "why_predictive": "Extra possessions and short fields can swing win probability faster than yardage alone.",
    },
    "Sack Pressure": {
        "concept": "Pressure rate",
        "simple_explanation": "Shows whether the pass rush can disrupt the opposing protection.",
        "why_predictive": "Pressure changes quarterback timing and creates negative plays that end drives.",
    },
    "Success Rate": {
        "concept": "Success rate",
        "simple_explanation": "Measures whether plays gain enough yards to keep the offense on schedule.",
        "why_predictive": "Efficient offenses avoid long-yardage downs and create more manageable scoring drives.",
    },
    "Recent Form": {
        "concept": "Rolling team form",
        "simple_explanation": "Uses recent games to detect current team trajectory.",
        "why_predictive": "Recent performance can capture injuries, role changes, and scheme adjustments faster than season averages.",
    },
}


def completed_games_only(season: int, week: int) -> dict:
    return {
        "season": season,
        "up_to_week": max(int(week) - 1, 0),
        "rule": "Only games before the predicted week are included in the training window.",
    }


def rolling_features(season: int, week: int) -> dict:
    return {
        "season": season,
        "week": week,
        "windows": ["season_to_date_before_game", "last_3_completed_games"],
        "feature_timestamp": f"{season}_week_{int(week):02d}_pregame",
    }


def no_future_leakage(season: int, week: int) -> dict:
    if int(week) <= 1:
        training_rule = f"Train on seasons before {season}; no {season} games are eligible before Week 1."
    else:
        training_rule = f"Train on seasons before {season} plus {season} weeks < {int(week)}."
    return {
        "enabled": True,
        "training_rule": training_rule,
        "same_week_results_excluded": True,
    }


def weekly_refresh(season: int, week: int) -> dict:
    return {
        "refresh_cadence": "weekly",
        "completed_games_only": completed_games_only(season, week),
        "rolling_features": rolling_features(season, week),
        "no_future_leakage": no_future_leakage(season, week),
    }


_PLAYOFF_WEEK_LABELS = {19: "Wild Card", 20: "Divisional", 21: "Conference Championship", 22: "Super Bowl"}

def week_label(week: int) -> str:
    return _PLAYOFF_WEEK_LABELS.get(int(week), f"Week {int(week)}")


def signed_advantage(value: float, home_team: str, away_team: str, invert: bool = False) -> str:
    adjusted = -value if invert else value
    if adjusted > 0:
        return home_team
    if adjusted < 0:
        return away_team
    return "Even"


def scaled_strength(value: float, scale: float) -> float:
    return round(min(abs(value) / scale, 1.0), 3)


def contribution_percentiles(cards: list[dict]) -> dict:
    values = sorted(card["contribution_strength"] for card in cards)
    if not values:
        return {"p25": 0, "p50": 0, "p75": 0}

    def percentile(p: float) -> float:
        idx = min(math.ceil((len(values) - 1) * p), len(values) - 1)
        return values[idx]

    return {"p25": percentile(0.25), "p50": percentile(0.50), "p75": percentile(0.75)}


def factor_status(strength: float, thresholds: dict) -> str:
    if strength >= thresholds["p75"] and strength > 0:
        return "DECISIVE"
    if strength >= thresholds["p50"] and strength > 0:
        return "MODERATE"
    if strength >= thresholds["p25"] and strength > 0:
        return "MINOR"
    return "NEUTRAL"


def _factor_reason(name: str, adv: str, opp: str, edge: float, mag: str,
                   home_val: float, away_val: float,
                   home: str, away: str, player_ctx: dict) -> str:
    """Generate a game-specific reason string with actual numbers embedded."""
    home_qb = player_ctx.get("home_qb", {})
    away_qb = player_ctx.get("away_qb", {})

    if name == "QB Efficiency":
        adv_qb   = home_qb if adv == home else away_qb
        opp_qb   = away_qb if adv == home else home_qb
        adv_name = adv_qb.get("name") or adv
        opp_name = opp_qb.get("name") or opp
        # Use the model's computed differential (not full-season absolute values,
        # which would be time-contaminated for early-season games)
        return (
            f"{adv_name} holds a {mag} QB efficiency edge over {opp_name} "
            f"({abs(edge):.3f} EPA/play advantage). "
            f"Efficient passers sustain drives and create explosive plays without needing short fields."
        )

    if name == "EPA/play":
        return (
            f"{adv} creates {mag} more expected value per play than {opp} "
            f"({abs(edge):.3f} EPA/play edge). "
            f"Consistent EPA generation sustains drives without needing explosive plays."
        )

    if name == "Turnover Control":
        return (
            f"{adv} wins the turnover battle by {abs(edge):.2f} turnovers/game on average. "
            f"Each extra possession is worth roughly 2–3 expected points of field position."
        )

    if name == "Sack Pressure":
        pct = abs(edge) * 100
        return (
            f"{adv}'s pass-rush-vs-protection matchup gives them a {pct:.1f}% sack-rate edge. "
            f"Pressure collapses routes, forces early throws, and creates negative plays."
        )

    if name == "Success Rate":
        return (
            f"{adv} converts {abs(edge):.3f} more plays 'on schedule' (first-down-gain rate). "
            f"Staying on schedule limits predictable down-and-distance for the defense."
        )

    if name == "Recent Form":
        pts = abs(safe_get({"v": edge * 14}, "v")) if edge else 0
        return (
            f"{adv} has been the hotter team over the last 3 games "
            f"(composite form edge: {abs(edge):.2f}). "
            f"Trajectory matters — injuries, scheme changes, and momentum all show up here first."
        )

    return f"{adv} holds the {name} edge ({abs(edge):.3f} differential)."


def build_factor_cards(row: dict, player_ctx: dict | None = None) -> list[dict]:
    home, away = row["home_team"], row["away_team"]
    season     = int(row.get("season", 0))
    if player_ctx is None:
        player_ctx = {}

    # Flat lookup for QB context used in reason generation
    _home_qb = get_player_context(season, home).get("qb", {})
    _away_qb = get_player_context(season, away).get("qb", {})
    _ctx = {"home_qb": _home_qb, "away_qb": _away_qb}

    # Season-average absolute values (derived from diffs — home is reference)
    # diff = home - away, so home_val = mean + diff/2, away_val = mean - diff/2
    # We don't have per-team absolute values in the training table, but we can
    # use the home QB EPA and away QB EPA from player_context for QB cards.
    _home_qb_epa = _home_qb.get("epa_per_att", 0.0) or 0.0
    _away_qb_epa = _away_qb.get("epa_per_att", 0.0) or 0.0

    # ── Compute differential values ──────────────────────────────────────────
    qb_value = (
        safe_get(row, "diff_season_qb_epa_per_play")
        + safe_get(row, "diff_last3_qb_epa_per_play")
    ) / 2
    epa_value = (
        safe_get(row, "diff_season_epa_per_play")
        + safe_get(row, "diff_last3_epa_per_play")
        - safe_get(row, "diff_season_epa_per_play_allowed")
        - safe_get(row, "diff_last3_epa_per_play_allowed")
    ) / 4
    turnover_value = (
        safe_get(row, "diff_season_turnover_diff_pg")
        + safe_get(row, "diff_last3_turnover_diff_pg")
    ) / 2
    pressure_value = -(
        safe_get(row, "match_season_sack_pressure")
        + safe_get(row, "match_last3_sack_pressure")
    ) / 2
    success_value = (
        safe_get(row, "diff_season_success_rate")
        + safe_get(row, "diff_last3_success_rate")
        - safe_get(row, "diff_season_success_rate_allowed")
        - safe_get(row, "diff_last3_success_rate_allowed")
    ) / 4
    recent_value = (
        safe_get(row, "diff_last3_point_diff_pg") / 14
        + safe_get(row, "diff_last3_win_pct")
        + safe_get(row, "diff_last3_epa_per_play") / 0.25
        - safe_get(row, "diff_last3_epa_per_play_allowed") / 0.25
    ) / 4

    def _make(name: str, value: float, scale: float,
              home_val: float = 0.0, away_val: float = 0.0) -> dict:
        adv = signed_advantage(value, home, away)
        opp = away if adv == home else home
        strength = scaled_strength(value, scale)
        mag = magnitude_word(strength * 10)
        return {
            "name":                 name,
            "advantage_team":       adv,
            "raw_edge":             round(value, 4),
            "home_value":           round(home_val, 3),
            "away_value":           round(away_val, 3),
            "contribution_strength": strength,
            "reason":               _factor_reason(name, adv, opp, value, mag,
                                                    home_val, away_val, home, away, _ctx),
            "why_it_matters":       WHY_IT_MATTERS.get(name, ""),
            "football_translation": FOOTBALL_TRANSLATIONS.get(name, ""),
        }

    cards = [
        _make("QB Efficiency",   qb_value,       0.22,
              home_val=_home_qb_epa, away_val=_away_qb_epa),
        _make("EPA/play",        epa_value,       0.16),
        _make("Turnover Control", turnover_value, 1.1),
        _make("Sack Pressure",   pressure_value,  0.06),
        _make("Success Rate",    success_value,   0.08),
        _make("Recent Form",     recent_value,    0.65),
    ]

    thresholds = contribution_percentiles(cards)
    for card in cards:
        card["status"] = factor_status(card["contribution_strength"], thresholds)

    return sorted(cards, key=lambda item: item["contribution_strength"], reverse=True)


def parse_model_contributions(record: dict) -> list[dict]:
    raw = record.get("explanation_factors")
    if not raw:
        return []
    if isinstance(raw, str):
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            return []
    return raw if isinstance(raw, list) else []


def football_sentence(card: dict) -> str:
    return (
        f"{card['advantage_team']} owns the {card['name'].lower()} edge. "
        f"{card['football_translation']}"
    )


def build_market_context(row: dict) -> dict:
    spread = safe_get(row, "spread_line")
    home_ml = safe_get(row, "home_moneyline")
    away_ml = safe_get(row, "away_moneyline")
    home, away = row["home_team"], row["away_team"]

    market_favorite = "Even"
    if spread > 0:
        market_favorite = home
    elif spread < 0:
        market_favorite = away
    elif home_ml and away_ml:
        market_favorite = home if home_ml < away_ml else away

    return {
        "market_used": True,
        "market_role": "context_only",
        "market_favorite": market_favorite,
        "spread_line": spread,
        "home_moneyline": home_ml,
        "away_moneyline": away_ml,
        "interpretation": (
            "Market inputs help calibrate baseline team strength, but football diagnosis "
            "sections intentionally avoid citing Vegas as the cause."
        ),
    }


def build_flip_scenarios(row: dict, factor_cards: list[dict]) -> list[str]:
    winner = row["predicted_winner"]
    home, away = row["home_team"], row["away_team"]
    opponent = away if winner == home else home
    scenarios = []

    turnover_card = next((card for card in factor_cards if card["name"] == "Turnover Control"), None)
    pressure_card = next((card for card in factor_cards if card["name"] == "Sack Pressure"), None)
    epa_card = next((card for card in factor_cards if card["name"] == "EPA/play"), None)

    scenarios.append(f"If {winner} loses turnover margin by 2+, its win probability can collapse quickly.")

    if pressure_card and pressure_card["advantage_team"] == winner:
        scenarios.append(f"If {opponent}'s protection neutralizes early pressure, {winner}'s defensive edge shrinks.")
    elif pressure_card:
        scenarios.append(f"If {winner} cannot keep the quarterback clean, stalled drives become the main upset path.")

    if epa_card and epa_card["advantage_team"] == winner:
        scenarios.append(f"If {winner}'s EPA/play falls below neutral on early downs, the matchup becomes script-dependent.")
    else:
        scenarios.append(f"If {opponent} converts its EPA edge into red-zone touchdowns, the model's lean can flip.")

    if turnover_card and turnover_card["status"] in {"DECISIVE", "MODERATE"}:
        scenarios.append(f"If the turnover edge moves toward {opponent}, the strongest possession-based advantage disappears.")

    return scenarios[:3]


def build_trust_metadata(row: dict) -> dict:
    week = int(row.get("week", 0) or 0)
    season = int(row.get("season", 0) or 0)
    train_seasons = MODEL_META.get("train_seasons", [])
    backtest_accuracy = MODEL_META.get("accuracy", "71.2%")
    if train_seasons and week <= 1:
        training_window = f"{min(train_seasons)}-{max(train_seasons)}; no {season} games before Week 1"
    elif train_seasons:
        training_window = f"{min(train_seasons)}-{max(train_seasons)} plus {season} weeks 1-{week - 1}"
    else:
        training_window = f"prior games before week {week}"

    return {
        "model_type": "Regularized Logistic Regression",
        "backtest_accuracy": backtest_accuracy,
        "market_used": True,
        "market_role": "context_only",
        "training_window": training_window,
        "test_window": f"{season} week {week}",
        "feature_timestamp": f"{season}_week_{week:02d}_pregame",
        "season_mode": SEASON_MODE,
        "prediction_version": PREDICTION_VERSION,
        "pipeline": weekly_refresh(season, week),
    }


def select_learning_module(primary_card: dict | None) -> dict:
    if not primary_card:
        return LEARNING_MODULES["EPA/play"]
    return LEARNING_MODULES.get(primary_card["name"], LEARNING_MODULES["EPA/play"])


def game_diagnosis_engine(row: dict) -> dict:
    winner   = row["predicted_winner"]
    loser    = row["away_team"] if winner == row["home_team"] else row["home_team"]
    home     = row["home_team"]
    away     = row["away_team"]
    season   = int(row.get("season", 0))
    probability = max(
        safe_get(row, "home_win_prob") if winner == home else safe_get(row, "away_win_prob"),
        0.0,
    )
    factor_cards = build_factor_cards(row)

    # Resolve player context for prose
    winner_ctx = get_player_context(season, winner)
    loser_ctx  = get_player_context(season, loser)
    winner_qb  = winner_ctx.get("qb", {}).get("name") or winner
    loser_qb   = loser_ctx.get("qb", {}).get("name") or loser
    winner_rb  = winner_ctx.get("rb", {}).get("name")
    winner_qb_epa = winner_ctx.get("qb", {}).get("epa_per_att", 0.0) or 0.0
    loser_qb_epa  = loser_ctx.get("qb", {}).get("epa_per_att", 0.0) or 0.0

    winner_decisive = [
        card for card in factor_cards
        if card["advantage_team"] == winner and card["status"] == "DECISIVE"
    ]
    winner_supporting = [
        card for card in factor_cards
        if card["advantage_team"] == winner and card["status"] in {"DECISIVE", "MODERATE"}
    ]
    primary   = winner_decisive[0] if winner_decisive else None
    secondary = next((card for card in winner_supporting if card is not primary), None)
    risks     = [
        card for card in factor_cards
        if card["advantage_team"] not in {winner, "Even"} and card["status"] in {"DECISIVE", "MODERATE", "MINOR"}
    ]
    risk = risks[0] if risks else None

    # ── Headline ───────────────────────────────────────────────────────────────
    conf_label = "Clear edge" if probability >= 0.65 else "Slight lean" if probability <= 0.57 else "Model lean"
    headline = f"{conf_label}: {winner} at {probability * 100:.1f}%"

    # ── Primary / secondary reasons (use the new reason field) ─────────────────
    if primary:
        primary_reason = primary["reason"]
    else:
        best = max(
            (c for c in factor_cards if c["advantage_team"] == winner),
            key=lambda c: c["contribution_strength"],
            default=None,
        )
        primary_reason = (
            best["reason"] if best
            else f"The model's lean on {winner} is driven primarily by market signals — no single football factor dominates."
        )

    if secondary:
        secondary_reason = secondary["reason"]
    else:
        secondary_reason = f"The primary football edge carries most of the weight — no clear secondary factor reinforces {winner}."

    # ── Risk factor ────────────────────────────────────────────────────────────
    if risk:
        risk_factor = (
            f"{risk['advantage_team']} owns the {risk['name']} edge. {risk['reason']}"
        )
    else:
        risk_factor = (
            "The main risk is game-state variance: a turnover, a special-teams breakdown, "
            "or an early injury can compress the statistical edge quickly."
        )

    # ── Football story (the editorial prose) ───────────────────────────────────
    rest_diff = safe_get(row, "rest_diff")
    div_game  = bool(safe_get(row, "div_game"))
    spread    = safe_get(row, "spread_line")
    mkt_word  = "market agrees" if (spread > 0) == (winner == home) else "market disagrees"

    if primary and secondary:
        # Name the QB when QB Efficiency is one of the top factors
        uses_qb = primary["name"] == "QB Efficiency" or secondary["name"] == "QB Efficiency"
        _qb_card = next((c for c in factor_cards if c["name"] == "QB Efficiency"), None)
        qb_diff  = abs(_qb_card["raw_edge"]) if _qb_card else 0.0
        qb_note = (
            f" {winner_qb} holds the QB efficiency edge over {loser_qb} ({qb_diff:.3f} EPA/play differential)."
            if uses_qb and winner_qb != winner else ""
        )
        form_note = f" {winner} are the hotter team over the last 3 games." if secondary["name"] == "Recent Form" else ""
        rest_note = f" They also have a {abs(rest_diff):.0f}-day rest advantage." if abs(rest_diff) >= 3 else ""
        div_note  = " This is a divisional matchup — expect tighter margins than the numbers suggest." if div_game else ""
        football_story = (
            f"{winner} hold a meaningful edge in {primary['name']} and {secondary['name']}.{qb_note}"
            f"{form_note}{rest_note}{div_note} The {mkt_word} with the model's lean."
        )
    elif primary:
        rb_note = f" {winner_rb} is the key ball-carrier if {winner} can establish the run." if winner_rb and "Recent Form" in primary["name"] else ""
        div_note = " In a divisional game, one dominant factor usually isn't enough to cover completely." if div_game else ""
        football_story = (
            f"{winner}'s edge comes down to one factor: {primary['name']}.{rb_note}{div_note} "
            f"The {mkt_word} — watch for {loser} to challenge through {risk['name'] if risk else 'game-state variance'}."
        )
    elif risk:
        football_story = (
            f"The model leans {winner}, but {risk['advantage_team']} has the stronger football profile on {risk['name']}. "
            f"The lean is built on market signals more than pure football edges. "
            f"Treat {risk['advantage_team']}'s {risk['name']} advantage as the live upset path."
        )
    else:
        football_story = (
            f"This is a genuinely balanced matchup — no football factor decisively favors either team. "
            f"The {winner} lean ({probability * 100:.0f}%) is driven more by market position than a clear statistical edge. "
            f"Small in-game swings — one turnover, one field-position shift — could change the outcome."
        )

    return {
        "headline": headline,
        "football_story": football_story,
        "primary_reason": primary_reason,
        "secondary_reason": secondary_reason,
        "risk_factor": risk_factor,
        "flip_scenarios": build_flip_scenarios(row, factor_cards),
        "market_context": build_market_context(row),
        "factor_cards": factor_cards,
        "trust_metadata": build_trust_metadata(row),
        "learning_module": select_learning_module(primary or secondary or risk),
        "model_contributions": parse_model_contributions(row),
    }


# ===========================================================================
# API endpoints
# ===========================================================================

@app.get("/")
def root():
    return {"message": "NFL Matchup Lab API is running", "data_mode": DATA_MODE}


@app.get("/model-info")
def model_info():
    """Returns model metadata — accuracy, features, evaluation method."""
    return MODEL_META


@app.get("/predictions")
def get_predictions():
    """
    Return enriched game predictions for the latest season.

    Each game includes: prediction, confidence, five football factors (with
    tier labels and comparative explanations), key battle, model explanation,
    market note, and model metadata.
    """
    latest_season = int(df["season"].max())

    if PREDICTIONS_PATH.exists():
        predictions  = pd.read_csv(PREDICTIONS_PATH)
        latest_games = predictions[predictions["season"] == latest_season].copy()
        latest_games = latest_games.rename(columns={
            "home_win_probability": "home_win_prob",
            "away_win_probability": "away_win_prob",
        })
    else:
        latest_games = df[df["season"] == latest_season].copy()
        X = latest_games[PRODUCTION_FEATURES].copy()
        probs = model.predict_proba(X)[:, 1]
        latest_games["home_win_prob"]  = probs
        latest_games["away_win_prob"]  = 1 - probs
        latest_games["predicted_winner"] = latest_games.apply(
            lambda r: r["home_team"] if r["home_win_prob"] > 0.5 else r["away_team"], axis=1
        )

    if not schedule_df.empty:
        schedule_cols = [
            "game_id", "gameday", "weekday", "gametime",
            "game_type", "location", "stadium",
        ]
        latest_games = latest_games.merge(
            schedule_df[[col for col in schedule_cols if col in schedule_df.columns]],
            on="game_id",
            how="left",
        )

    latest_games = latest_games.sort_values(["season", "week", "game_id"])

    results = []
    for record in latest_games.to_dict(orient="records"):
        record = clean_record(record)

        home_win_prob = record.get("home_win_prob") or 0.5
        away_win_prob = record.get("away_win_prob") or 0.5

        confidence_label, confidence_score = get_confidence(home_win_prob)
        season_int  = int(record.get("season") or 0)
        home_ctx    = get_player_context(season_int, record.get("home_team", ""))
        away_ctx    = get_player_context(season_int, record.get("away_team", ""))
        factors     = build_football_factors(record)
        key_battle  = build_key_battle(record, factors)
        market_note = build_market_note(record, factors)
        diagnosis   = game_diagnosis_engine(record)
        legacy_explanation_factors = diagnosis["model_contributions"] or [
            {
                "feature": card["name"],
                "label": card["name"],
                "value": card["status"],
                "direction": card["advantage_team"],
                "impact": card["contribution_strength"],
            }
            for card in diagnosis["factor_cards"][:3]
        ]

        results.append({
            # Identity
            "season":            record.get("season"),
            "week":              record.get("week"),
            "week_label":         week_label(record.get("week") or 0),
            "game_date":          record.get("gameday"),
            "weekday":            record.get("weekday"),
            "gametime":           record.get("gametime"),
            "game_type":          record.get("game_type"),
            "location":           record.get("location"),
            "stadium":            record.get("stadium"),
            "home_team":         record.get("home_team"),
            "away_team":         record.get("away_team"),
            # Prediction
            "predicted_winner":  record.get("predicted_winner"),
            "home_win_prob":     round(float(home_win_prob), 4),
            "away_win_prob":     round(float(away_win_prob), 4),
            # Confidence
            "confidence_label":  confidence_label,
            "confidence_score":  confidence_score,
            # Football factors
            "key_battle":        key_battle,
            "football_factors":  factors,
            "explanation":       diagnosis["football_story"],
            "market_note":       market_note,
            # Structured football diagnosis engine
            "game_diagnosis":     diagnosis,
            "headline":           diagnosis["headline"],
            "football_story":     diagnosis["football_story"],
            "primary_reason":     diagnosis["primary_reason"],
            "secondary_reason":   diagnosis["secondary_reason"],
            "risk_factor":        diagnosis["risk_factor"],
            "flip_scenarios":     diagnosis["flip_scenarios"],
            "market_context":     diagnosis["market_context"],
            "factor_cards":       diagnosis["factor_cards"],
            "trust_metadata":     diagnosis["trust_metadata"],
            "learning_module":    diagnosis["learning_module"],
            # Compatibility for primary-ui's current modal
            "explanation_summary": diagnosis["football_story"],
            "explanation_factors": legacy_explanation_factors,
            "model_feature_set":   PRODUCTION_MODEL_NAME,
            # Player context (QB, RB per team)
            "home_players":      home_ctx,
            "away_players":      away_ctx,
            # Model + data provenance
            "model_meta":        MODEL_META,
            "data_mode":         DATA_MODE,
            "current_season_ready_note": CURRENT_SEASON_READY_NOTE,
        })

    return results
