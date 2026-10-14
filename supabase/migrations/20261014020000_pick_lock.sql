-- ─── Picks lock at kickoff, enforced by the database ─────────────────────────
-- The site hides the slider at kickoff, but the API would still accept a pick
-- made mid-game. Once live-sync has seen a game start (live_games.status 'in'
-- or 'post') or written its result, inserts and changes are refused.
-- The demo season (2024) stays open on purpose: it is a completed season that
-- visitors pick to see how scoring works.
create or replace function public.enforce_pick_lock()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.game_key like '2024\_%' then
    return new;
  end if;
  if exists (select 1 from live_games where game_key = new.game_key and status in ('in', 'post'))
     or exists (select 1 from results where game_key = new.game_key) then
    raise exception 'Picks for this game locked at kickoff.' using errcode = 'P0001';
  end if;
  return new;
end $$;

drop trigger if exists picks_lock_at_kickoff on public.picks;
create trigger picks_lock_at_kickoff
  before insert or update on public.picks
  for each row execute function public.enforce_pick_lock();
