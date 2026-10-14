// ─── Live data — written by the live-sync Edge Function, pushed by Realtime ──
// live_games (score, clock, situation, win %), live_plays (every snap with
// notes on big plays) and results (finals). Everything here is public-read.

import { isSupabaseConfigured, supabase } from '@/auth/supabaseClient';

export type LiveStatus = 'pre' | 'in' | 'post';

export interface LiveGame {
  game_key: string;
  status: LiveStatus;
  quarter: number | null;
  clock: string | null;
  home_team: string;
  away_team: string;
  home_score: number;
  away_score: number;
  possession: string | null;
  home_win_prob: number | null;
  down: number | null;
  distance: number | null;
  yard_line: string | null;
  updated_at: string;
}

export interface LivePlay {
  game_key: string;
  play_id: string;
  seq: number;
  quarter: number;
  clock: string;
  play_type: string;
  text: string;
  yards: number;
  offense: string | null;
  home_score: number;
  away_score: number;
  home_win_prob: number | null;
  is_big: boolean;
  big_reason: string | null;
  note: string | null;
  drive_id: string | null;
  created_at: string;
}

const GAME_COLS = 'game_key,status,quarter,clock,home_team,away_team,home_score,away_score,possession,home_win_prob,down,distance,yard_line,updated_at';
const PLAY_COLS = 'game_key,play_id,seq,quarter,clock,play_type,text,yards,offense,home_score,away_score,home_win_prob,is_big,big_reason,note,drive_id,created_at';

const num = (v: unknown): number | null => (v == null ? null : Number(v));

function toGame(r: Record<string, unknown>): LiveGame {
  return { ...(r as unknown as LiveGame), home_win_prob: num(r.home_win_prob) };
}

function toPlay(r: Record<string, unknown>): LivePlay {
  return { ...(r as unknown as LivePlay), home_win_prob: num(r.home_win_prob) };
}

export async function fetchLiveGames(): Promise<LiveGame[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  const { data, error } = await supabase.from('live_games').select(GAME_COLS);
  if (error) throw new Error(error.message);
  return (data ?? []).map(toGame);
}

/** Calls back with every changed live_games row. Returns an unsubscribe. */
export function subscribeLiveGames(onRow: (g: LiveGame) => void): () => void {
  if (!supabase) return () => {};
  const client = supabase;
  const channel = client
    .channel('live_games_all')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'live_games' }, (payload) => {
      if (payload.new && 'game_key' in payload.new) onRow(toGame(payload.new as Record<string, unknown>));
    })
    .subscribe();
  return () => { client.removeChannel(channel); };
}

export async function fetchPlays(gameKey: string): Promise<LivePlay[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  const { data, error } = await supabase
    .from('live_plays').select(PLAY_COLS).eq('game_key', gameKey).order('seq', { ascending: true }).limit(400);
  if (error) throw new Error(error.message);
  return (data ?? []).map(toPlay);
}

export function subscribePlays(gameKey: string, onPlay: (p: LivePlay) => void): () => void {
  if (!supabase) return () => {};
  const client = supabase;
  const channel = client
    .channel(`live_plays_${gameKey}`)
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'live_plays', filter: `game_key=eq.${gameKey}` },
      (payload) => onPlay(toPlay(payload.new as Record<string, unknown>)))
    .subscribe();
  return () => { client.removeChannel(channel); };
}
