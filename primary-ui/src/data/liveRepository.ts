// ─── Live data — written by the live-sync Edge Function, pushed by Realtime ──
// live_games (score, clock, situation, win %), live_plays (every snap with
// notes on big plays) and results (finals). Everything here is public-read.

import { isSupabaseConfigured, supabase } from '@/auth/supabaseClient';

export type LiveStatus = 'pre' | 'in' | 'post';

/** One drive as ESPN summarises it. */
export interface DriveSummary {
  id: string;
  team: string | null;
  /** "8 plays, 75 yards, 4:12". */
  description: string;
  /** "Touchdown", "Punt", … null while the drive is going. */
  result: string | null;
  start: string | null;
  plays: number;
  yards: number;
  scoring: boolean;
}

export type LeaderKind = 'passing' | 'rushing' | 'receiving';
export interface Leader { id: string; name: string; line: string }
export interface BoxScore {
  /** Per team: total_yards, passing, rushing, first_downs, third_down, … as display strings. */
  teams: Record<string, Record<string, string>>;
  leaders: Record<string, Partial<Record<LeaderKind, Leader>>>;
}

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
  /** Ball spot in yards from the home goal line (0–100). */
  ball_on?: number | null;
  red_zone?: boolean;
  home_timeouts?: number | null;
  away_timeouts?: number | null;
  last_play?: string | null;
  drives?: DriveSummary[] | null;
  box?: BoxScore | null;
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
  down?: number | null;
  distance?: number | null;
  /** Ball spot before and after the snap, yards from the home goal line. */
  start_yard?: number | null;
  end_yard?: number | null;
  scoring?: boolean;
  created_at: string;
}

const GAME_COLS = 'game_key,status,quarter,clock,home_team,away_team,home_score,away_score,possession,home_win_prob,down,distance,yard_line,ball_on,red_zone,home_timeouts,away_timeouts,last_play,drives,box,updated_at';
const PLAY_COLS = 'game_key,play_id,seq,quarter,clock,play_type,text,yards,offense,home_score,away_score,home_win_prob,is_big,big_reason,note,drive_id,down,distance,start_yard,end_yard,scoring,created_at';

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

/** The latest big plays across every game. */
export async function fetchRecentBigPlays(limit = 8): Promise<LivePlay[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  const { data, error } = await supabase
    .from('live_plays').select(PLAY_COLS).eq('is_big', true).order('created_at', { ascending: false }).limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []).map(toPlay);
}

export function subscribeBigPlays(onPlay: (p: LivePlay) => void): () => void {
  if (!supabase) return () => {};
  const client = supabase;
  const channel = client
    .channel('live_plays_big')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'live_plays', filter: 'is_big=eq.true' },
      (payload) => onPlay(toPlay(payload.new as Record<string, unknown>)))
    .subscribe();
  return () => { client.removeChannel(channel); };
}
