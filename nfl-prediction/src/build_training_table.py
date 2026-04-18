from pathlib import Path
import pandas as pd

BASE_DIR = Path(__file__).resolve().parent.parent
PROCESSED_DIR = BASE_DIR / "data" / "processed"

FEATURES = [
    "season_points_pg",
    "season_points_allowed_pg",
    "season_point_diff_pg",
    "season_win_pct",
    "last3_points_pg",
    "last3_points_allowed_pg",
    "last3_point_diff_pg",
    "last3_win_pct",
]


def main():
    tg = pd.read_parquet(PROCESSED_DIR / "team_games_with_features.parquet")

    home = tg[tg["is_home"] == 1].copy()
    away = tg[tg["is_home"] == 0].copy()

    home = home[
        ["game_id", "season", "week", "team", "opponent", "win"] + FEATURES
    ].rename(
        columns={
            "team": "home_team",
            "opponent": "away_team",
            "win": "home_win",
            **{c: f"home_{c}" for c in FEATURES},
        }
    )

    away = away[
        ["game_id", "team"] + FEATURES
    ].rename(
        columns={
            "team": "away_team",
            **{c: f"away_{c}" for c in FEATURES},
        }
    )

    df = home.merge(away, on=["game_id", "away_team"], how="inner")

    for c in FEATURES:
        df[f"diff_{c}"] = df[f"home_{c}"] - df[f"away_{c}"]

    df["home_field"] = 1

    final_cols = [
        "game_id",
        "season",
        "week",
        "home_team",
        "away_team",
        "home_win",
        "home_field",
    ] + [f"diff_{c}" for c in FEATURES]

    df = df[final_cols].copy()

    out_path = PROCESSED_DIR / "game_training_table.csv"
    df.to_csv(out_path, index=False)

    print(f"Saved: {out_path}")
    print(f"Rows: {len(df)}")
    print(df.head())
    

if __name__ == "__main__":
    main()