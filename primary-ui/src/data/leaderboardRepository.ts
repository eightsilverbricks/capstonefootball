// ─── Leaderboard — ranked server-side by public.leaderboard() ───────────────
// Outcomes live in predictions.json, so we send the graded games along with
// the request; the database joins them to every pick and returns the top of
// the board plus the signed-in fan's own row.

import { isSupabaseConfigured, supabase } from '@/auth/supabaseClient';
import { ApiPrediction } from '@/types/prediction';
import { gameKey } from '@/lib/threeWaySignal';
import { isFinal } from '@/lib/gameStatus';
import { GAME_CREDIT_CAP } from '@/competition/scoring';

export type LeaderboardSort = 'points' | 'vs_clark';

export interface LeaderRow {
  userId: string;
  handle: string;
  displayName: string;
  favoriteTeam: string | null;
  wins: number;
  losses: number;
  points: number;
  clarkWins: number;
  clarkLosses: number;
  rank: number;
  boardSize: number;
}

interface Row {
  user_id: string;
  handle: string;
  display_name: string;
  favorite_team: string | null;
  wins: number;
  losses: number;
  stake_units: string | number;
  clark_wins: number;
  clark_losses: number;
  board_rank: number;
  board_size: number;
}

/** {game_key: {winner, clark, week}} for every graded game. */
export function resultsPayload(games: ApiPrediction[]): Record<string, { winner: string; clark: string; week: number }> {
  return Object.fromEntries(
    games
      .filter((g) => isFinal(g) && g.actual_winner)
      .map((g) => [gameKey(g), { winner: g.actual_winner as string, clark: g.predicted_winner, week: g.week }]),
  );
}

export function toLeaderRow(r: Row): LeaderRow {
  return {
    userId: r.user_id,
    handle: r.handle,
    displayName: r.display_name,
    favoriteTeam: r.favorite_team,
    wins: Number(r.wins),
    losses: Number(r.losses),
    // numeric comes back as a string from PostgREST.
    points: Math.round(Number(r.stake_units) * GAME_CREDIT_CAP),
    clarkWins: Number(r.clark_wins),
    clarkLosses: Number(r.clark_losses),
    rank: Number(r.board_rank),
    boardSize: Number(r.board_size),
  };
}

export async function loadLeaderboard(
  games: ApiPrediction[],
  opts: { week?: number | null; sort?: LeaderboardSort; limit?: number } = {},
): Promise<LeaderRow[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  const results = resultsPayload(games);
  if (Object.keys(results).length === 0) return [];
  const { data, error } = await supabase.rpc('leaderboard', {
    results,
    p_week: opts.week ?? null,
    p_sort: opts.sort ?? 'points',
    p_limit: opts.limit ?? 50,
  });
  if (error) throw new Error(error.message);
  return ((data ?? []) as Row[]).map(toLeaderRow);
}
