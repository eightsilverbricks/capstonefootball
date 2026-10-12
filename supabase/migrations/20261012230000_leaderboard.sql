-- ── Leaderboard ──────────────────────────────────────────────────────────────
-- Ranks fans server-side so the browser downloads the top of the board plus the
-- caller's own row, never every pick in the database.
--
-- Outcomes live in predictions.json, not here, so the caller passes them in:
--   results = {"<game_key>": {"winner": "DAL", "clark": "DAL", "week": 5}, ...}
-- Only games with a winner are graded. A caller who lies about results only
-- changes the board they see; nothing is written.
--
-- stake_units is Σ ±(2·confidence − 1); the client multiplies by
-- GAME_CREDIT_CAP so competition/scoring.ts stays the only place that number
-- is defined. clark_wins/losses are Clark's record on the same games the fan
-- picked, so "vs Clark" is like for like.
--
-- p_sort: 'points' (default) or 'vs_clark' (wins minus Clark's wins first).
create or replace function public.leaderboard(
  results jsonb,
  p_week  int  default null,
  p_sort  text default 'points',
  p_limit int  default 50
)
returns table (
  user_id       uuid,
  handle        text,
  display_name  text,
  favorite_team text,
  wins          int,
  losses        int,
  stake_units   numeric,
  clark_wins    int,
  clark_losses  int,
  board_rank    bigint,
  board_size    bigint
)
language sql
stable
set search_path = public
as $$
  with graded as (
    select r.key                    as game_key,
           r.value->>'winner'       as winner,
           r.value->>'clark'        as clark
    from jsonb_each(coalesce(results, '{}'::jsonb)) r
    where jsonb_typeof(r.value) = 'object'
      and r.value->>'winner' is not null
      and (p_week is null or (r.value->>'week') = p_week::text)
  ),
  per_user as (
    select p.user_id,
           count(*) filter (where p.team = g.winner)::int                          as wins,
           count(*) filter (where p.team <> g.winner)::int                         as losses,
           sum(case when p.team = g.winner then 1 else -1 end * (2 * p.confidence - 1)) as stake_units,
           count(*) filter (where g.clark = g.winner)::int                         as clark_wins,
           count(*) filter (where g.clark is not null and g.clark <> g.winner)::int as clark_losses
    from public.picks p
    join graded g on g.game_key = p.game_key
    group by p.user_id
  ),
  ranked as (
    select u.user_id, pr.handle, pr.display_name, pr.favorite_team,
           u.wins, u.losses, u.stake_units, u.clark_wins, u.clark_losses,
           rank() over (
             order by case when p_sort = 'vs_clark' then u.wins - u.clark_wins else 0 end desc,
                      u.stake_units desc,
                      u.wins desc
           ) as board_rank,
           count(*) over () as board_size
    from per_user u
    join public.profiles pr on pr.id = u.user_id
  )
  select user_id, handle, display_name, favorite_team, wins, losses, stake_units,
         clark_wins, clark_losses, board_rank, board_size
  from ranked
  where board_rank <= least(greatest(coalesce(p_limit, 50), 1), 100)
     or user_id = auth.uid()
  order by board_rank, handle;
$$;

comment on function public.leaderboard(jsonb, int, text, int) is
  'Top of the fan leaderboard plus the caller''s row. Results are passed in from predictions.json.';

grant execute on function public.leaderboard(jsonb, int, text, int) to anon, authenticated;
