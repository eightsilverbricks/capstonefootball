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
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from src.factor_prose import (
    FactorContext, build_factor_prose, LedeContext, build_synthesis_lede,
)

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

BASE_DIR             = Path(__file__).resolve().parent.parent
MODEL_PATH           = BASE_DIR / "models" / "logreg_model.joblib"
DATA_PATH            = BASE_DIR / "data" / "processed" / "game_training_table.csv"
SCHEDULE_DATES_PATH  = BASE_DIR / "data" / "processed" / "schedule_dates.csv"
SCHEDULES_RAW_PATH   = BASE_DIR / "data" / "raw" / "schedules.parquet"
PREDICTIONS_PATH     = BASE_DIR / "outputs" / "predictions.csv"
METRICS_PATH         = BASE_DIR / "outputs" / "metrics.json"
PLAYER_CONTEXT_PATH  = BASE_DIR / "data" / "processed" / "player_context.json"
GAME_CONTEXT_PATH    = BASE_DIR / "data" / "processed" / "game_context.json"

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

# Imported, never re-declared. This list has to match the columns the model was
# fitted on exactly; a local copy silently goes stale the moment the feature set
# changes and then scores every game against the wrong columns.
from src.train_model import (  # noqa: E402
    PRODUCTION_FEATURES,
    PRODUCTION_MODEL_NAME,
)

# ---------------------------------------------------------------------------
# Data mode + model metadata
# ---------------------------------------------------------------------------

# ── Seasons ──────────────────────────────────────────────────────────────────
# ACTIVE_SEASON is what the site serves by default: the season being played (or
# about to be). DEMO_SEASON is a completed season kept for demo mode, where
# every game has a real outcome so picks actually resolve — the live season
# cannot do that until games are played.
ACTIVE_SEASON = 2026
DEMO_SEASON = 2024

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
        "http://localhost:8080", "http://127.0.0.1:8080",
        "http://localhost:8081", "http://127.0.0.1:8081",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

df          = pd.read_csv(DATA_PATH)
schedule_df = pd.read_csv(SCHEDULE_DATES_PATH) if SCHEDULE_DATES_PATH.exists() else pd.DataFrame()
model       = joblib.load(MODEL_PATH)


# ---------------------------------------------------------------------------
# Actual results
# ---------------------------------------------------------------------------
# The frontend resolves every pick against `actual_winner` — records, streaks,
# Clark Differential and the whole My Season page are derived from it. The
# static export gets these fields patched in by add_actual_results.py; this API
# has to serve the same three fields from the same source, or a frontend
# pointed at VITE_API_BASE_URL silently never resolves a single pick.
# Keep this in step with src/add_actual_results.py.

def _load_results_map() -> dict[str, dict]:
    """game_id -> {actual_winner, home_score, away_score} for played games."""
    if not SCHEDULES_RAW_PATH.exists():
        return {}
    try:
        sched = pd.read_parquet(SCHEDULES_RAW_PATH)
    except Exception:
        # Missing parquet engine or unreadable file — degrade to "no outcomes"
        # rather than taking the whole API down.
        return {}

    played = sched[sched["home_score"].notna() & sched["away_score"].notna()]
    out: dict[str, dict] = {}
    for row in played.itertuples(index=False):
        home_score, away_score = int(row.home_score), int(row.away_score)
        if home_score > away_score:
            winner = row.home_team
        elif away_score > home_score:
            winner = row.away_team
        else:
            winner = None  # tie — the pick stays unresolved, same as the export
        out[row.game_id] = {
            "actual_winner": winner,
            "home_score": home_score,
            "away_score": away_score,
        }
    return out


RESULTS_MAP = _load_results_map()

# ---------------------------------------------------------------------------
# Extract model coefficients + scaler params for factor contribution math
# ---------------------------------------------------------------------------
_fitted_model   = model.best_estimator_ if hasattr(model, "best_estimator_") else model
_scaler         = _fitted_model.named_steps["scaler"]
_clf            = _fitted_model.named_steps["clf"]

MODEL_SCALER_MEAN  = dict(zip(PRODUCTION_FEATURES, _scaler.mean_))
MODEL_SCALER_SCALE = dict(zip(PRODUCTION_FEATURES, _scaler.scale_))
MODEL_COEFS        = dict(zip(PRODUCTION_FEATURES, _clf.coef_[0]))

# Factor buckets: display name -> PRODUCTION_FEATURES subset
# advantage_team is derived from sign of sum(coef_i * scaled_val_i)
FACTOR_BUCKETS: dict[str, list[str]] = {
    "Market Edge":    ["spread_line", "home_moneyline", "away_moneyline"],
    "Recent Offense": ["diff_last3_epa_per_play", "diff_last3_success_rate",
                       "diff_last3_point_diff_pg"],
    "Defensive Edge": ["diff_last3_epa_per_play_allowed",
                       "diff_last3_success_rate_allowed"],
    "Momentum":       ["diff_last3_win_pct"],
    "Game Context":   ["rest_diff", "div_game"],
}

def compute_factor_contributions(row: dict) -> dict[str, dict]:
    """
    For each factor bucket sum (coef_i * scaled_val_i) using the saved model's
    scaler and coefficients. This guarantees advantage_team always aligns with
    the model's predicted winner.

    Returns: {bucket_name: {score, advantage_team, contribution_strength}}
    """
    home = row.get("home_team", "Home")
    away = row.get("away_team", "Away")

    raw: dict[str, float] = {}
    for name, features in FACTOR_BUCKETS.items():
        s = 0.0
        for feat in features:
            val   = safe_get(row, feat)
            mean  = MODEL_SCALER_MEAN.get(feat, 0.0)
            scale = MODEL_SCALER_SCALE.get(feat, 1.0) or 1.0
            coef  = MODEL_COEFS.get(feat, 0.0)
            s += ((val - mean) / scale) * coef
        raw[name] = s

    max_abs = max(abs(v) for v in raw.values()) or 1.0

    return {
        name: {
            "score":                round(score, 5),
            "advantage_team":       home if score > 0 else (away if score < 0 else "Even"),
            "contribution_strength": round(min(abs(score) / max_abs, 1.0), 4),
        }
        for name, score in raw.items()
    }


# Player context: {season: {team: {qb: {...}, rb: {...}, ...}}}
if PLAYER_CONTEXT_PATH.exists():
    with open(PLAYER_CONTEXT_PATH) as _f:
        PLAYER_CONTEXT: dict = json.load(_f)
else:
    PLAYER_CONTEXT = {}


# Game context: {game_id: {home_team, away_team, records, weather}}
if GAME_CONTEXT_PATH.exists():
    with open(GAME_CONTEXT_PATH) as _gf:
        GAME_CONTEXT: dict = json.load(_gf)
else:
    GAME_CONTEXT = {}


def _compute_league_baselines(game_ctx: dict) -> dict[str, dict]:
    """
    Per-season league distribution of recent (last-3) offensive EPA/play, pooled
    across both teams of every game. Used only to make a number legible
    ("elite" / "middle-of-the-pack"), never to alter the model. Requires a
    minimum sample so early/partial seasons don't produce noisy adjectives.
    """
    pools: dict[str, list[float]] = {}
    for gid, g in game_ctx.items():
        if not isinstance(gid, str):
            continue
        season = gid.split("_", 1)[0]
        for key in ("home_last3_epa", "away_last3_epa"):
            v = g.get(key)
            if isinstance(v, (int, float)) and not (math.isnan(v) or math.isinf(v)):
                pools.setdefault(season, []).append(float(v))

    baselines: dict[str, dict] = {}
    for season, vals in pools.items():
        if len(vals) < 8:
            continue
        mean = sum(vals) / len(vals)
        std = (sum((x - mean) ** 2 for x in vals) / len(vals)) ** 0.5
        baselines[season] = {"epa_mean": mean, "epa_std": std or 1.0}
    return baselines


LEAGUE_BASELINES = _compute_league_baselines(GAME_CONTEXT)


def _compute_qb_league_baselines(player_ctx: dict) -> dict[str, dict]:
    """Per-season league distribution of QB EPA/att — used only to make a
    quarterback's efficiency legible ("elite" / "above-average"), never to alter
    the model."""
    baselines: dict[str, dict] = {}
    for season, teams in player_ctx.items():
        vals = []
        for team in teams.values():
            v = team.get("qb", {}).get("epa_per_att")
            if isinstance(v, (int, float)) and not (math.isnan(v) or math.isinf(v)):
                vals.append(float(v))
        if len(vals) < 8:
            continue
        mean = sum(vals) / len(vals)
        std = (sum((x - mean) ** 2 for x in vals) / len(vals)) ** 0.5
        baselines[str(season)] = {"epa_mean": mean, "epa_std": std or 1.0}
    return baselines


QB_LEAGUE_BASELINES = _compute_qb_league_baselines(PLAYER_CONTEXT)

# Pressure context: {game_id: {team: {pressure_generated_rate, pressure_faced_rate, dropbacks}}}
PRESSURE_CONTEXT_PATH = BASE_DIR / "data" / "processed" / "pressure_context.json"
if PRESSURE_CONTEXT_PATH.exists():
    with open(PRESSURE_CONTEXT_PATH) as _pf:
        PRESSURE_CONTEXT: dict = json.load(_pf)
else:
    PRESSURE_CONTEXT = {}

# Wind impact lookup: {tier: {label, pass_epa_delta, consequence}}
WIND_IMPACT_PATH = BASE_DIR / "data" / "processed" / "wind_impact.json"
if WIND_IMPACT_PATH.exists():
    with open(WIND_IMPACT_PATH) as _wf:
        WIND_IMPACT: dict = json.load(_wf)
else:
    WIND_IMPACT = {}


def get_game_context(game_id: str) -> dict:
    return GAME_CONTEXT.get(game_id, {})


def get_player_context(season: int, team: str) -> dict:
    """Returns player context for a team-season, or empty defaults."""
    return PLAYER_CONTEXT.get(str(season), {}).get(team, {
        "qb": {"name": None, "epa_per_att": 0.0, "cpoe": None, "espn_id": None},
        "rb": {"name": None, "carries": 0, "ypc": 0.0, "espn_id": None},
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
    if not (safe_get(row, "spread_line") or safe_get(row, "home_moneyline")):
        return (
            "No betting line has been posted for this game yet. The projection "
            "below is built purely from team form and ratings."
        )

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


def build_factor_cards(row: dict, player_ctx: dict | None = None) -> list[dict]:
    """
    Build factor cards derived from actual model coefficients via
    compute_factor_contributions(). This guarantees advantage_team always
    points toward the predicted winner because it uses the same arithmetic
    as the logistic regression.
    """
    home, away = row["home_team"], row["away_team"]
    season     = int(row.get("season", 0))
    game_id    = str(row.get("game_id") or "")

    # Coefficient-based contributions (the alignment fix)
    contributions = compute_factor_contributions(row)

    # Player context for prose enrichment
    _home_qb = get_player_context(season, home).get("qb", {})
    _away_qb = get_player_context(season, away).get("qb", {})
    home_qb_name = _home_qb.get("name") or home
    away_qb_name = _away_qb.get("name") or away

    # Pressure context for prose enrichment
    _pressure = PRESSURE_CONTEXT.get(game_id, {})
    home_pressure_gen = _pressure.get(home, {}).get("pressure_generated_rate")
    away_pressure_gen = _pressure.get(away, {}).get("pressure_generated_rate")
    home_pressure_faced = _pressure.get(home, {}).get("pressure_faced_rate")
    away_pressure_faced = _pressure.get(away, {}).get("pressure_faced_rate")

    # Game context for record data
    _game_ctx = get_game_context(game_id)
    home_last3 = _game_ctx.get("home_last3_record") or ""
    away_last3 = _game_ctx.get("away_last3_record") or ""
    home_season_rec = _game_ctx.get("home_season_record") or ""
    away_season_rec = _game_ctx.get("away_season_record") or ""

    # Raw feature values for reason text
    spread    = safe_get(row, "spread_line")
    home_ml   = int(safe_get(row, "home_moneyline"))
    away_ml   = int(safe_get(row, "away_moneyline"))
    rest_diff = safe_get(row, "rest_diff")
    div_game  = bool(safe_get(row, "div_game"))
    home_epa  = safe_get(row, "diff_last3_epa_per_play")
    home_def  = safe_get(row, "diff_last3_epa_per_play_allowed")
    home_sr   = safe_get(row, "diff_last3_success_rate")
    home_ptdiff = safe_get(row, "diff_last3_point_diff_pg")
    home_winpct = safe_get(row, "diff_last3_win_pct")

    # Season baselines (for season -> last-3 trend detection in the prose layer)
    season_epa         = safe_get(row, "diff_season_epa_per_play")
    season_epa_allowed = safe_get(row, "diff_season_epa_per_play_allowed")
    season_sr          = safe_get(row, "diff_season_success_rate")

    # Absolute team last-3 offensive EPA + points (from game_context) for
    # league-relative legibility and momentum prose.
    home_last3_epa = _game_ctx.get("home_last3_epa")
    away_last3_epa = _game_ctx.get("away_last3_epa")
    home_pts_for   = _game_ctx.get("home_last3_pts_for")
    home_pts_ag    = _game_ctx.get("home_last3_pts_ag")
    away_pts_for   = _game_ctx.get("away_last3_pts_for")
    away_pts_ag    = _game_ctx.get("away_last3_pts_ag")
    _league        = LEAGUE_BASELINES.get(str(season), {})

    # Weather context — derive wind_tier from numeric wind + roof
    weather  = _game_ctx.get("weather", {})
    wind_mph = weather.get("wind") or 0
    temp_f   = weather.get("temp")
    _roof    = (weather.get("roof") or "").lower()
    if _roof in ("dome", "closed", "retractable"):
        wind_tier = "dome"
    elif wind_mph >= 31:
        wind_tier = "severe"
    elif wind_mph >= 21:
        wind_tier = "high"
    elif wind_mph >= 11:
        wind_tier = "moderate"
    else:
        wind_tier = "calm"
    wind_consequence = WIND_IMPACT.get(wind_tier, {}).get("consequence", "")

    def _prose_ctx(name: str, adv: str, opp: str, strength: float) -> FactorContext:
        """Assemble the advantage-team-resolved context for the prose layer."""
        adv_is_home = adv == home
        pick = lambda h, a: h if adv_is_home else a  # noqa: E731
        return FactorContext(
            name=name, home=home, away=away, adv=adv, opp=opp,
            adv_is_home=adv_is_home, contribution_strength=strength,
            spread=spread, home_ml=home_ml, away_ml=away_ml,
            season_epa=season_epa, last3_epa=home_epa,
            season_epa_allowed=season_epa_allowed, last3_epa_allowed=home_def,
            season_sr=season_sr, last3_sr=home_sr,
            last3_winpct=home_winpct, last3_ptdiff=home_ptdiff,
            adv_last3_epa=pick(home_last3_epa, away_last3_epa),
            opp_last3_epa=pick(away_last3_epa, home_last3_epa),
            adv_pts_for=pick(home_pts_for, away_pts_for),
            adv_pts_ag=pick(home_pts_ag, away_pts_ag),
            adv_last3_rec=pick(home_last3, away_last3),
            opp_last3_rec=pick(away_last3, home_last3),
            adv_season_rec=pick(home_season_rec, away_season_rec),
            adv_qb=pick(home_qb_name, away_qb_name),
            opp_qb=pick(away_qb_name, home_qb_name),
            adv_pressure_gen=pick(home_pressure_gen, away_pressure_gen),
            adv_pressure_faced=pick(home_pressure_faced, away_pressure_faced),
            opp_pressure_faced=pick(away_pressure_faced, home_pressure_faced),
            rest_diff=rest_diff, div_game=div_game,
            wind_mph=wind_mph or 0.0, temp_f=temp_f, wind_tier=wind_tier,
            wind_consequence=wind_consequence, roof=_roof,
            stadium=weather.get("stadium", "") or "",
            league=_league,
        )

    # Build sorted cards from contributions
    cards = []
    for name, contrib in contributions.items():
        adv = contrib["advantage_team"]
        opp = away if adv == home else home
        prose = build_factor_prose(
            _prose_ctx(name, adv, opp, contrib["contribution_strength"])
        )
        cards.append({
            "name":                 name,
            "advantage_team":       adv,
            "raw_edge":             contrib["score"],
            "contribution_strength": contrib["contribution_strength"],
            # Plain-English reasoning layer (claim -> evidence -> implication)
            "headline":             prose.headline,
            "explanation":          prose.explanation,
            "baseline_note":        prose.baseline_note,
            "confident":            prose.confident,
        })

    cards.sort(key=lambda c: c["contribution_strength"], reverse=True)

    # Assign status labels based on relative contribution within this game
    thresholds = contribution_percentiles(cards)
    for card in cards:
        card["status"] = factor_status(card["contribution_strength"], thresholds)

    return cards


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


def build_market_context(row: dict) -> dict:
    spread = safe_get(row, "spread_line")
    home_ml = safe_get(row, "home_moneyline")
    away_ml = safe_get(row, "away_moneyline")
    home, away = row["home_team"], row["away_team"]

    # No line posted yet. Most of an upcoming season sits here for months, and
    # calling that "Even" would render a fabricated pick'em on the comparison
    # rows — the market has not spoken, which is different from it saying the
    # game is a coin flip.
    has_line = bool(spread) or bool(home_ml and away_ml)

    market_favorite = "Even"
    if spread > 0:
        market_favorite = home
    elif spread < 0:
        market_favorite = away
    elif home_ml and away_ml:
        market_favorite = home if home_ml < away_ml else away
    if not has_line:
        market_favorite = None

    return {
        "market_used": has_line,
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

    # ── Post-process: replace Recent Form placeholder with real records + scoring ──
    _game_ctx_early = get_game_context(str(row.get("game_id") or ""))
    _rf_card = next((c for c in factor_cards if c["name"] == "Recent Form"), None)
    if _rf_card and _game_ctx_early:
        _adv_is_home = _rf_card["advantage_team"] == home
        _adv_last3   = _game_ctx_early.get("home_last3_record" if _adv_is_home else "away_last3_record") or ""
        _opp_last3   = _game_ctx_early.get("away_last3_record" if _adv_is_home else "home_last3_record") or ""
        _adv_pts     = _game_ctx_early.get("home_last3_pts_for" if _adv_is_home else "away_last3_pts_for")
        _adv_pts_ag  = _game_ctx_early.get("home_last3_pts_ag"  if _adv_is_home else "away_last3_pts_ag")
        _adv         = _rf_card["advantage_team"]
        _opp         = away if _adv_is_home else home
        if _adv_last3:
            _pts_note = (
                f", scoring {_adv_pts:.0f} and allowing {_adv_pts_ag:.0f} pts/game"
                if _adv_pts and _adv_pts_ag else ""
            )
            _opp_note = f" {_opp} are {_opp_last3}." if _opp_last3 else ""
            _rf_card["reason"] = (
                f"{_adv} are {_adv_last3}{_pts_note}.{_opp_note} "
                f"Recent trajectory captures momentum, injuries, and scheme changes faster than season averages."
            )

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
    # Only a factor whose own prose genuinely supports the opponent counts as a
    # real upset path — a hedged "close to even" factor is not a risk.
    confident_risks = [card for card in risks if card.get("confident")]
    risk = confident_risks[0] if confident_risks else None

    # ── Headline ───────────────────────────────────────────────────────────────
    conf_label = "Clear edge" if probability >= 0.65 else "Slight lean" if probability <= 0.57 else "Model lean"
    headline = f"{conf_label}: {winner} at {probability * 100:.1f}%"

    # ── Primary / secondary reasons (now the plain-English explanation) ────────
    if primary:
        primary_reason = primary["explanation"]
    else:
        best = max(
            (c for c in factor_cards if c["advantage_team"] == winner),
            key=lambda c: c["contribution_strength"],
            default=None,
        )
        primary_reason = (
            best["explanation"] if best
            else f"Clark's lean on {winner} rides on the overall blend — no single football factor dominates."
        )

    if secondary:
        secondary_reason = secondary["explanation"]
    else:
        secondary_reason = f"The main edge carries most of the weight — no clear secondary factor reinforces {winner}."

    # ── Risk factor ────────────────────────────────────────────────────────────
    if risk:
        risk_factor = f"{risk['headline']} {risk['explanation']}"
    else:
        risk_factor = (
            "The main risk is game-state variance: a turnover, a special-teams breakdown, "
            "or an early injury can compress the statistical edge quickly."
        )

    # ── Football story (A3 synthesis lede) ─────────────────────────────────────
    # Weave the top factors into one narrative: name the pick, the main reason,
    # one reinforcing reason, then the single thing that could go wrong.
    spread     = safe_get(row, "spread_line")
    abs_spread = abs(spread)

    football_names = {"Recent Offense", "Defensive Edge", "Momentum"}
    # factor_cards is sorted by contribution_strength desc, so the first match is
    # the strongest non-market football factor favoring the winner.
    football_lead = next(
        (c for c in factor_cards
         if c["advantage_team"] == winner and c["name"] in football_names
         and c["status"] != "NEUTRAL" and c.get("confident")),
        None,
    )
    market_card = next((c for c in factor_cards if c["name"] == "Market Edge"), None)
    if market_card and market_card["advantage_team"] == winner:
        spread_desc = (f"a {abs_spread:.1f}-point favorite" if abs_spread >= 0.5
                       else "a narrow favorite")
    else:
        spread_desc = ""

    football_story = build_synthesis_lede(LedeContext(
        winner=winner, opponent=loser, probability=probability,
        primary=primary, football_lead=football_lead,
        secondary=secondary, risk=risk,
        winner_qb=winner_qb, winner_qb_epa=winner_qb_epa,
        qb_league=QB_LEAGUE_BASELINES.get(str(season), {}),
        spread_desc=spread_desc,
    ))

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
def get_predictions(season: int | None = None):
    """
    Return enriched game predictions for the latest season.

    Each game includes: prediction, confidence, five football factors (with
    tier labels and comparative explanations), key battle, model explanation,
    market note, and model metadata.
    """
    target_season = ACTIVE_SEASON if season is None else int(season)
    season_games = df[df["season"] == target_season].copy()

    if season_games.empty:
        raise HTTPException(
            status_code=404,
            detail=f"No games in the training table for season {target_season}.",
        )

    # The backtest CSV only covers the held-out evaluation season, and its
    # probabilities come from the stricter expanding-week refit, so prefer it
    # when it actually has rows for this season. Every other season — the
    # upcoming one included — is scored with the production model.
    backtest = pd.DataFrame()
    if PREDICTIONS_PATH.exists():
        predictions = pd.read_csv(PREDICTIONS_PATH)
        backtest = predictions[predictions["season"] == target_season].copy()

    if not backtest.empty:
        latest_games = backtest.rename(columns={
            "home_win_probability": "home_win_prob",
            "away_win_probability": "away_win_prob",
        })
    else:
        latest_games = season_games
        probs = model.predict_proba(latest_games[PRODUCTION_FEATURES])[:, 1]
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
        game_id_str = str(record.get("game_id") or "")
        home_ctx    = get_player_context(season_int, record.get("home_team", ""))
        away_ctx    = get_player_context(season_int, record.get("away_team", ""))
        game_ctx    = get_game_context(game_id_str)
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
            "game_id":           record.get("game_id"),
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
            # Actual outcome — null winner means a tie or an unplayed game.
            **RESULTS_MAP.get(game_id_str, {
                "actual_winner": None, "home_score": None, "away_score": None,
            }),
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
            # Game context (weather, records)
            "weather":           game_ctx.get("weather", {}),
            "home_season_record": game_ctx.get("home_season_record"),
            "away_season_record": game_ctx.get("away_season_record"),
            "home_last3_record":  game_ctx.get("home_last3_record"),
            "away_last3_record":  game_ctx.get("away_last3_record"),
            "home_last3_pts_for": game_ctx.get("home_last3_pts_for"),
            "home_last3_pts_ag":  game_ctx.get("home_last3_pts_ag"),
            "away_last3_pts_for": game_ctx.get("away_last3_pts_for"),
            "away_last3_pts_ag":  game_ctx.get("away_last3_pts_ag"),
            # Model + data provenance
            "model_meta":        MODEL_META,
            "data_mode":         DATA_MODE,
            "current_season_ready_note": CURRENT_SEASON_READY_NOTE,
        })

    return results
