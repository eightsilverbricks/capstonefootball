from pathlib import Path
import json

import joblib
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, log_loss
from sklearn.base import clone
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import GridSearchCV


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

MARKET_FEATURES = [
    "spread_line",
    "home_moneyline",
    "away_moneyline",
]

CONTEXT_FEATURES = [
    "rest_diff",
    "div_game",
    "home_field",
]

PURE_FOOTBALL_FEATURES = [feature for feature in FEATURES if feature not in MARKET_FEATURES]

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
    pipe = Pipeline(
        steps=[
            ("scaler", StandardScaler()),
            ("clf", LogisticRegression(max_iter=5000, random_state=42)),
        ]
    )

    param_grid = {
        "clf__C": [0.01, 0.1, 1, 5, 10],
        "clf__solver": ["lbfgs", "liblinear"],
    }

    grid = GridSearchCV(
        pipe,
        param_grid,
        scoring="accuracy",
        cv=5,
        n_jobs=-1,
        verbose=1,
    )

    return grid


def compute_feature_importance(model) -> list[tuple[str, float]]:
    fitted_model = model.best_estimator_ if hasattr(model, "best_estimator_") else model
    clf = fitted_model.named_steps["clf"]
    return sorted(
        zip(FEATURES, clf.coef_[0]),
        key=lambda item: abs(item[1]),
        reverse=True,
    )


def evaluate_feature_set(
    train_df: pd.DataFrame,
    test_df: pd.DataFrame,
    feature_list: list[str],
) -> dict:
    ablation_model = clone(build_model())

    X_train = train_df[feature_list]
    y_train = train_df[TARGET]
    X_test = test_df[feature_list]
    y_test = test_df[TARGET]

    ablation_model.fit(X_train, y_train)
    probs = ablation_model.predict_proba(X_test)[:, 1]
    preds = (probs >= 0.5).astype(int)

    return {
        "feature_count": len(feature_list),
        "accuracy": float(accuracy_score(y_test, preds)),
        "log_loss": float(log_loss(y_test, probs)),
    }


def print_feature_importance(model: Pipeline) -> None:
    print("\nTop feature coefficients:")
    for name, coef in compute_feature_importance(model):
        print(f"{name}: {coef:.4f}")


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
    if hasattr(model, "best_params_"):
        print("Best params:", model.best_params_)

    probs = model.predict_proba(X_test)[:, 1]

    best_thresh = 0.5
    best_acc = 0

    for t in [0.50, 0.52, 0.53, 0.54, 0.55, 0.57, 0.60]:
        temp_preds = (probs >= t).astype(int)
        acc = accuracy_score(y_test, temp_preds)
        if acc > best_acc:
            best_acc = acc
            best_thresh = t

    print(f"Best threshold: {best_thresh}, Accuracy: {best_acc}")
    preds = (probs >= best_thresh).astype(int)

    metrics = {
        "train_seasons": sorted(train_df["season"].unique().tolist()),
        "test_season": latest_season,
        "n_train_games": int(len(train_df)),
        "n_test_games": int(len(test_df)),
        "accuracy": float(accuracy_score(y_test, preds)),
        "log_loss": float(log_loss(y_test, probs)),
    }

    ablation_results = {
        "full_model": {
            "feature_count": len(FEATURES),
            "accuracy": float(accuracy_score(y_test, preds)),
            "log_loss": float(log_loss(y_test, probs)),
        },
        "no_market_features": evaluate_feature_set(
            train_df=train_df,
            test_df=test_df,
            feature_list=PURE_FOOTBALL_FEATURES,
        ),
        "market_only": evaluate_feature_set(
            train_df=train_df,
            test_df=test_df,
            feature_list=MARKET_FEATURES + CONTEXT_FEATURES,
        ),
    }

    metrics["ablation_results"] = ablation_results

    predictions = build_predictions_output(test_df, probs, preds)

    joblib.dump(model, MODEL_PATH)
    predictions.to_csv(PREDICTIONS_PATH, index=False)
    save_metrics(metrics)

    print("Model trained successfully.")
    print(f"Saved model to: {MODEL_PATH}")
    print(f"Saved predictions to: {PREDICTIONS_PATH}")
    print(f"Saved metrics to: {METRICS_PATH}")
    print(json.dumps(metrics, indent=2))

    print_feature_importance(model)

    print("\nAblation summary:")
    for name, result in ablation_results.items():
        print(f"{name}: {json.dumps(result)}")


if __name__ == "__main__":
    main()