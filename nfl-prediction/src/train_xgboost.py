from pathlib import Path
import json

import joblib
import pandas as pd
from xgboost import XGBClassifier
from sklearn.metrics import accuracy_score, log_loss


BASE_DIR = Path(__file__).resolve().parent.parent
PROCESSED_DIR = BASE_DIR / "data" / "processed"
MODELS_DIR = BASE_DIR / "models"
OUTPUTS_DIR = BASE_DIR / "outputs"

MODELS_DIR.mkdir(parents=True, exist_ok=True)
OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)

TRAINING_TABLE_PATH = PROCESSED_DIR / "game_training_table.csv"
MODEL_PATH = MODELS_DIR / "xgboost_model.joblib"
PREDICTIONS_PATH = OUTPUTS_DIR / "xgboost_predictions.csv"
METRICS_PATH = OUTPUTS_DIR / "xgboost_metrics.json"

FEATURES = [
    "spread_line",
    "home_moneyline",
    "away_moneyline",
    "rest_diff",
    "div_game",
    "home_field",
    "diff_season_point_diff_pg",
    "diff_season_turnover_diff_pg",
    "diff_season_epa_per_play",
    "diff_season_epa_per_play_allowed",
    "diff_season_success_rate",
    "diff_season_success_rate_allowed",
    "diff_season_pass_epa_per_play",
    "diff_season_rush_epa_per_play",
    "diff_season_sack_rate_allowed",
    "diff_season_def_sack_rate",
    "diff_season_qb_epa_per_play",
    "diff_season_cpoe",
    "diff_season_pass_oe",
    "diff_last3_point_diff_pg",
    "diff_last3_turnover_diff_pg",
    "diff_last3_epa_per_play",
    "diff_last3_epa_per_play_allowed",
    "diff_last3_success_rate",
    "diff_last3_success_rate_allowed",
    "diff_last3_pass_epa_per_play",
    "diff_last3_rush_epa_per_play",
    "diff_last3_sack_rate_allowed",
    "diff_last3_def_sack_rate",
    "diff_last3_qb_epa_per_play",
    "diff_last3_cpoe",
    "diff_last3_pass_oe",
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


def split_train_test(df: pd.DataFrame):
    latest_season = int(df["season"].max())

    train_df = df[df["season"] < latest_season].copy()
    test_df = df[df["season"] == latest_season].copy()

    if train_df.empty or test_df.empty:
        raise ValueError("Need at least two seasons of data.")

    return train_df, test_df, latest_season


def build_model():
    return XGBClassifier(
        objective="binary:logistic",
        eval_metric="logloss",
        n_estimators=1200,
        max_depth=2,
        learning_rate=0.02,
        min_child_weight=3,
        gamma=0.1,
        subsample=0.8,
        colsample_bytree=0.65,
        reg_lambda=2.0,
        reg_alpha=0.75,
        random_state=42,
        n_jobs=-1,
        tree_method="hist",
    )


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

    feature_importance = sorted(
        zip(FEATURES, model.feature_importances_),
        key=lambda x: x[1],
        reverse=True,
    )

    metrics["top_features"] = [
        {"feature": name, "importance": float(score)}
        for name, score in feature_importance[:15]
    ]

    joblib.dump(model, MODEL_PATH)
    output.to_csv(PREDICTIONS_PATH, index=False)

    with open(METRICS_PATH, "w", encoding="utf-8") as f:
        json.dump(metrics, f, indent=2)

    print("XGBoost model trained successfully.")
    print(json.dumps(metrics, indent=2))

    print("\nTop features:")
    for name, score in feature_importance[:15]:
        print(f"{name}: {score:.4f}")


if __name__ == "__main__":
    main()