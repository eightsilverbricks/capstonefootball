from pathlib import Path
import joblib
import pandas as pd
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

BASE_DIR = Path(__file__).resolve().parent.parent

MODEL_PATH = BASE_DIR / "models" / "logreg_model.joblib"
DATA_PATH = BASE_DIR / "data" / "processed" / "game_training_table.csv"

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

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

model = joblib.load(MODEL_PATH)
df = pd.read_csv(DATA_PATH)


@app.get("/")
def root():
    return {"message": "NFL prediction API is running"}


@app.get("/predictions")
def get_predictions():
    latest_season = int(df["season"].max())
    latest_games = df[df["season"] == latest_season].copy()

    X = latest_games[FEATURES].copy()
    probs = model.predict_proba(X)[:, 1]

    latest_games["home_win_prob"] = probs
    latest_games["away_win_prob"] = 1 - probs
    latest_games["predicted_winner"] = latest_games.apply(
        lambda row: row["home_team"] if row["home_win_prob"] > 0.5 else row["away_team"],
        axis=1,
    )

    results = latest_games[
        [
            "season",
            "week",
            "home_team",
            "away_team",
            "home_win_prob",
            "away_win_prob",
            "predicted_winner",
        ]
    ].to_dict(orient="records")

    return results