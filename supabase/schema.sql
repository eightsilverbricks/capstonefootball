-- ─── The Clark Index — database schema ───────────────────────────────────────
-- Run this once in the Supabase SQL editor (Dashboard → SQL Editor → New query).
-- Safe to re-run: everything is IF NOT EXISTS / CREATE OR REPLACE.
--
-- Two tables:
--   profiles — one row per account, created automatically on sign-up
--   picks    — one row per (user, game); the source of truth for every stat
--
-- Every user-facing statistic in the app is derived from `picks`. Nothing is
-- stored pre-aggregated, so a record can never drift out of step with the picks
-- behind it.

-- ── profiles ─────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id            uuid primary key references auth.users on delete cascade,
  handle        text unique not null,
  display_name  text not null,
  favorite_team text,
  created_at    timestamptz not null default now()
);

comment on table public.profiles is
  'Public-facing account info. Email lives in auth.users, never here.';

-- ── picks ────────────────────────────────────────────────────────────────────
create table if not exists public.picks (
  user_id     uuid not null references public.profiles(id) on delete cascade,
  game_key    text not null,
  team        text not null,
  -- Slider space: 0.5 = no position, 1.0 = full conviction. Mirrors
  -- competition/scoring.ts, which is the only place stakes are calculated.
  confidence  numeric(4,3) not null check (confidence >= 0.5 and confidence <= 1.0),
  -- Who they rooted for when they made the call, for fanbase-level cuts.
  fan_team    text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (user_id, game_key)
);

create index if not exists picks_game_key_idx on public.picks (game_key);

comment on table public.picks is
  'One row per user per game. Every record, streak and leaderboard derives from this.';

-- ── Row level security ───────────────────────────────────────────────────────
-- Without these, the anon key would let anyone read or write anyone's data.
alter table public.profiles enable row level security;
alter table public.picks    enable row level security;

-- Profiles are readable by everyone: leaderboards and community splits need to
-- show display names. Only the owner can create or change their own row.
drop policy if exists "profiles are publicly readable" on public.profiles;
create policy "profiles are publicly readable"
  on public.profiles for select using (true);

drop policy if exists "users insert their own profile" on public.profiles;
create policy "users insert their own profile"
  on public.profiles for insert with check (auth.uid() = id);

drop policy if exists "users update their own profile" on public.profiles;
create policy "users update their own profile"
  on public.profiles for update using (auth.uid() = id);

-- Picks are publicly readable so community sentiment ("62% of fans took KC")
-- can be computed from real data. Only the owner may write their own.
drop policy if exists "picks are publicly readable" on public.picks;
create policy "picks are publicly readable"
  on public.picks for select using (true);

drop policy if exists "users write their own picks" on public.picks;
create policy "users write their own picks"
  on public.picks for insert with check (auth.uid() = user_id);

drop policy if exists "users update their own picks" on public.picks;
create policy "users update their own picks"
  on public.picks for update using (auth.uid() = user_id);

drop policy if exists "users delete their own picks" on public.picks;
create policy "users delete their own picks"
  on public.picks for delete using (auth.uid() = user_id);

-- ── Profile bootstrap ────────────────────────────────────────────────────────
-- Creating the profile in a trigger (rather than a second client-side insert)
-- means an account can never exist without its profile, even if the browser
-- closes mid-sign-up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  base_handle text;
  final_handle text;
  suffix int := 1;
begin
  base_handle := lower(regexp_replace(
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    '[^a-zA-Z0-9]', '', 'g'
  ));
  if base_handle = '' or base_handle is null then
    base_handle := 'fan';
  end if;
  base_handle := left(base_handle, 16);

  final_handle := base_handle;
  while exists (select 1 from public.profiles where handle = final_handle) loop
    suffix := suffix + 1;
    final_handle := base_handle || suffix::text;
  end loop;

  insert into public.profiles (id, handle, display_name, favorite_team)
  values (
    new.id,
    final_handle,
    coalesce(new.raw_user_meta_data->>'display_name', 'Fan'),
    nullif(new.raw_user_meta_data->>'favorite_team', '')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Community sentiment ──────────────────────────────────────────────────────
-- Aggregated server-side so the browser never downloads every pick in the
-- database just to compute one percentage.
create or replace function public.game_sentiment(game_keys text[])
returns table (game_key text, team text, picks bigint)
language sql
stable
as $$
  select p.game_key, p.team, count(*) as picks
  from public.picks p
  where p.game_key = any(game_keys)
  group by p.game_key, p.team;
$$;
