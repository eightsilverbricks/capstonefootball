from pathlib import Path
import pandas as pd

BASE_DIR = Path(__file__).resolve().parent.parent
RAW_DIR = BASE_DIR / "data" / "raw"
PROCESSED_DIR = BASE_DIR / "data" / "processed"
PROCESSED_DIR.mkdir(parents=True, exist_ok=True)


def main():
    schedules = pd.read_parquet(RAW_DIR / "schedules.parquet")

    games = schedules.copy()

    needed = [
        "season",
        "week",
        "game_id",
        "gameday",
        "home_team",
        "away_team",
        "home_score",
        "away_score",
    ]
    games = games[needed].dropna(subset=["home_score", "away_score"]).copy()

    games["gameday"] = pd.to_datetime(games["gameday"])
    games["home_win"] = (games["home_score"] > games["away_score"]).astype(int)

    home = games.rename(
        columns={
            "home_team": "team",
            "away_team": "opponent",
            "home_score": "points_for",
            "away_score": "points_against",
        }
    ).copy()
    home["is_home"] = 1
    home["win"] = (home["points_for"] > home["points_against"]).astype(int)

    away = games.rename(
        columns={
            "away_team": "team",
            "home_team": "opponent",
            "away_score": "points_for",
            "home_score": "points_against",
        }
    ).copy()
    away["is_home"] = 0
    away["win"] = (away["points_for"] > away["points_against"]).astype(int)

    team_games = pd.concat([home, away], ignore_index=True)
    team_games = team_games.sort_values(
        ["team", "season", "gameday", "game_id"]
    ).reset_index(drop=True)

    team_games["point_diff"] = team_games["points_for"] - team_games["points_against"]

    grouped = team_games.groupby("team", group_keys=False)

    team_games["season_points_pg"] = grouped["points_for"].transform(
        lambda s: s.shift(1).expanding().mean()
    )
    team_games["season_points_allowed_pg"] = grouped["points_against"].transform(
        lambda s: s.shift(1).expanding().mean()
    )
    team_games["season_point_diff_pg"] = grouped["point_diff"].transform(
        lambda s: s.shift(1).expanding().mean()
    )
    team_games["season_win_pct"] = grouped["win"].transform(
        lambda s: s.shift(1).expanding().mean()
    )

    team_games["last3_points_pg"] = grouped["points_for"].transform(
        lambda s: s.shift(1).rolling(3, min_periods=1).mean()
    )
    team_games["last3_points_allowed_pg"] = grouped["points_against"].transform(
        lambda s: s.shift(1).rolling(3, min_periods=1).mean()
    )
    team_games["last3_point_diff_pg"] = grouped["point_diff"].transform(
        lambda s: s.shift(1).rolling(3, min_periods=1).mean()
    )
    team_games["last3_win_pct"] = grouped["win"].transform(
        lambda s: s.shift(1).rolling(3, min_periods=1).mean()
    )

    feature_cols = [
        "season_points_pg",
        "season_points_allowed_pg",
        "season_point_diff_pg",
        "season_win_pct",
        "last3_points_pg",
        "last3_points_allowed_pg",
        "last3_point_diff_pg",
        "last3_win_pct",
    ]

    team_games = team_games.dropna(subset=feature_cols).copy()

    out_path = PROCESSED_DIR / "team_games_with_features.parquet"
    team_games.to_parquet(out_path, index=False)

    print(f"Saved: {out_path}")
    print(f"Rows: {len(team_games)}")


if __name__ == "__main__":
    main()