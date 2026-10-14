-- ─── Settings: hide me from leaderboards, delete my account (§7) ────────────
alter table public.profiles
  add column if not exists hide_from_leaderboards boolean not null default false;

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
    -- People who hid themselves are left off everyone's board but their own.
    where not pr.hide_from_leaderboards or pr.id = auth.uid()
  )
  select user_id, handle, display_name, favorite_team, wins, losses, stake_units,
         clark_wins, clark_losses, board_rank, board_size
  from ranked
  where board_rank <= least(greatest(coalesce(p_limit, 50), 1), 100)
     or user_id = auth.uid()
  order by board_rank, handle;
$$;

-- Deletes the caller's account. profiles, picks, chat, comments, votes and
-- reactions all cascade from auth.users.
create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  delete from auth.users where id = auth.uid();
end $$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
