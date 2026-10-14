-- ─── Live system: scores, plays, results (CLARK_OVERHAUL_PLAN.md §3) ─────────
-- Written only by the live-sync Edge Function (service role). Everyone can
-- read, and Realtime pushes new rows to anyone watching a game.

create table if not exists public.live_sync_state (
  id            int primary key default 1 check (id = 1),
  next_check_at timestamptz,
  updated_at    timestamptz not null default now()
);

create table if not exists public.live_games (
  game_key      text primary key,
  espn_event_id text not null,
  season        int  not null,
  week          int  not null,
  home_team     text not null,
  away_team     text not null,
  status        text not null check (status in ('pre', 'in', 'post')),
  quarter       int,
  clock         text,
  home_score    int  not null default 0,
  away_score    int  not null default 0,
  possession    text,
  home_win_prob numeric(5,4),
  -- Current situation, for the 4th-down poll and the scorebug.
  down          int,
  distance      int,
  yard_line     text,
  updated_at    timestamptz not null default now()
);

create table if not exists public.live_plays (
  game_key      text not null,
  play_id       text not null,
  seq           int  not null,
  quarter       int  not null,
  clock         text not null,
  play_type     text not null,
  text          text not null,
  yards         int  not null default 0,
  offense       text,
  home_score    int  not null,
  away_score    int  not null,
  home_win_prob numeric(5,4),
  is_big        boolean not null default false,
  big_reason    text,
  note          text,
  note_source   text check (note_source in ('ai', 'template')),
  drive_id      text,
  created_at    timestamptz not null default now(),
  primary key (game_key, play_id)
);
create index if not exists live_plays_game_seq_idx on public.live_plays (game_key, seq);

create table if not exists public.results (
  game_key   text primary key,
  home_team  text not null,
  away_team  text not null,
  home_score int  not null,
  away_score int  not null,
  winner     text,            -- null for a tie
  final_at   timestamptz not null default now()
);

alter table public.live_sync_state enable row level security;
alter table public.live_games      enable row level security;
alter table public.live_plays      enable row level security;
alter table public.results         enable row level security;

drop policy if exists "live games are public" on public.live_games;
create policy "live games are public" on public.live_games for select using (true);
drop policy if exists "live plays are public" on public.live_plays;
create policy "live plays are public" on public.live_plays for select using (true);
drop policy if exists "results are public" on public.results;
create policy "results are public" on public.results for select using (true);
-- live_sync_state: no policies, service role only.

-- ─── Moderation (§4 Tab 3) ───────────────────────────────────────────────────
-- Words are data, not code: admins add rows with SQL. 'severe' blocks the
-- message and gives a strike; 'mild' is saved with the word masked.
create table if not exists public.moderation_words (
  word     text primary key,
  severity text not null check (severity in ('severe', 'mild'))
);
alter table public.moderation_words enable row level security;

insert into public.moderation_words (word, severity) values
  ('kys', 'severe'), ('kill yourself', 'severe'), ('kill urself', 'severe'),
  ('i will kill you', 'severe'), ('hope you die', 'severe'),
  ('fuck', 'mild'), ('shit', 'mild'), ('bitch', 'mild'), ('asshole', 'mild'),
  ('dick', 'mild'), ('bastard', 'mild'), ('damn', 'mild'), ('crap', 'mild')
on conflict (word) do nothing;

create table if not exists public.chat_strikes (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  reason     text not null,
  created_at timestamptz not null default now()
);
create index if not exists chat_strikes_user_idx on public.chat_strikes (user_id, created_at);
alter table public.chat_strikes enable row level security;
drop policy if exists "users see their own strikes" on public.chat_strikes;
create policy "users see their own strikes" on public.chat_strikes for select using (auth.uid() = user_id);

-- lowercase, look-alikes back to letters (@→a 1→i 3→e $→s 0→o 4→a 5→s 7→t),
-- repeated letters collapsed ("fuuuck" → "fuck").
create or replace function public.normalize_for_moderation(t text)
returns text language sql immutable as $$
  select regexp_replace(
    translate(lower(t), '@143$057!', 'aiaesosti'),
    '([a-z])\1+', '\1', 'g')
$$;

create or replace function public.mask_mild_words(t text)
returns text language plpgsql stable set search_path = public as $$
declare
  w record;
  result text := t;
begin
  for w in select word from moderation_words where severity = 'mild' loop
    result := regexp_replace(result, '(?i)\m(' || substr(w.word, 1, 1) || ')' || substr(w.word, 2) || '\M',
                             '\1' || repeat('*', length(w.word) - 1), 'g');
  end loop;
  return result;
end $$;

-- 'ok' | 'muted' | 'banned' for posting anywhere.
create or replace function public.posting_status(uid uuid)
returns text language sql stable security definer set search_path = public as $$
  select case
    when (select count(*) from chat_strikes where user_id = uid) >= 5 then 'banned'
    when (select count(*) from chat_strikes where user_id = uid and created_at > now() - interval '24 hours') >= 3 then 'muted'
    else 'ok'
  end
$$;

-- Shared checks for chat and comments. Returns null when the text may be
-- posted, or an error code. Severe words record a strike.
create or replace function public.moderation_verdict(uid uuid, p_body text, recent_table text)
returns text language plpgsql security definer set search_path = public as $$
declare
  norm text := normalize_for_moderation(p_body);
  status text := posting_status(uid);
  account_age interval;
  last_at timestamptz;
  dup int;
begin
  if status <> 'ok' then return status; end if;
  if exists (select 1 from moderation_words where severity = 'severe' and norm like '%' || normalize_for_moderation(word) || '%') then
    insert into chat_strikes (user_id, reason) values (uid, 'severe word');
    return 'blocked';
  end if;
  select now() - created_at into account_age from profiles where id = uid;
  if account_age is null then return 'no_profile'; end if;
  if account_age < interval '7 days' and p_body ~* '(https?://|www\.|\.(com|net|org|io|gg|ly)\M)' then
    return 'links_not_allowed';
  end if;
  if recent_table = 'chat' then
    select max(created_at) into last_at from chat_messages where user_id = uid;
    if last_at is not null and last_at > now() - interval '3 seconds' then return 'too_fast'; end if;
    select count(*) into dup from chat_messages
      where user_id = uid and chat_messages.body = p_body and created_at > now() - interval '60 seconds';
  else
    select max(created_at) into last_at from comments where user_id = uid;
    if last_at is not null and last_at > now() - interval '10 seconds' then return 'too_fast'; end if;
    select count(*) into dup from comments
      where user_id = uid and comments.body = p_body and created_at > now() - interval '60 seconds';
  end if;
  if dup > 0 then return 'duplicate'; end if;
  return null;
end $$;

-- ─── Game chat ───────────────────────────────────────────────────────────────
create table if not exists public.chat_messages (
  id           bigint generated always as identity primary key,
  game_key     text not null,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  body         text not null check (char_length(body) between 1 and 280),
  hidden       boolean not null default false,
  report_count int not null default 0,
  created_at   timestamptz not null default now()
);
create index if not exists chat_messages_game_idx on public.chat_messages (game_key, created_at);
alter table public.chat_messages enable row level security;
drop policy if exists "visible chat is public" on public.chat_messages;
create policy "visible chat is public" on public.chat_messages for select using (not hidden);
drop policy if exists "users delete their own chat" on public.chat_messages;
create policy "users delete their own chat" on public.chat_messages for delete using (auth.uid() = user_id);
-- No insert policy: posting goes through post_chat_message() so every rule runs.

-- {"ok": true, "id": ...} or {"ok": false, "error": "<code>"}
create or replace function public.post_chat_message(p_game_key text, p_body text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  clean text := btrim(p_body);
  verdict text;
  new_id bigint;
begin
  if uid is null then return jsonb_build_object('ok', false, 'error', 'sign_in'); end if;
  if clean = '' or char_length(clean) > 280 then return jsonb_build_object('ok', false, 'error', 'length'); end if;
  if exists (select 1 from results where game_key = p_game_key and final_at < now() - interval '1 hour') then
    return jsonb_build_object('ok', false, 'error', 'closed');
  end if;
  verdict := moderation_verdict(uid, clean, 'chat');
  if verdict is not null then return jsonb_build_object('ok', false, 'error', verdict); end if;
  insert into chat_messages (game_key, user_id, body)
    values (p_game_key, uid, mask_mild_words(clean)) returning id into new_id;
  return jsonb_build_object('ok', true, 'id', new_id);
end $$;

create table if not exists public.chat_reports (
  message_id bigint not null references public.chat_messages(id) on delete cascade,
  user_id    uuid   not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (message_id, user_id)
);
alter table public.chat_reports enable row level security;

-- Three reports hide a message.
create or replace function public.report_chat_message(p_id bigint)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return; end if;
  insert into chat_reports (message_id, user_id) values (p_id, auth.uid()) on conflict do nothing;
  update chat_messages set
    report_count = (select count(*) from chat_reports where message_id = p_id),
    hidden = (select count(*) from chat_reports where message_id = p_id) >= 3
  where id = p_id;
end $$;

-- Reactions on big-play cards (🔥 😭 🤡), one per user per play.
create table if not exists public.play_reactions (
  game_key   text not null,
  play_id    text not null,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  emoji      text not null check (emoji in ('🔥', '😭', '🤡')),
  created_at timestamptz not null default now(),
  primary key (game_key, play_id, user_id)
);
alter table public.play_reactions enable row level security;
drop policy if exists "reactions are public" on public.play_reactions;
create policy "reactions are public" on public.play_reactions for select using (true);
drop policy if exists "users react as themselves" on public.play_reactions;
create policy "users react as themselves" on public.play_reactions for insert with check (auth.uid() = user_id);
drop policy if exists "users change their reaction" on public.play_reactions;
create policy "users change their reaction" on public.play_reactions for update using (auth.uid() = user_id);
drop policy if exists "users remove their reaction" on public.play_reactions;
create policy "users remove their reaction" on public.play_reactions for delete using (auth.uid() = user_id);

-- ─── 4th-down polls ──────────────────────────────────────────────────────────
-- poll_key identifies one 4th down: "<quarter>|<clock>|<possession>".
create table if not exists public.poll_votes (
  game_key   text not null,
  poll_key   text not null,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  choice     text not null check (choice in ('go', 'kick')),
  created_at timestamptz not null default now(),
  primary key (game_key, poll_key, user_id)
);
alter table public.poll_votes enable row level security;
drop policy if exists "poll votes are public" on public.poll_votes;
create policy "poll votes are public" on public.poll_votes for select using (true);
drop policy if exists "users vote as themselves" on public.poll_votes;
create policy "users vote as themselves" on public.poll_votes for insert with check (auth.uid() = user_id);

-- ─── Comments under the Clark Report (§4 Tab 1.8) ────────────────────────────
create table if not exists public.comments (
  id           bigint generated always as identity primary key,
  game_key     text not null,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  body         text not null check (char_length(body) between 1 and 1000),
  hidden       boolean not null default false,
  report_count int not null default 0,
  created_at   timestamptz not null default now()
);
create index if not exists comments_game_idx on public.comments (game_key);
alter table public.comments enable row level security;
drop policy if exists "visible comments are public" on public.comments;
create policy "visible comments are public" on public.comments for select using (not hidden);
drop policy if exists "users delete their own comments" on public.comments;
create policy "users delete their own comments" on public.comments for delete using (auth.uid() = user_id);

create table if not exists public.comment_votes (
  comment_id bigint not null references public.comments(id) on delete cascade,
  user_id    uuid   not null references public.profiles(id) on delete cascade,
  primary key (comment_id, user_id)
);
alter table public.comment_votes enable row level security;
drop policy if exists "comment votes are public" on public.comment_votes;
create policy "comment votes are public" on public.comment_votes for select using (true);
drop policy if exists "users upvote as themselves" on public.comment_votes;
create policy "users upvote as themselves" on public.comment_votes for insert with check (auth.uid() = user_id);
drop policy if exists "users remove their upvote" on public.comment_votes;
create policy "users remove their upvote" on public.comment_votes for delete using (auth.uid() = user_id);

create or replace function public.post_comment(p_game_key text, p_body text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  clean text := btrim(p_body);
  verdict text;
  new_id bigint;
begin
  if uid is null then return jsonb_build_object('ok', false, 'error', 'sign_in'); end if;
  if clean = '' or char_length(clean) > 1000 then return jsonb_build_object('ok', false, 'error', 'length'); end if;
  verdict := moderation_verdict(uid, clean, 'comment');
  if verdict is not null then return jsonb_build_object('ok', false, 'error', verdict); end if;
  insert into comments (game_key, user_id, body)
    values (p_game_key, uid, mask_mild_words(clean)) returning id into new_id;
  return jsonb_build_object('ok', true, 'id', new_id);
end $$;

create table if not exists public.comment_reports (
  comment_id bigint not null references public.comments(id) on delete cascade,
  user_id    uuid   not null references public.profiles(id) on delete cascade,
  primary key (comment_id, user_id)
);
alter table public.comment_reports enable row level security;

create or replace function public.report_comment(p_id bigint)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return; end if;
  insert into comment_reports (comment_id, user_id) values (p_id, auth.uid()) on conflict do nothing;
  update comments set
    report_count = (select count(*) from comment_reports where comment_id = p_id),
    hidden = (select count(*) from comment_reports where comment_id = p_id) >= 3
  where id = p_id;
end $$;

-- Thread sorted by upvotes, with each poster's pick ("SEA · 80%").
create or replace function public.game_comments(p_game_key text)
returns table (
  id bigint, body text, created_at timestamptz, user_id uuid,
  handle text, display_name text, favorite_team text,
  pick_team text, pick_confidence numeric, upvotes bigint, voted boolean
)
language sql stable security definer set search_path = public as $$
  select c.id, c.body, c.created_at, c.user_id,
         p.handle, p.display_name, p.favorite_team,
         k.team, k.confidence,
         (select count(*) from comment_votes v where v.comment_id = c.id),
         exists (select 1 from comment_votes v where v.comment_id = c.id and v.user_id = auth.uid())
  from comments c
  join profiles p on p.id = c.user_id
  left join picks k on k.user_id = c.user_id and k.game_key = c.game_key
  where c.game_key = p_game_key and not c.hidden
  order by 10 desc, c.created_at desc
  limit 200
$$;

-- ─── Realtime ────────────────────────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['live_games', 'live_plays', 'chat_messages', 'play_reactions', 'poll_votes', 'results'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- ─── Cron: call live-sync every 15 seconds ───────────────────────────────────
-- The bearer token is generated inside the database and kept in Vault, so it
-- never appears in this (public) repository. The function checks it with
-- check_live_sync_token() using its built-in service role.
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

do $$
begin
  if not exists (select 1 from vault.secrets where name = 'live_sync_token') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'live_sync_token');
  end if;
end $$;

create or replace function public.check_live_sync_token(token text)
returns boolean language sql stable security definer set search_path = public, vault as $$
  select exists (select 1 from vault.decrypted_secrets where name = 'live_sync_token' and decrypted_secret = token)
$$;
revoke all on function public.check_live_sync_token(text) from public, anon, authenticated;
grant execute on function public.check_live_sync_token(text) to service_role;

select cron.unschedule('live-sync') where exists (select 1 from cron.job where jobname = 'live-sync');
select cron.schedule(
  'live-sync',
  '15 seconds',
  $cron$
  select net.http_post(
    url     := 'https://qubjlpndblrsarzxcobf.supabase.co/functions/v1/live-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'live_sync_token')
    ),
    body    := '{}'::jsonb,
    timeout_milliseconds := 10000
  )
  $cron$
);

-- Helper RPCs used by the client only for counts (keep payloads small).
create or replace function public.play_reaction_counts(p_game_key text)
returns table (play_id text, emoji text, n bigint)
language sql stable set search_path = public as $$
  select play_id, emoji, count(*) from play_reactions where game_key = p_game_key group by 1, 2
$$;

create or replace function public.poll_counts(p_game_key text)
returns table (poll_key text, choice text, n bigint)
language sql stable set search_path = public as $$
  select poll_key, choice, count(*) from poll_votes where game_key = p_game_key group by 1, 2
$$;
