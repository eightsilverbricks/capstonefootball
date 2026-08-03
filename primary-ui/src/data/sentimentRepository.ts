// ─── sentimentRepository — what the community actually picked ─────────────────
// The read side of the same `picks` table that picksRepository writes. Every
// "62% of fans took KC" number in the app comes through here, aggregated
// server-side (see the RPCs in supabase/schema.sql) so the browser never has to
// download every pick in the database to compute one percentage.
//
// With no Supabase configured there is no community, so every loader returns
// empty rather than inventing one. Callers render an honest "no picks yet"
// state off that — never a fabricated split.

import { isSupabaseConfigured, supabase } from '@/auth/supabaseClient';

/** Pick counts for one game, by team. */
export interface GameSentiment {
  total: number;
  byTeam: Record<string, number>;
}

/** gameKey → counts. Games nobody has picked are absent, not zero-filled. */
export type SentimentMap = Record<string, GameSentiment>;

/** One day's standing in a game's support curve. */
export interface SentimentDay {
  /** ISO date, `YYYY-MM-DD`. */
  day: string;
  byTeam: Record<string, number>;
}

export type TimelineMap = Record<string, SentimentDay[]>;

/**
 * Picks grouped by the fanbase that made them. `stakeUnits` is Σ(2·conf − 1) —
 * multiply by GAME_CREDIT_CAP for credits; see fanbase_totals() in schema.sql.
 */
export interface FanbaseTotal {
  fanTeam: string;
  gameKey: string;
  team: string;
  picks: number;
  stakeUnits: number;
}

interface SentimentRow {
  game_key: string;
  team: string;
  picks: number;
}

interface TimelineRow extends SentimentRow {
  day: string;
}

interface FanbaseRow extends SentimentRow {
  fan_team: string;
  stake_units: number | string;
}

/** Community pick counts for the given games. Empty on any failure. */
export async function loadGameSentiment(gameKeys: string[]): Promise<SentimentMap> {
  if (!isSupabaseConfigured || !supabase || gameKeys.length === 0) return {};

  const { data, error } = await supabase.rpc('game_sentiment', { game_keys: gameKeys });
  if (error || !data) {
    if (error) console.error('[sentiment] load failed', error.message);
    return {};
  }

  return (data as SentimentRow[]).reduce<SentimentMap>((acc, row) => {
    const entry = acc[row.game_key] ?? { total: 0, byTeam: {} };
    const picks = Number(row.picks);
    entry.byTeam[row.team] = (entry.byTeam[row.team] ?? 0) + picks;
    entry.total += picks;
    acc[row.game_key] = entry;
    return acc;
  }, {});
}

/** Day-by-day support for the given games, oldest first. Empty on any failure. */
export async function loadSentimentTimeline(gameKeys: string[]): Promise<TimelineMap> {
  if (!isSupabaseConfigured || !supabase || gameKeys.length === 0) return {};

  const { data, error } = await supabase.rpc('game_sentiment_timeline', { game_keys: gameKeys });
  if (error || !data) {
    if (error) console.error('[sentiment] timeline failed', error.message);
    return {};
  }

  const byGame: Record<string, Map<string, Record<string, number>>> = {};
  for (const row of data as TimelineRow[]) {
    const days = byGame[row.game_key] ?? new Map<string, Record<string, number>>();
    const teams = days.get(row.day) ?? {};
    teams[row.team] = (teams[row.team] ?? 0) + Number(row.picks);
    days.set(row.day, teams);
    byGame[row.game_key] = days;
  }

  return Object.entries(byGame).reduce<TimelineMap>((acc, [key, days]) => {
    acc[key] = [...days.entries()]
      .map(([day, byTeam]) => ({ day, byTeam }))
      .sort((a, b) => a.day.localeCompare(b.day));
    return acc;
  }, {});
}

/** Every pick grouped by fanbase, for the season standings. Empty on failure. */
export async function loadFanbaseTotals(): Promise<FanbaseTotal[]> {
  if (!isSupabaseConfigured || !supabase) return [];

  const { data, error } = await supabase.rpc('fanbase_totals');
  if (error || !data) {
    if (error) console.error('[sentiment] fanbase totals failed', error.message);
    return [];
  }

  return (data as FanbaseRow[]).map((row) => ({
    fanTeam: row.fan_team,
    gameKey: row.game_key,
    team: row.team,
    picks: Number(row.picks),
    // numeric comes back as a string from PostgREST.
    stakeUnits: Number(row.stake_units),
  }));
}
