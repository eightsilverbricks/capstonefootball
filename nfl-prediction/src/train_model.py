from pathlib import Path
import json

import joblib
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, log_loss
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler


BASE_DIR = Path(__file__).resolve().parent.parent
PROCESSED_DIR = BASE_DIR / "data" / "processed"
MODELS_DIR = BASE_DIR / "models"
OUTPUTS_DIR = BASE_DIR / "outputs"

MODELS_DIR.mkdir(parents=True, exist_ok=True)
OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)

TRAINING_TABLE_PATH = PROCESSED_DIR / "game_training_table.csv"
MODEL_PATH = MODELS_DIR / "logreg_model.joblib"
PREDICTIONS_PATH = OUTPUTS_DIR / "predictions.csv"
METRICS_PATH = OUTPUTS_DIR / "metrics.json"

FEATURES = [
    "diff_season_points_pg",
    "diff_season_points_allowed_pg",
    "diff_season_point_diff_pg",
    "diff_season_win_pct",
    "diff_season_turnover_diff_pg",
    "diff_season_ypp_off",
    "diff_season_ypp_def",
    "diff_season_epa_per_play",
    "diff_season_epa_per_play_allowed",
    "diff_season_success_rate",
    "diff_season_success_rate_allowed",
    "diff_season_pass_epa_per_play",
    "diff_season_rush_epa_per_play",
    "diff_season_sack_rate_allowed",
    "diff_season_def_sack_rate",
    "diff_last3_points_pg",
    "diff_last3_points_allowed_pg",
    "diff_last3_point_diff_pg",
    "diff_last3_win_pct",
    "diff_last3_turnover_diff_pg",
    "diff_last3_ypp_off",
    "diff_last3_ypp_def",
    "diff_last3_epa_per_play",
    "diff_last3_epa_per_play_allowed",
    "diff_last3_success_rate",
    "diff_last3_success_rate_allowed",
    "diff_last3_pass_epa_per_play",
    "diff_last3_rush_epa_per_play",
    "diff_last3_sack_rate_allowed",
    "diff_last3_def_sack_rate",
    "rest_diff",
    "div_game",
    "spread_line",
    "home_moneyline",
    "away_moneyline",
    "home_field",
]

TARGET = "home_win"


def load_training_data() -> pd.DataFrame:
    if not TRAINING_TABLE_PATH.exists():
        raise FileNotFoundError(
            f"Missing training table: {TRAINING_TABLE_PATH}. "
            "Build game_training_table.csv before training the model."
        )

    df = pd.read_csv(TRAINING_TABLE_PATH)

    required_columns = FEATURES + [TARGET, "season", "home_team", "away_team"]
    missing_columns = [col for col in required_columns if col not in df.columns]
    if missing_columns:
        raise ValueError(f"Training table is missing required columns: {missing_columns}")

    return df


def split_train_test(df: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame, int]:
    latest_season = int(df["season"].max())

    train_df = df[df["season"] < latest_season].copy()
    test_df = df[df["season"] == latest_season].copy()

    if train_df.empty:
        raise ValueError("Training set is empty. Add more than one season to the dataset.")
    if test_df.empty:
        raise ValueError("Test set is empty. Make sure the latest season exists in the table.")

    return train_df, test_df, latest_season


def build_model() -> Pipeline:
    return Pipeline(
        steps=[
            ("scaler", StandardScaler()),
            ("clf", LogisticRegression(max_iter=4000, random_state=42)),
        ]
    )


def build_predictions_output(test_df: pd.DataFrame, probs, preds) -> pd.DataFrame:
    output = test_df.copy()
    output["home_win_probability"] = probs
    output["away_win_probability"] = 1 - probs
    output["predicted_home_win"] = preds
    output["predicted_winner"] = output.apply(
        lambda row: row["home_team"] if row["predicted_home_win"] == 1 else row["away_team"],
        axis=1,
    )
    output["actual_winner"] = output.apply(
        lambda row: row["home_team"] if row[TARGET] == 1 else row["away_team"],
        axis=1,
    )
    output["correct"] = (output["predicted_home_win"] == output[TARGET]).astype(int)
    return output


def save_metrics(metrics: dict) -> None:
    with open(METRICS_PATH, "w", encoding="utf-8") as file:
        json.dump(metrics, file, indent=2)


def main() -> None:
    df = load_training_data()
    train_df, test_df, latest_season = split_train_test(df)

    X_train = train_df[FEATURES]
    y_train = train_df[TARGET]
    X_test = test_df[FEATURES]
    y_test = test_df[TARGET]

    model = build_model()
    model.fit(X_train, y_train)

    probs = model.predict_proba(X_test)[:, 1]
    preds = (probs >= 0.5).astype(int)

    metrics = {
        "train_seasons": sorted(train_df["season"].unique().tolist()),
        "test_season": latest_season,
        "n_train_games": int(len(train_df)),
        "n_test_games": int(len(test_df)),
        "accuracy": float(accuracy_score(y_test, preds)),
        "log_loss": float(log_loss(y_test, probs)),
    }

    predictions = build_predictions_output(test_df, probs, preds)

    joblib.dump(model, MODEL_PATH)
    predictions.to_csv(PREDICTIONS_PATH, index=False)
    save_metrics(metrics)

    print("Model trained successfully.")
    print(f"Saved model to: {MODEL_PATH}")
    print(f"Saved predictions to: {PREDICTIONS_PATH}")
    print(f"Saved metrics to: {METRICS_PATH}")
    print(json.dumps(metrics, indent=2))


if __name__ == "__main__":
    main()