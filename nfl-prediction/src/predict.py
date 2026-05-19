import joblib
import pandas as pd
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

MODEL_PATH = BASE_DIR / "models" / "logreg_model.joblib"
DATA_PATH = BASE_DIR / "data" / "processed" / "game_training_table.csv"
PREDICTIONS_PATH = BASE_DIR / "outputs" / "predictions.csv"

FEATURES = [
    "rest_diff",
    "div_game",
    "spread_line",
    "home_moneyline",
    "away_moneyline",
    "diff_season_turnover_diff_pg",
    "diff_season_epa_per_play",
    "diff_season_epa_per_play_allowed",
    "diff_season_success_rate",
    "diff_season_success_rate_allowed",
    "diff_season_pass_epa_per_play",
    "diff_season_rush_epa_per_play",
    "diff_season_qb_epa_per_play",
    "diff_season_cpoe",
    "diff_last3_turnover_diff_pg",
    "diff_last3_epa_per_play",
    "diff_last3_success_rate",
    "diff_last3_pass_epa_per_play",
    "diff_last3_qb_epa_per_play",
    "match_season_pass_off_vs_def",
    "match_season_success_off_vs_def",
    "match_season_sack_pressure",
    "match_season_qb_vs_def",
    "match_last3_pass_off_vs_def",
    "match_last3_success_off_vs_def",
    "match_last3_sack_pressure",
    "match_last3_qb_vs_def",
    "home_field",
]

PRODUCTION_FEATURES = [
    "spread_line",
    "home_moneyline",
    "away_moneyline",
    "rest_diff",
    "div_game",
    "home_field",
    "diff_last3_point_diff_pg",
    "diff_last3_win_pct",
    "diff_last3_epa_per_play",
    "diff_last3_epa_per_play_allowed",
    "diff_last3_success_rate",
    "diff_last3_success_rate_allowed",
]

df = pd.read_csv(DATA_PATH)
model = joblib.load(MODEL_PATH)

latest_season = df["season"].max()
if PREDICTIONS_PATH.exists():
    latest_games = pd.read_csv(PREDICTIONS_PATH)
    latest_games = latest_games[latest_games["season"] == latest_season].copy()
    latest_games = latest_games.rename(
        columns={
            "home_win_probability": "home_win_prob",
            "away_win_probability": "away_win_prob",
        }
    )
else:
    latest_games = df[df["season"] == latest_season].copy()

missing_columns = [col for col in FEATURES if col not in latest_games.columns]
if missing_columns and not PREDICTIONS_PATH.exists():
    raise ValueError(f"Missing required feature columns: {missing_columns}")

if "home_win_prob" not in latest_games.columns:
    X = latest_games[PRODUCTION_FEATURES].copy()

    probs = model.predict_proba(X)[:, 1]

    latest_games["home_win_prob"] = probs
    latest_games["predicted_winner"] = latest_games.apply(
        lambda row: row["home_team"] if row["home_win_prob"] > 0.5 else row["away_team"],
        axis=1,
    )

latest_games = latest_games.sort_values(["season", "week", "game_id"])

print(
    latest_games[[
        "season",
        "week",
        "home_team",
        "away_team",
        "home_win_prob",
        "predicted_winner",
    ]].head(10)
)
