from pathlib import Path
import nflreadpy as nfl

RAW_DIR = Path("data/raw")
RAW_DIR.mkdir(parents=True, exist_ok=True)

# Schedules run one season ahead of play-by-play: the upcoming season's fixtures
# are published months before a snap is taken, and those unplayed rows are what
# the model predicts. nflreadpy raises if asked for play-by-play it does not
# have, so the two ranges are deliberately separate — keep PBP_SEASONS ending at
# the last *completed* season.
# History starts at 2006, not earlier: cpoe, pass_oe and xpass are all NaN before
# then (nflfastR's completion/pass-rate models need air-yards charting that only
# exists from 2006), and the fill-zero pass in build_team_game_stats.py would
# quietly turn those NaNs into league-average-looking zeros for every old season.
FIRST_SEASON = 2006
PBP_SEASONS = list(range(FIRST_SEASON, 2026))       # through 2025, all played
SCHEDULE_SEASONS = list(range(FIRST_SEASON, 2027))  # through 2026, incl. fixtures

def main():
    print("Loading schedules...")
    schedules = nfl.load_schedules(seasons=SCHEDULE_SEASONS)
    schedules.write_parquet(RAW_DIR / "schedules.parquet")
    print("Saved schedules.parquet")

    print("Loading play-by-play...")
    pbp = nfl.load_pbp(seasons=PBP_SEASONS)
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