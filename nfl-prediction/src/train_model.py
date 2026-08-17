from pathlib import Path
import json
from typing import Any

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

# Implied probability rather than raw American odds, plus explicit flags for
# whether a line exists at all — see src/features.py for why. `home_field` is
# deliberately absent: it is 1 for every row, so it has zero variance and the
# scaler zeroes it out. It was never a feature, only an intercept in disguise.
MARKET_FEATURES = [
    "mkt_home_prob",
    "has_market",
    "spread_line_clean",
    "has_spread",
]

CONTEXT_FEATURES = [
    "rest_diff",
    "div_game",
]

RATING_FEATURES = [
    "elo_diff",
]

RECENT_FORM_FEATURES = [
    "diff_last3_point_diff_pg",
    "diff_last3_win_pct",
    "diff_last3_epa_per_play",
    "diff_last3_epa_per_play_allowed",
    "diff_last3_success_rate",
    "diff_last3_success_rate_allowed",
]

SEASON_FORM_FEATURES = [
    "diff_season_epa_per_play",
    "diff_season_epa_per_play_allowed",
    "diff_season_success_rate",
    "diff_season_qb_epa_per_play",
    "diff_season_turnover_diff_pg",
]

PRODUCTION_FEATURES = (
    MARKET_FEATURES
    + CONTEXT_FEATURES
    + RATING_FEATURES
    + RECENT_FORM_FEATURES
    + SEASON_FORM_FEATURES
)
PRODUCTION_MODEL_NAME = "market_elo_form"

# Scored on games with no posted line, which is most of an upcoming season. The
# production model degrades to roughly this set once mkt_home_prob is a neutral
# 0.5, so it is tracked explicitly rather than assumed.
NO_MARKET_FEATURES = (
    CONTEXT_FEATURES + RATING_FEATURES + RECENT_FORM_FEATURES + SEASON_FORM_FEATURES
)

# The legacy FEATURES list still carries the raw odds columns, so the ablation
# has to exclude those by name — MARKET_FEATURES now holds the encoded versions.
RAW_MARKET_FEATURES = ["spread_line", "home_moneyline", "away_moneyline"]

PURE_FOOTBALL_FEATURES = [
    feature for feature in FEATURES if feature not in RAW_MARKET_FEATURES
]

TARGET = "home_win"

FEATURE_LABELS = {
    "spread_line": "Closing spread",
    "spread_line_clean": "Closing spread",
    "has_spread": "Spread posted",
    "home_moneyline": "Home moneyline",
    "away_moneyline": "Away moneyline",
    "mkt_home_prob": "Market win probability",
    "has_market": "Market line posted",
    "elo_diff": "Elo rating edge",
    "rest_diff": "Rest differential",
    "div_game": "Division matchup",
    "home_field": "Home field",
    "diff_season_epa_per_play": "Season offensive EPA",
    "diff_season_epa_per_play_allowed": "Season defensive EPA allowed",
    "diff_season_success_rate": "Season success rate",
    "diff_season_qb_epa_per_play": "Season QB EPA",
    "diff_season_turnover_diff_pg": "Season turnover margin",
    "diff_last3_point_diff_pg": "Recent point differential",
    "diff_last3_win_pct": "Recent win rate",
    "diff_last3_epa_per_play": "Recent offensive EPA",
    "diff_last3_epa_per_play_allowed": "Recent defensive EPA allowed",
    "diff_last3_success_rate": "Recent offensive success rate",
    "diff_last3_success_rate_allowed": "Recent defensive success allowed",
}


def binary_log_loss(y_true, y_prob) -> float:
    return float(log_loss(y_true, y_prob, labels=[0, 1]))


def load_training_data() -> pd.DataFrame:
    if not TRAINING_TABLE_PATH.exists():
        raise FileNotFoundError(
            f"Missing training table: {TRAINING_TABLE_PATH}. "
            "Build game_training_table.csv before training the model."
        )

    df = pd.read_csv(TRAINING_TABLE_PATH)

    required_columns = FEATURES + [TARGET, "season", "home_team", "away_team", "is_played"]
    missing_columns = [col for col in required_columns if col not in df.columns]
    if missing_columns:
        raise ValueError(f"Training table is missing required columns: {missing_columns}")

    # Played games only. The table also carries the upcoming season's fixtures so
    # the exporter can score them, but they have no home_win — left in, they would
    # become `latest_season` in split_train_test() and the whole evaluation would
    # "test" against a column of NaN.
    played = df[df["is_played"]].copy()
    if played.empty:
        raise ValueError("Training table contains no played games.")

    return played


def sort_games(df: pd.DataFrame) -> pd.DataFrame:
    sort_columns = [col for col in ["season", "week", "gameday", "game_id"] if col in df.columns]
    return df.sort_values(sort_columns).reset_index(drop=True)


def split_train_test(df: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame, int]:
    latest_season = int(df["season"].max())

    train_df = sort_games(df[df["season"] < latest_season].copy())
    test_df = sort_games(df[df["season"] == latest_season].copy())

    if train_df.empty:
        raise ValueError("Training set is empty. Add more than one season to the dataset.")
    if test_df.empty:
        raise ValueError("Test set is empty. Make sure the latest season exists in the table.")

    return train_df, test_df, latest_season


def fit_model(train_df: pd.DataFrame, feature_list: list[str] = FEATURES) -> Pipeline:
    model = build_model()
    model.fit(train_df[feature_list], train_df[TARGET])
    return model


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
        n_jobs=1,
        verbose=0,
    )

    return grid


def compute_feature_importance(
    model,
    feature_list: list[str] = PRODUCTION_FEATURES,
) -> list[tuple[str, float]]:
    fitted_model = model.best_estimator_ if hasattr(model, "best_estimator_") else model
    clf = fitted_model.named_steps["clf"]
    return sorted(
        zip(feature_list, clf.coef_[0]),
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
        "log_loss": binary_log_loss(y_test, probs),
    }


def evaluate_feature_set_expanding(
    df: pd.DataFrame,
    test_df: pd.DataFrame,
    latest_season: int,
    feature_list: list[str],
) -> dict:
    outputs = []

    for week in sorted(test_df["week"].unique()):
        train_df = sort_games(
            df[
                (df["season"] < latest_season)
                | ((df["season"] == latest_season) & (df["week"] < week))
            ].copy()
        )
        week_df = test_df[test_df["week"] == week].copy()

        if train_df.empty or week_df.empty:
            continue

        model = fit_model(train_df, feature_list)
        probs = model.predict_proba(week_df[feature_list])[:, 1]
        preds = (probs >= 0.5).astype(int)
        output = build_predictions_output(week_df, probs, preds)
        outputs.append(output)

    if not outputs:
        raise ValueError("No weekly predictions were generated for feature evaluation.")

    predictions = pd.concat(outputs, ignore_index=True)

    return {
        "feature_count": len(feature_list),
        "accuracy": float(accuracy_score(predictions[TARGET], predictions["predicted_home_win"])),
        "log_loss": binary_log_loss(predictions[TARGET], predictions["home_win_probability"]),
    }


def print_feature_importance(
    model: Pipeline,
    feature_list: list[str] = PRODUCTION_FEATURES,
) -> None:
    print("\nTop feature coefficients:")
    for name, coef in compute_feature_importance(model, feature_list):
        print(f"{name}: {coef:.4f}")


def format_feature_value(feature: str, value: Any) -> str:
    if feature in {"home_moneyline", "away_moneyline"}:
        return f"{int(value):+d}"
    if feature in {"spread_line", "spread_line_clean"}:
        return f"{float(value):+.1f}"
    if feature == "mkt_home_prob":
        return f"{float(value):.1%}"
    if feature in {"has_market", "has_spread"}:
        return "Posted" if int(value) == 1 else "No line yet"
    if feature == "elo_diff":
        return f"{float(value):+.0f} Elo"
    if feature == "rest_diff":
        days = abs(int(value))
        return f"{int(value):+d} day{'s' if days != 1 else ''}"
    if feature == "div_game":
        return "Yes" if int(value) == 1 else "No"
    if feature == "home_field":
        return "Home"
    if feature in {"diff_last3_win_pct", "diff_last3_success_rate", "diff_last3_success_rate_allowed"}:
        return f"{float(value):+.1%}"
    if feature == "diff_last3_point_diff_pg":
        return f"{float(value):+.1f} pts/game"
    return f"{float(value):+.3f}"


def display_direction(feature: str, row: pd.Series, contribution: float) -> str:
    if feature in {"spread_line", "spread_line_clean"}:
        if row[feature] > 0:
            return row["home_team"]
        if row[feature] < 0:
            return row["away_team"]
    if feature in {"mkt_home_prob", "elo_diff"}:
        # Both are home-relative: >0.5 / >0 favours the home side.
        midpoint = 0.5 if feature == "mkt_home_prob" else 0.0
        if row[feature] > midpoint:
            return row["home_team"]
        if row[feature] < midpoint:
            return row["away_team"]
    if feature == "home_moneyline":
        return row["home_team"] if row[feature] < 0 else row["away_team"]
    if feature == "away_moneyline":
        return row["away_team"] if row[feature] < 0 else row["home_team"]
    if feature == "rest_diff":
        if row[feature] > 0:
            return row["home_team"]
        if row[feature] < 0:
            return row["away_team"]
    if feature == "home_field":
        return row["home_team"]
    if feature in {
        "diff_last3_point_diff_pg",
        "diff_last3_win_pct",
        "diff_last3_epa_per_play",
        "diff_last3_success_rate",
    }:
        if row[feature] > 0:
            return row["home_team"]
        if row[feature] < 0:
            return row["away_team"]
    if feature in {"diff_last3_epa_per_play_allowed", "diff_last3_success_rate_allowed"}:
        if row[feature] > 0:
            return row["away_team"]
        if row[feature] < 0:
            return row["home_team"]
    return row["home_team"] if contribution >= 0 else row["away_team"]


def explain_prediction(
    row: pd.Series,
    model: Pipeline,
    feature_list: list[str],
) -> tuple[str, str]:
    fitted_model = model.best_estimator_ if hasattr(model, "best_estimator_") else model
    scaler = fitted_model.named_steps["scaler"]
    clf = fitted_model.named_steps["clf"]

    feature_frame = pd.DataFrame([row[feature_list].to_dict()])
    scaled_values = scaler.transform(feature_frame)[0]
    contributions = scaled_values * clf.coef_[0]

    factors = []
    for feature, contribution in zip(feature_list, contributions):
        direction = display_direction(feature, row, contribution)
        factors.append(
            {
                "feature": feature,
                "label": FEATURE_LABELS.get(feature, feature),
                "value": format_feature_value(feature, row[feature]),
                "direction": direction,
                "impact": float(abs(contribution)),
            }
        )

    factors = sorted(factors, key=lambda factor: factor["impact"], reverse=True)
    top_factors = factors[:3]
    factor_text = "; ".join(
        f"{factor['label']} {factor['value']} favored {factor['direction']}"
        for factor in top_factors
    )
    summary = (
        f"{row['predicted_winner']} was projected ahead because the strongest inputs for this "
        f"specific matchup were: {factor_text}."
    )

    return summary, json.dumps(top_factors)


def add_prediction_explanations(
    output: pd.DataFrame,
    model: Pipeline,
    feature_list: list[str],
) -> pd.DataFrame:
    explanations = output.apply(
        lambda row: explain_prediction(row, model, feature_list),
        axis=1,
        result_type="expand",
    )
    output["explanation_summary"] = explanations[0]
    output["explanation_factors"] = explanations[1]
    output["model_feature_set"] = PRODUCTION_MODEL_NAME
    return output


def build_predictions_output(
    test_df: pd.DataFrame,
    probs,
    preds,
    model: Pipeline | None = None,
    feature_list: list[str] | None = None,
) -> pd.DataFrame:
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
    if model is not None and feature_list is not None:
        output = add_prediction_explanations(output, model, feature_list)
    return sort_games(output)


def build_expanding_week_predictions(
    df: pd.DataFrame,
    test_df: pd.DataFrame,
    latest_season: int,
    feature_list: list[str],
) -> tuple[pd.DataFrame, list[dict]]:
    outputs = []
    weekly_metrics = []

    for week in sorted(test_df["week"].unique()):
        train_df = sort_games(
            df[
                (df["season"] < latest_season)
                | ((df["season"] == latest_season) & (df["week"] < week))
            ].copy()
        )
        week_df = test_df[test_df["week"] == week].copy()

        if train_df.empty or week_df.empty:
            continue

        model = fit_model(train_df, feature_list)
        probs = model.predict_proba(week_df[feature_list])[:, 1]
        preds = (probs >= 0.5).astype(int)

        output = build_predictions_output(week_df, probs, preds, model, feature_list)
        output["training_games"] = len(train_df)
        output["training_max_week_in_test_season"] = int(week) - 1
        outputs.append(output)

        weekly_metrics.append(
            {
                "week": int(week),
                "n_train_games": int(len(train_df)),
                "n_test_games": int(len(week_df)),
                "accuracy": float(accuracy_score(week_df[TARGET], preds)),
                "log_loss": binary_log_loss(week_df[TARGET], probs),
                "best_params": getattr(model, "best_params_", None),
            }
        )

        print(
            f"Week {int(week)}: trained on {len(train_df)} previous games, "
            f"predicted {len(week_df)} games"
        )

    if not outputs:
        raise ValueError("No weekly predictions were generated.")

    predictions = sort_games(pd.concat(outputs, ignore_index=True))
    return predictions, weekly_metrics


def save_metrics(metrics: dict) -> None:
    with open(METRICS_PATH, "w", encoding="utf-8") as file:
        json.dump(metrics, file, indent=2)


def main() -> None:
    df = sort_games(load_training_data())
    train_df, test_df, latest_season = split_train_test(df)

    predictions, weekly_metrics = build_expanding_week_predictions(
        df=df,
        test_df=test_df,
        latest_season=latest_season,
        feature_list=PRODUCTION_FEATURES,
    )

    final_model = fit_model(df, PRODUCTION_FEATURES)
    if hasattr(final_model, "best_params_"):
        print("Final full-data params:", final_model.best_params_)

    metrics = {
        "train_seasons": sorted(train_df["season"].unique().tolist()),
        "test_season": latest_season,
        "evaluation_type": "expanding_week",
        "production_model": PRODUCTION_MODEL_NAME,
        "production_features": PRODUCTION_FEATURES,
        "decision_threshold": 0.5,
        "n_initial_train_games": int(len(train_df)),
        "n_test_games": int(len(test_df)),
        "accuracy": float(accuracy_score(predictions[TARGET], predictions["predicted_home_win"])),
        "log_loss": binary_log_loss(predictions[TARGET], predictions["home_win_probability"]),
        "weekly_metrics": weekly_metrics,
    }

    ablation_results = {
        "full_model": {
            "feature_count": len(FEATURES),
            **evaluate_feature_set_expanding(
                df=df,
                test_df=test_df,
                latest_season=latest_season,
                feature_list=FEATURES,
            ),
        },
        "no_market_features": evaluate_feature_set_expanding(
            df=df,
            test_df=test_df,
            latest_season=latest_season,
            feature_list=PURE_FOOTBALL_FEATURES,
        ),
        "market_only": evaluate_feature_set_expanding(
            df=df,
            test_df=test_df,
            latest_season=latest_season,
            feature_list=MARKET_FEATURES + CONTEXT_FEATURES,
        ),
        "market_context_recent_form": evaluate_feature_set_expanding(
            df=df,
            test_df=test_df,
            latest_season=latest_season,
            feature_list=PRODUCTION_FEATURES,
        ),
    }

    metrics["ablation_results"] = ablation_results
    metrics["selected_result"] = ablation_results["market_context_recent_form"]

    joblib.dump(final_model, MODEL_PATH)
    predictions.to_csv(PREDICTIONS_PATH, index=False)
    save_metrics(metrics)

    print("Model trained successfully.")
    print(f"Saved model to: {MODEL_PATH}")
    print(f"Saved predictions to: {PREDICTIONS_PATH}")
    print(f"Saved metrics to: {METRICS_PATH}")
    print(json.dumps(metrics, indent=2))

    print_feature_importance(final_model, PRODUCTION_FEATURES)

    print("\nAblation summary:")
    for name, result in ablation_results.items():
        print(f"{name}: {json.dumps(result)}")


if __name__ == "__main__":
    main()
