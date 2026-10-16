-- ─── Live detail: field position, drives, box score ──────────────────────────
-- Everything the Live tab needs to show the game as it happens: where the
-- ball is, timeouts, the drive chart and both teams' box score. Written by
-- live-sync every tick; read by everyone (policies from 20261014010000).

alter table public.live_games
  -- Ball spot in yards from the HOME goal line (0–100), as ESPN reports it.
  add column if not exists ball_on       int,
  add column if not exists red_zone      boolean not null default false,
  add column if not exists home_timeouts int,
  add column if not exists away_timeouts int,
  add column if not exists last_play     text,
  -- [{ id, team, description, result, start, plays, yards, scoring }] oldest first.
  add column if not exists drives        jsonb,
  -- { teams: { ABBR: { stat: value } }, leaders: { ABBR: { passing|rushing|receiving: { name, line } } } }
  add column if not exists box           jsonb;

alter table public.live_plays
  add column if not exists down       int,
  add column if not exists distance   int,
  -- Ball spot before and after the snap, yards from the HOME goal line.
  add column if not exists start_yard int,
  add column if not exists end_yard   int,
  add column if not exists scoring    boolean not null default false;
