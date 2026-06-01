"""
build_game_context.py
=====================
Builds data/processed/game_context.json from existing data files.
No new downloads required.

Outputs a dict keyed by game_id with:
  - weather: temp, wind, surface, roof, stadium, is_outdoor, weather_summary
  - home/away last-3 W-L record (pregame) and season W-L record
  - home/away last-3 scoring context

Run:
    python3 src/build_game_context.py
"""

from pathlib import Path
import json
import pandas as pd
import re

BASE_DIR  = Path(__file__).resolve().parent.parent
PBP_PATH  = BASE_DIR / "data" / "raw" / "pbp.parquet"
TGF_PATH  = BASE_DIR / "data" / "processed" / "team_games_with_features.parquet"
OUT_PATH  = BASE_DIR / "data" / "processed" / "game_context.json"


# ── Weather ────────────────────────────────────────────────────────────────────

def _normalize_surface(surface: str | None) -> str:
    if not surface or pd.isna(surface):
        return "unknown"
    s = str(surface).lower().strip()
    if s in ("grass", "grass "):
        return "grass"
    if s in ("fieldturf", "sportturf", "matrixturf", "a_turf", "astroturf"):
        return "turf"
    return "turf"


def _temp_from_weather_string(weather_str: str | None) -> float | None:
    """Parse temperature from ESPN weather string like 'Temp: 67° F, ...'."""
    if not weather_str or pd.isna(weather_str):
        return None
    m = re.search(r"Temp:\s*([\d.]+)\s*°", str(weather_str))
    return float(m.group(1)) if m else None


def _wind_from_weather_string(weather_str: str | None) -> float | None:
    """Parse wind speed from 'Wind: NE 8 mph' or 'Wind: C 13 mph'."""
    if not weather_str or pd.isna(weather_str):
        return None
    m = re.search(r"Wind:\s*\w+\s*([\d.]+)\s*mph", str(weather_str))
    return float(m.group(1)) if m else None


def _weather_summary(roof: str, temp: float | None, wind: float | None, surface: str) -> str:
    """Human-readable one-line weather note."""
    roof = str(roof or "").lower()
    if roof in ("dome", "closed"):
        return "Indoors (dome/retractable roof)"
    if roof == "open":
        return "Retractable roof (open)" + (f" · {temp:.0f}°F" if temp else "")

    # Outdoor
    parts = []
    if temp is not None:
        if temp <= 32:
            parts.append(f"{temp:.0f}°F (freezing)")
        elif temp <= 45:
            parts.append(f"{temp:.0f}°F (cold)")
        elif temp <= 60:
            parts.append(f"{temp:.0f}°F (cool)")
        else:
            parts.append(f"{temp:.0f}°F")
    if wind is not None:
        if wind >= 20:
            parts.append(f"{wind:.0f} mph wind (high)")
        elif wind >= 12:
            parts.append(f"{wind:.0f} mph wind (moderate)")
        elif wind >= 1:
            parts.append(f"{wind:.0f} mph wind")
    if surface == "grass":
        parts.append("natural grass")
    if not parts:
        return "Outdoor game"
    return " · ".join(parts)


def _is_weather_notable(roof: str, temp: float | None, wind: float | None) -> bool:
    """Returns True if weather is meaningfully unusual (cold, windy, or dome)."""
    roof = str(roof or "").lower()
    if roof in ("dome", "closed"):
        return False  # perfectly controlled — not unusual
    if temp is not None and temp <= 40:
        return True
    if wind is not None and wind >= 15:
        return True
    return False


def build_weather_lookup(pbp: pd.DataFrame) -> dict:
    """One weather dict per game_id."""
    cols_needed = ["play_id", "game_id", "home_team", "away_team", "temp", "wind",
                   "weather", "surface", "roof", "stadium"]
    avail = [c for c in cols_needed if c in pbp.columns]
    sort_col = next((c for c in ("play_id", "order_sequence") if c in avail), None)
    grouped = pbp[avail].sort_values(sort_col) if sort_col else pbp[avail]
    game_weather = (
        grouped
        .groupby("game_id")
        .first()
        .reset_index()
    )

    result = {}
    for _, row in game_weather.iterrows():
        gid = row["game_id"]

        temp = float(row["temp"]) if pd.notna(row.get("temp")) else _temp_from_weather_string(row.get("weather"))
        wind = float(row["wind"]) if pd.notna(row.get("wind")) else _wind_from_weather_string(row.get("weather"))
        roof = str(row.get("roof") or "").lower()
        surface = _normalize_surface(row.get("surface"))

        result[gid] = {
            "temp":     round(temp, 1) if temp is not None else None,
            "wind":     round(wind, 1) if wind is not None else None,
            "surface":  surface,
            "roof":     roof or None,
            "stadium":  str(row.get("stadium") or "") or None,
            "is_outdoor": roof not in ("dome", "closed"),
            "is_notable": _is_weather_notable(roof, temp, wind),
            "summary":  _weather_summary(roof, temp, wind, surface),
        }
    return result


# ── Per-team pregame records ───────────────────────────────────────────────────

def _wins_losses(win_pct: float, n_games: int) -> tuple[int, int]:
    wins = round(win_pct * n_games)
    return wins, n_games - wins


def _last3_record_string(win_pct: float) -> str:
    if pd.isna(win_pct):
        return "unknown"
    wins, losses = _wins_losses(win_pct, 3)
    return f"{wins}-{losses} last 3"


def _season_record_string(wins: int, losses: int) -> str:
    return f"{wins}-{losses}"


def build_records_lookup(tgf: pd.DataFrame) -> dict:
    """
    Returns {game_id: {home_team, away_team, home_record, away_record, ...}}

    Records are PREGAME (we use the cumulative wins/losses from all prior games
    in the same season and team, not including the current game row).
    """
    result = {}

    for (season, game_id), grp in tgf.groupby(["season", "game_id"]):
        if len(grp) < 2:
            continue  # need both teams

        home_row = grp[grp["is_home"] == 1]
        away_row = grp[grp["is_home"] == 0]
        if home_row.empty or away_row.empty:
            continue

        home = home_row.iloc[0]
        away = away_row.iloc[0]
        week = int(home["week"])

        # Cumulative pregame W-L from team_games_with_features
        # All prior rows for this team-season (week < current week)
        team_prior_home = tgf[(tgf["season"] == season) & (tgf["team"] == home["team"]) & (tgf["week"] < week)]
        team_prior_away = tgf[(tgf["season"] == season) & (tgf["team"] == away["team"]) & (tgf["week"] < week)]

        home_wins   = int(team_prior_home["win"].sum())
        home_losses = len(team_prior_home) - home_wins
        away_wins   = int(team_prior_away["win"].sum())
        away_losses = len(team_prior_away) - away_wins

        # Last-3 scoring context (pregame: use the value stored in the row,
        # which is computed before the current game is included)
        home_last3_pts    = round(float(home.get("last3_points_pg", 0) or 0), 1)
        home_last3_pts_ag = round(float(home.get("last3_points_allowed_pg", 0) or 0), 1)
        away_last3_pts    = round(float(away.get("last3_points_pg", 0) or 0), 1)
        away_last3_pts_ag = round(float(away.get("last3_points_allowed_pg", 0) or 0), 1)

        home_last3_epa = round(float(home.get("last3_epa_per_play", 0) or 0), 3)
        away_last3_epa = round(float(away.get("last3_epa_per_play", 0) or 0), 3)

        result[game_id] = {
            "home_team": home["team"],
            "away_team": away["team"],
            "home_season_record": _season_record_string(home_wins, home_losses),
            "away_season_record": _season_record_string(away_wins, away_losses),
            "home_last3_record":  _last3_record_string(float(home.get("last3_win_pct") or 0)),
            "away_last3_record":  _last3_record_string(float(away.get("last3_win_pct") or 0)),
            "home_last3_pts_for": home_last3_pts,
            "home_last3_pts_ag":  home_last3_pts_ag,
            "away_last3_pts_for": away_last3_pts,
            "away_last3_pts_ag":  away_last3_pts_ag,
            "home_last3_epa":     home_last3_epa,
            "away_last3_epa":     away_last3_epa,
        }

    return result


# ── Main ───────────────────────────────────────────────────────────────────────

def main() -> None:
    print(f"Loading PBP ({PBP_PATH.stat().st_size // 1024 // 1024} MB)…")
    pbp = pd.read_parquet(PBP_PATH)
    print(f"  {len(pbp):,} plays")

    print("Building weather lookup…")
    weather = build_weather_lookup(pbp)
    print(f"  {len(weather)} games with weather data")

    print(f"Loading team_games_with_features…")
    tgf = pd.read_parquet(TGF_PATH)
    print(f"  {len(tgf)} team-game rows")

    print("Building records lookup…")
    records = build_records_lookup(tgf)
    print(f"  {len(records)} games with record data")

    # Merge into a single game_context dict keyed by game_id
    all_game_ids = set(weather.keys()) | set(records.keys())
    context = {}
    for gid in all_game_ids:
        context[gid] = {
            **records.get(gid, {}),
            "weather": weather.get(gid, {}),
        }

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT_PATH, "w") as f:
        json.dump(context, f, separators=(",", ":"))

    size_kb = OUT_PATH.stat().st_size // 1024
    print(f"\n✅  Wrote {OUT_PATH} ({size_kb} KB) · {len(context)} games")

    # Spot-check SB
    sb_key = [k for k in context if "_22_" in k and "2024" in k]
    if sb_key:
        sb = context[sb_key[0]]
        print(f"\nSB spot-check ({sb_key[0]}):")
        print(f"  {sb.get('away_team')} @ {sb.get('home_team')}")
        print(f"  home season: {sb.get('home_season_record')}, last3: {sb.get('home_last3_record')}")
        print(f"  away season: {sb.get('away_season_record')}, last3: {sb.get('away_last3_record')}")
        print(f"  weather: {sb.get('weather', {}).get('summary')}")


if __name__ == "__main__":
    main()
