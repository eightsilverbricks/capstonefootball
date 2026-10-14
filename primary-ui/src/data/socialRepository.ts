// ─── Social: game chat, report comments, big-play reactions, 4th-down polls ──
// Posting goes through security-definer RPCs (post_chat_message, post_comment)
// so the moderation rules in migration 20261014010000 always run.

import { isSupabaseConfigured, supabase } from '@/auth/supabaseClient';

export type Emoji = '🔥' | '😭' | '🤡';
export const EMOJIS: Emoji[] = ['🔥', '😭', '🤡'];
export type PollChoice = 'go' | 'kick';

export interface Author {
  handle: string;
  displayName: string;
  favoriteTeam: string | null;
}

export interface ChatMessage {
  id: number;
  userId: string;
  body: string;
  createdAt: string;
  author: Author | null;
}

export interface Comment {
  id: number;
  userId: string;
  body: string;
  createdAt: string;
  author: Author;
  pick: { team: string; confidence: number } | null;
  upvotes: number;
  voted: boolean;
}

export type PickLookup = Record<string, { team: string; confidence: number }>;
export type Counts<K extends string> = Record<string, Partial<Record<K, number>>>;

/** Plain-English text for the error codes the posting RPCs return. */
export const POST_ERRORS: Record<string, string> = {
  sign_in: 'Sign in to join the conversation.',
  length: 'Messages need 1–280 characters (comments up to 1,000).',
  closed: 'This chat closed an hour after the final whistle.',
  blocked: "That message breaks the rules, so it wasn't posted.",
  muted: "You're muted for 24 hours after repeated rule breaks.",
  banned: 'Your account can no longer post.',
  links_not_allowed: 'New accounts can post links after 7 days.',
  too_fast: 'Slow down a little. One message every few seconds.',
  duplicate: 'You just posted that.',
  no_profile: 'Finish setting up your account first.',
  offline: "Couldn't reach the server. Try again.",
};

const db = () => (isSupabaseConfigured ? supabase : null);

function toAuthor(p: { handle?: string; display_name?: string; favorite_team?: string | null } | null): Author | null {
  return p ? { handle: p.handle ?? '', displayName: p.display_name ?? p.handle ?? 'Fan', favoriteTeam: p.favorite_team ?? null } : null;
}

// ─── Picks next to names ─────────────────────────────────────────────────────

export async function fetchGamePicks(gameKey: string): Promise<PickLookup> {
  const client = db();
  if (!client) return {};
  const { data, error } = await client.from('picks').select('user_id,team,confidence').eq('game_key', gameKey).limit(5000);
  if (error) throw new Error(error.message);
  return Object.fromEntries((data ?? []).map((r) => [r.user_id, { team: r.team, confidence: Number(r.confidence) }]));
}

export async function fetchAuthors(ids: string[]): Promise<Record<string, Author>> {
  const client = db();
  if (!client || !ids.length) return {};
  const { data, error } = await client.from('profiles').select('id,handle,display_name,favorite_team').in('id', ids);
  if (error) throw new Error(error.message);
  return Object.fromEntries((data ?? []).map((p) => [p.id, toAuthor(p)!]));
}

// ─── Chat ────────────────────────────────────────────────────────────────────

export async function fetchChat(gameKey: string): Promise<ChatMessage[]> {
  const client = db();
  if (!client) return [];
  const { data, error } = await client
    .from('chat_messages')
    .select('id,user_id,body,created_at,profiles(handle,display_name,favorite_team)')
    .eq('game_key', gameKey).order('created_at', { ascending: false }).limit(200);
  if (error) throw new Error(error.message);
  return (data ?? []).reverse().map((r) => ({
    id: r.id, userId: r.user_id, body: r.body, createdAt: r.created_at,
    author: toAuthor(Array.isArray(r.profiles) ? r.profiles[0] : r.profiles),
  }));
}

export function subscribeChat(
  gameKey: string,
  onInsert: (m: ChatMessage) => void,
  onRemove: (id: number) => void,
): () => void {
  const client = db();
  if (!client) return () => {};
  const channel = client
    .channel(`chat_${gameKey}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `game_key=eq.${gameKey}` },
      ({ new: r }) => onInsert({ id: r.id, userId: r.user_id, body: r.body, createdAt: r.created_at, author: null }))
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_messages', filter: `game_key=eq.${gameKey}` },
      ({ new: r }) => { if (r.hidden) onRemove(r.id); })
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'chat_messages' },
      ({ old: r }) => { if (r?.id) onRemove(r.id); })
    .subscribe();
  return () => { client.removeChannel(channel); };
}

async function rpcPost(fn: string, gameKey: string, body: string): Promise<{ ok: boolean; error?: string }> {
  const client = db();
  if (!client) return { ok: false, error: 'offline' };
  const { data, error } = await client.rpc(fn, { p_game_key: gameKey, p_body: body });
  if (error) return { ok: false, error: 'offline' };
  return data as { ok: boolean; error?: string };
}

export const postChat = (gameKey: string, body: string) => rpcPost('post_chat_message', gameKey, body);

export async function reportChat(id: number): Promise<void> {
  await db()?.rpc('report_chat_message', { p_id: id });
}

export async function deleteChat(id: number): Promise<void> {
  await db()?.from('chat_messages').delete().eq('id', id);
}

// ─── Comments ────────────────────────────────────────────────────────────────

export async function fetchComments(gameKey: string): Promise<Comment[]> {
  const client = db();
  if (!client) return [];
  const { data, error } = await client.rpc('game_comments', { p_game_key: gameKey });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: Record<string, unknown>) => ({
    id: Number(r.id), userId: String(r.user_id), body: String(r.body), createdAt: String(r.created_at),
    author: toAuthor(r as { handle: string; display_name: string; favorite_team: string | null })!,
    pick: r.pick_team ? { team: String(r.pick_team), confidence: Number(r.pick_confidence) } : null,
    upvotes: Number(r.upvotes), voted: Boolean(r.voted),
  }));
}

export const postComment = (gameKey: string, body: string) => rpcPost('post_comment', gameKey, body);

export async function setUpvote(commentId: number, userId: string, on: boolean): Promise<void> {
  const client = db();
  if (!client) return;
  if (on) await client.from('comment_votes').insert({ comment_id: commentId, user_id: userId });
  else await client.from('comment_votes').delete().eq('comment_id', commentId).eq('user_id', userId);
}

export async function reportComment(id: number): Promise<void> {
  await db()?.rpc('report_comment', { p_id: id });
}

// ─── Reactions and polls ─────────────────────────────────────────────────────

function tally<K extends string>(rows: { key: string; value: K; n: number }[]): Counts<K> {
  const out: Counts<K> = {};
  for (const r of rows) out[r.key] = { ...out[r.key], [r.value]: r.n } as Partial<Record<K, number>>;
  return out;
}

export async function fetchReactions(gameKey: string, userId: string | null): Promise<{ counts: Counts<Emoji>; mine: Record<string, Emoji> }> {
  const client = db();
  if (!client) return { counts: {}, mine: {} };
  const [counts, mine] = await Promise.all([
    client.rpc('play_reaction_counts', { p_game_key: gameKey }),
    userId ? client.from('play_reactions').select('play_id,emoji').eq('game_key', gameKey).eq('user_id', userId) : Promise.resolve({ data: [] }),
  ]);
  return {
    counts: tally(((counts.data ?? []) as { play_id: string; emoji: Emoji; n: number }[]).map((r) => ({ key: r.play_id, value: r.emoji, n: Number(r.n) }))),
    mine: Object.fromEntries(((mine.data ?? []) as { play_id: string; emoji: Emoji }[]).map((r) => [r.play_id, r.emoji])),
  };
}

export async function setReaction(gameKey: string, playId: string, userId: string, emoji: Emoji | null): Promise<void> {
  const client = db();
  if (!client) return;
  if (emoji) await client.from('play_reactions').upsert({ game_key: gameKey, play_id: playId, user_id: userId, emoji });
  else await client.from('play_reactions').delete().eq('game_key', gameKey).eq('play_id', playId).eq('user_id', userId);
}

export async function fetchPolls(gameKey: string, userId: string | null): Promise<{ counts: Counts<PollChoice>; mine: Record<string, PollChoice> }> {
  const client = db();
  if (!client) return { counts: {}, mine: {} };
  const [counts, mine] = await Promise.all([
    client.rpc('poll_counts', { p_game_key: gameKey }),
    userId ? client.from('poll_votes').select('poll_key,choice').eq('game_key', gameKey).eq('user_id', userId) : Promise.resolve({ data: [] }),
  ]);
  return {
    counts: tally(((counts.data ?? []) as { poll_key: string; choice: PollChoice; n: number }[]).map((r) => ({ key: r.poll_key, value: r.choice, n: Number(r.n) }))),
    mine: Object.fromEntries(((mine.data ?? []) as { poll_key: string; choice: PollChoice }[]).map((r) => [r.poll_key, r.choice])),
  };
}

export async function vote(gameKey: string, pollKey: string, userId: string, choice: PollChoice): Promise<void> {
  await db()?.from('poll_votes').insert({ game_key: gameKey, poll_key: pollKey, user_id: userId, choice });
}

/** Re-runs `onChange` whenever reactions or poll votes change for this game. */
export function subscribeGameSocial(gameKey: string, onChange: () => void): () => void {
  const client = db();
  if (!client) return () => {};
  const filter = `game_key=eq.${gameKey}`;
  const channel = client
    .channel(`social_${gameKey}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'play_reactions', filter }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'poll_votes', filter }, onChange)
    .subscribe();
  return () => { client.removeChannel(channel); };
}
