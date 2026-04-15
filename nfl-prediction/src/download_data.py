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

if __name__ == "__main__":
    main()