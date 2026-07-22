from pathlib import Path
import nflreadpy as nfl

RAW_DIR = Path("data/raw")
RAW_DIR.mkdir(parents=True, exist_ok=True)

SEASONS = list(range(2018, 2025))

def main():
    print("Loading schedules...")
    schedules = nfl.load_schedules(seasons=SEASONS)
    schedules.write_parquet(RAW_DIR / "schedules.parquet")
    print("Saved schedules.parquet")

    print("Loading play-by-play...")
    pbp = nfl.load_pbp(seasons=SEASONS)
    pbp.write_parquet(RAW_DIR / "pbp.parquet")
    print("Saved pbp.parquet")

    # gsis_id -> espn_id crosswalk, used to build real headshot URLs for the
    # game-page banner's QB/RB imagery (see build_player_context.py).
    print("Loading player id crosswalk...")
    players = nfl.load_players()
    players.write_parquet(RAW_DIR / "player_ids.parquet")
    print("Saved player_ids.parquet")

if __name__ == "__main__":
    main()