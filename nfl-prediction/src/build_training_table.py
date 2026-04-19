from pathlib import Path

import pandas as pd


BASE_DIR = Path(__file__).resolve().parent.parent
PROCESSED_DIR = BASE_DIR / "data" / "processed"

FEATURES = [
    "season_points_pg",
    "season_points_allowed_pg",
    "season_point_diff_pg",
    "season_win_pct",
    "season_turnover_diff_pg",
    "season_ypp_off",
    "season_ypp_def",
    "season_epa_per_play",
    "season_epa_per_play_allowed",
    "season_success_rate",
    "season_success_rate_allowed",
    "season_pass_epa_per_play",
    "season_rush_epa_per_play",
    "season_sack_rate_allowed",
    "season_def_sack_rate",
    "season_qb_epa_per_play",
    "season_cpoe",
    "season_pass_oe",
    "last3_points_pg",
    "last3_points_allowed_pg",
    "last3_point_diff_pg",
    "last3_win_pct",
    "last3_turnover_diff_pg",
    "last3_ypp_off",
    "last3_ypp_def",
    "last3_epa_per_play",
    "last3_epa_per_play_allowed",
    "last3_success_rate",
    "last3_success_rate_allowed",
    "last3_pass_epa_per_play",
    "last3_rush_epa_per_play",
    "last3_sack_rate_allowed",
    "last3_def_sack_rate",
    "last3_qb_epa_per_play",
    "last3_cpoe",
    "last3_pass_oe",
]


def main() -> None:
    tg = pd.read_parquet(PROCESSED_DIR / "team_games_with_features.parquet")

    home = tg[tg["is_home"] == 1].copy()
    away = tg[tg["is_home"] == 0].copy()

    home_cols = [
        "game_id",
        "season",
        "week",
        "team",
        "opponent",
        "win",
        "spread_line",
        "home_moneyline",
        "away_moneyline",
        "home_rest",
        "away_rest",
        "div_game",
    ] + FEATURES

    away_cols = ["game_id", "team"] + FEATURES

    home = home[home_cols].rename(
        columns={
            "team": "home_team",
            "opponent": "away_team",
            "win": "home_win",
            "home_rest": "rest_home",
            "away_rest": "rest_away",
            **{c: f"home_{c}" for c in FEATURES},
        }
    )

    away = away[away_cols].rename(
        columns={
            "team": "away_team",
            **{c: f"away_{c}" for c in FEATURES},
        }
    )

    df = home.merge(away, on=["game_id", "away_team"], how="inner")

    for c in FEATURES:
        df[f"diff_{c}"] = df[f"home_{c}"] - df[f"away_{c}"]

    df["match_season_pass_off_vs_def"] = (
        df["home_season_pass_epa_per_play"] - df["away_season_epa_per_play_allowed"]
    )
    df["match_season_rush_off_vs_def"] = (
        df["home_season_rush_epa_per_play"] - df["away_season_epa_per_play_allowed"]
    )
    df["match_season_success_off_vs_def"] = (
        df["home_season_success_rate"] - df["away_season_success_rate_allowed"]
    )
    df["match_season_sack_pressure"] = (
        df["home_season_sack_rate_allowed"] - df["away_season_def_sack_rate"]
    )
    df["match_season_qb_vs_def"] = (
        df["home_season_qb_epa_per_play"] - df["away_season_epa_per_play_allowed"]
    )

    df["match_last3_pass_off_vs_def"] = (
        df["home_last3_pass_epa_per_play"] - df["away_last3_epa_per_play_allowed"]
    )
    df["match_last3_rush_off_vs_def"] = (
        df["home_last3_rush_epa_per_play"] - df["away_last3_epa_per_play_allowed"]
    )
    df["match_last3_success_off_vs_def"] = (
        df["home_last3_success_rate"] - df["away_last3_success_rate_allowed"]
    )
    df["match_last3_sack_pressure"] = (
        df["home_last3_sack_rate_allowed"] - df["away_last3_def_sack_rate"]
    )
    df["match_last3_qb_vs_def"] = (
        df["home_last3_qb_epa_per_play"] - df["away_last3_epa_per_play_allowed"]
    )

    df["home_field"] = 1
    df["rest_diff"] = df["rest_home"] - df["rest_away"]
    df["div_game"] = pd.to_numeric(df["div_game"], errors="coerce").fillna(0).astype(int)
    df["spread_line"] = pd.to_numeric(df["spread_line"], errors="coerce").fillna(0.0)
    df["home_moneyline"] = pd.to_numeric(df["home_moneyline"], errors="coerce").fillna(0.0)
    df["away_moneyline"] = pd.to_numeric(df["away_moneyline"], errors="coerce").fillna(0.0)

    final_cols = [
        "game_id",
        "season",
        "week",
        "home_team",
        "away_team",
        "home_win",
        "home_field",
        "rest_diff",
        "div_game",
        "spread_line",
        "home_moneyline",
        "away_moneyline",
        "match_season_pass_off_vs_def",
        "match_season_rush_off_vs_def",
        "match_season_success_off_vs_def",
        "match_season_sack_pressure",
        "match_season_qb_vs_def",
        "match_last3_pass_off_vs_def",
        "match_last3_rush_off_vs_def",
        "match_last3_success_off_vs_def",
        "match_last3_sack_pressure",
        "match_last3_qb_vs_def",
    ] + [f"diff_{c}" for c in FEATURES]

    df = df[final_cols].copy()

    out_path = PROCESSED_DIR / "game_training_table.csv"
    df.to_csv(out_path, index=False)

    print(f"Saved: {out_path}")
    print(f"Rows: {len(df)}")
    print(df.head())


if __name__ == "__main__":
    main()