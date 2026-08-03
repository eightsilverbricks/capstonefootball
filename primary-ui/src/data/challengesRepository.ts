// ─── challengesRepository — community pushback on a factor ────────────────────
// Reads and writes the `challenges` / `challenge_votes` tables. Authorship is
// never sent from the browser: the row carries a user_id that RLS pins to the
// signed-in account, and the display name comes back off `profiles`. So a
// challenge can only ever be attributed to the account that actually posted it.
//
// Without Supabase there is no community to challenge anything, so reads return
// empty and writes report failure instead of faking a local thread.

import { isSupabaseConfigured, supabase } from '@/auth/supabaseClient';

export interface Challenge {
  id: string;
  factorName: string;
  body: string;
  createdAt: string;
  authorId: string;
  authorName: string;
  votes: number;
  /** Whether the signed-in reader has already upvoted this one. */
  viewerVoted: boolean;
}

interface ChallengeRow {
  id: string;
  factor_name: string;
  body: string;
  created_at: string;
  author_id: string;
  author_name: string;
  votes: number;
  viewer_voted: boolean;
}

export const MAX_CHALLENGE_LENGTH = 240;

/** Every challenge on one game's report. Empty on any failure. */
export async function loadChallenges(gameKey: string): Promise<Challenge[]> {
  if (!isSupabaseConfigured || !supabase) return [];

  const { data, error } = await supabase.rpc('challenge_threads', { p_game_key: gameKey });
  if (error || !data) {
    if (error) console.error('[challenges] load failed', error.message);
    return [];
  }

  return (data as ChallengeRow[]).map((row) => ({
    id: row.id,
    factorName: row.factor_name,
    body: row.body,
    createdAt: row.created_at,
    authorId: row.author_id,
    authorName: row.author_name,
    votes: Number(row.votes),
    viewerVoted: Boolean(row.viewer_voted),
  }));
}

/** Post a challenge. Returns an error message on failure, null on success. */
export async function postChallenge(
  userId: string,
  gameKey: string,
  factorName: string,
  body: string,
): Promise<string | null> {
  const trimmed = body.trim();
  if (!trimmed) return 'Write something first.';
  if (trimmed.length > MAX_CHALLENGE_LENGTH) {
    return `Keep it under ${MAX_CHALLENGE_LENGTH} characters.`;
  }
  if (!isSupabaseConfigured || !supabase) return 'Challenges need a live connection.';

  const { error } = await supabase.from('challenges').insert({
    user_id: userId,
    game_key: gameKey,
    factor_name: factorName,
    body: trimmed,
  });

  return error ? error.message : null;
}

/**
 * Add or retract this account's upvote. One row per (challenge, account), so
 * voting twice is impossible rather than merely discouraged.
 */
export async function toggleChallengeVote(
  userId: string,
  challengeId: string,
  hasVoted: boolean,
): Promise<string | null> {
  if (!isSupabaseConfigured || !supabase) return 'Voting needs a live connection.';

  const { error } = hasVoted
    ? await supabase
        .from('challenge_votes')
        .delete()
        .eq('challenge_id', challengeId)
        .eq('user_id', userId)
    : await supabase.from('challenge_votes').insert({ challenge_id: challengeId, user_id: userId });

  return error ? error.message : null;
}
