from pathlib import Path

import pandas as pd


BASE_DIR = Path(__file__).resolve().parent.parent
RAW_DIR = BASE_DIR / "data" / "raw"
PROCESSED_DIR = BASE_DIR / "data" / "processed"
PROCESSED_DIR.mkdir(parents=True, exist_ok=True)


def build_pbp_team_stats(pbp: pd.DataFrame) -> pd.DataFrame:
    plays = pbp.copy()

    required_cols = [
        "game_id",
        "posteam",
        "defteam",
        "play_type",
        "yards_gained",
        "epa",
        "success",
        "interception",
        "fumble_lost",
        "sack",
        "qb_dropback",
        "pass",
        "rush",
        "qb_epa",
        "cpoe",
        "pass_oe",
    ]
    missing = [col for col in required_cols if col not in plays.columns]
    if missing:
        raise ValueError(f"Missing required pbp columns: {missing}")

    plays = plays[plays["posteam"].notna() & plays["defteam"].notna()].copy()
    plays = plays[plays["play_type"].isin(["pass", "run", "no_play"])].copy()

    for col in [
        "yards_gained",
        "epa",
        "success",
        "interception",
        "fumble_lost",
        "sack",
        "qb_dropback",
        "pass",
        "rush",
        "qb_epa",
        "cpoe",
        "pass_oe",
    ]:
        plays[col] = pd.to_numeric(plays[col], errors="coerce").fillna(0)

    offense = (
        plays.groupby(["game_id", "posteam"], as_index=False)
        .agg(
            offensive_plays=("yards_gained", "count"),
            offensive_yards=("yards_gained", "sum"),
            total_epa=("epa", "sum"),
            successful_plays=("success", "sum"),
            turnovers_committed=("interception", "sum"),
            fumbles_lost=("fumble_lost", "sum"),
            sacks_allowed=("sack", "sum"),
            dropbacks=("qb_dropback", "sum"),
            pass_plays=("pass", "sum"),
            rush_plays=("rush", "sum"),
            qb_epa_total=("qb_epa", "sum"),
            cpoe_avg=("cpoe", "mean"),
            pass_oe_avg=("pass_oe", "mean"),
            pass_epa_total=("epa", lambda s: s[plays.loc[s.index, "pass"] == 1].sum()),
            rush_epa_total=("epa", lambda s: s[plays.loc[s.index, "rush"] == 1].sum()),
        )
        .rename(columns={"posteam": "team"})
    )

    defense = (
        plays.groupby(["game_id", "defteam"], as_index=False)
        .agg(
            defensive_plays=("yards_gained", "count"),
            yards_allowed=("yards_gained", "sum"),
            epa_allowed_total=("epa", "sum"),
            successful_plays_allowed=("success", "sum"),
            takeaways=("interception", "sum"),
            sacks_made=("sack", "sum"),
            opponent_dropbacks=("qb_dropback", "sum"),
        )
        .rename(columns={"defteam": "team"})
    )

    team_stats = offense.merge(defense, on=["game_id", "team"], how="outer").fillna(0)

    team_stats["turnovers_committed"] = (
        team_stats["turnovers_committed"] + team_stats["fumbles_lost"]
    )
    team_stats["turnover_diff"] = team_stats["takeaways"] - team_stats["turnovers_committed"]

    team_stats["ypp_off"] = team_stats["offensive_yards"] / team_stats["offensive_plays"].replace(0, pd.NA)
    team_stats["ypp_def"] = team_stats["yards_allowed"] / team_stats["defensive_plays"].replace(0, pd.NA)

    team_stats["epa_per_play"] = team_stats["total_epa"] / team_stats["offensive_plays"].replace(0, pd.NA)
    team_stats["epa_per_play_allowed"] = team_stats["epa_allowed_total"] / team_stats["defensive_plays"].replace(0, pd.NA)

    team_stats["success_rate"] = team_stats["successful_plays"] / team_stats["offensive_plays"].replace(0, pd.NA)
    team_stats["success_rate_allowed"] = (
        team_stats["successful_plays_allowed"] / team_stats["defensive_plays"].replace(0, pd.NA)
    )

    team_stats["pass_epa_per_play"] = team_stats["pass_epa_total"] / team_stats["pass_plays"].replace(0, pd.NA)
    team_stats["rush_epa_per_play"] = team_stats["rush_epa_total"] / team_stats["rush_plays"].replace(0, pd.NA)

    team_stats["qb_epa_per_play"] = team_stats["qb_epa_total"] / team_stats["dropbacks"].replace(0, pd.NA)
    team_stats["cpoe"] = team_stats["cpoe_avg"]
    team_stats["pass_oe"] = team_stats["pass_oe_avg"]

    team_stats["sack_rate_allowed"] = team_stats["sacks_allowed"] / team_stats["dropbacks"].replace(0, pd.NA)
    team_stats["def_sack_rate"] = team_stats["sacks_made"] / team_stats["opponent_dropbacks"].replace(0, pd.NA)

    fill_zero_cols = [
        "ypp_off",
        "ypp_def",
        "epa_per_play",
        "epa_per_play_allowed",
        "success_rate",
        "success_rate_allowed",
        "pass_epa_per_play",
        "rush_epa_per_play",
        "sack_rate_allowed",
        "def_sack_rate",
        "qb_epa_per_play",
        "cpoe",
        "pass_oe",
    ]
    for col in fill_zero_cols:
        team_stats[col] = team_stats[col].fillna(0.0)

    keep_cols = [
        "game_id",
        "team",
        "turnover_diff",
        "ypp_off",
        "ypp_def",
        "epa_per_play",
        "epa_per_play_allowed",
        "success_rate",
        "success_rate_allowed",
        "pass_epa_per_play",
        "rush_epa_per_play",
        "sack_rate_allowed",
        "def_sack_rate",
        "qb_epa_per_play",
        "cpoe",
        "pass_oe",
    ]
    return team_stats[keep_cols]


def main() -> None:
    schedules = pd.read_parquet(RAW_DIR / "schedules.parquet")
    pbp = pd.read_parquet(RAW_DIR / "pbp.parquet")

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
        "spread_line",
        "home_moneyline",
        "away_moneyline",
        "home_rest",
        "away_rest",
        "div_game",
    ]
    games = games[needed].dropna(subset=["home_score", "away_score"]).copy()

    games["gameday"] = pd.to_datetime(games["gameday"])

    pbp_team_stats = build_pbp_team_stats(pbp)

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
    team_games = team_games.merge(pbp_team_stats, on=["game_id", "team"], how="left")

    fill_zero_cols = [
        "turnover_diff",
        "ypp_off",
        "ypp_def",
        "epa_per_play",
        "epa_per_play_allowed",
        "success_rate",
        "success_rate_allowed",
        "pass_epa_per_play",
        "rush_epa_per_play",
        "sack_rate_allowed",
        "def_sack_rate",
        "qb_epa_per_play",
        "cpoe",
        "pass_oe",
    ]
    for col in fill_zero_cols:
        team_games[col] = team_games[col].fillna(0.0)

    team_games = team_games.sort_values(
        ["team", "season", "gameday", "game_id"]
    ).reset_index(drop=True)

    team_games["point_diff"] = team_games["points_for"] - team_games["points_against"]

    grouped = team_games.groupby("team", group_keys=False)

    season_stats = {
        "season_points_pg": "points_for",
        "season_points_allowed_pg": "points_against",
        "season_point_diff_pg": "point_diff",
        "season_win_pct": "win",
        "season_turnover_diff_pg": "turnover_diff",
        "season_ypp_off": "ypp_off",
        "season_ypp_def": "ypp_def",
        "season_epa_per_play": "epa_per_play",
        "season_epa_per_play_allowed": "epa_per_play_allowed",
        "season_success_rate": "success_rate",
        "season_success_rate_allowed": "success_rate_allowed",
        "season_pass_epa_per_play": "pass_epa_per_play",
        "season_rush_epa_per_play": "rush_epa_per_play",
        "season_sack_rate_allowed": "sack_rate_allowed",
        "season_def_sack_rate": "def_sack_rate",
        "season_qb_epa_per_play": "qb_epa_per_play",
        "season_cpoe": "cpoe",
        "season_pass_oe": "pass_oe",
    }

    for new_col, source_col in season_stats.items():
        team_games[new_col] = grouped[source_col].transform(
            lambda s: s.shift(1).expanding().mean()
        )

    last3_stats = {
        "last3_points_pg": "points_for",
        "last3_points_allowed_pg": "points_against",
        "last3_point_diff_pg": "point_diff",
        "last3_win_pct": "win",
        "last3_turnover_diff_pg": "turnover_diff",
        "last3_ypp_off": "ypp_off",
        "last3_ypp_def": "ypp_def",
        "last3_epa_per_play": "epa_per_play",
        "last3_epa_per_play_allowed": "epa_per_play_allowed",
        "last3_success_rate": "success_rate",
        "last3_success_rate_allowed": "success_rate_allowed",
        "last3_pass_epa_per_play": "pass_epa_per_play",
        "last3_rush_epa_per_play": "rush_epa_per_play",
        "last3_sack_rate_allowed": "sack_rate_allowed",
        "last3_def_sack_rate": "def_sack_rate",
        "last3_qb_epa_per_play": "qb_epa_per_play",
        "last3_cpoe": "cpoe",
        "last3_pass_oe": "pass_oe",
    }

    for new_col, source_col in last3_stats.items():
        team_games[new_col] = grouped[source_col].transform(
            lambda s: s.shift(1).rolling(3, min_periods=1).mean()
        )

    feature_cols = list(season_stats.keys()) + list(last3_stats.keys())
    team_games = team_games.dropna(subset=feature_cols).copy()

    out_path = PROCESSED_DIR / "team_games_with_features.parquet"
    team_games.to_parquet(out_path, index=False)

    print(f"Saved: {out_path}")
    print(f"Rows: {len(team_games)}")


if __name__ == "__main__":
    main()