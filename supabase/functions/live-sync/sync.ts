// ─── One live-sync tick ───────────────────────────────────────────────────────
// Called every 15 seconds by Supabase Cron (see the live_games migration).
// Outside game windows it returns after one database read, without touching
// ESPN. During games it fetches the scoreboard once, then one summary per live
// game, writes new plays with notes, and writes the final result when a game
// ends. All I/O is injected, so this file runs under node:test with fakes.

import type { LiveEvent, LivePlay } from './espnAdapter.ts';
import { SCOREBOARD_URL, SUMMARY_URL, parsePlays, parseScoreboard, parseWinProbability } from './espnAdapter.ts';
import type { PlayContext } from './plays.ts';
import { bigPlayReason, templateNote } from './plays.ts';

/** Start polling a game this long before kickoff. */
export const PREGAME_LEAD_MS = 10 * 60 * 1000;
/** With nothing scheduled this week, look again after this long. */
export const IDLE_RECHECK_MS = 6 * 60 * 60 * 1000;
/** Cap AI calls per tick so the free tier's per-minute limit is never hit. */
export const MAX_AI_NOTES_PER_TICK = 3;

export interface LiveGameRow {
  game_key: string;
  espn_event_id: string;
  season: number;
  week: number;
  home_team: string;
  away_team: string;
  status: 'pre' | 'in' | 'post';
  quarter: number | null;
  clock: string | null;
  home_score: number;
  away_score: number;
  possession: string | null;
  home_win_prob: number | null;
  down: number | null;
  distance: number | null;
  yard_line: string | null;
}

export interface LivePlayRow {
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
  note_source: 'ai' | 'template' | null;
  drive_id: string | null;
}

export interface ResultRow {
  game_key: string;
  home_team: string;
  away_team: string;
  home_score: number;
  away_score: number;
  /** null for a tie. */
  winner: string | null;
}

export interface Store {
  getNextCheckAt(): Promise<string | null>;
  setNextCheckAt(iso: string | null): Promise<void>;
  knownPlayIds(gameKey: string): Promise<Set<string>>;
  hasResult(gameKey: string): Promise<boolean>;
  upsertGame(row: LiveGameRow): Promise<void>;
  insertPlays(rows: LivePlayRow[]): Promise<void>;
  upsertResult(row: ResultRow): Promise<void>;
}

export type AiNoteFn = (p: LivePlay, ctx: PlayContext, template: string) => Promise<string | null>;

export interface SyncDeps {
  now: Date;
  fetchJson: (url: string) => Promise<any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  store: Store;
  aiNote?: AiNoteFn;
}

export interface SyncReport {
  skipped: boolean;
  gamesUpdated: number;
  playsInserted: number;
  aiNotes: number;
  resultsWritten: number;
}

/** Plays not stored yet, with big-play flags and notes. */
export async function buildPlayRows(
  event: LiveEvent,
  plays: LivePlay[],
  wp: Record<string, number>,
  known: Set<string>,
  aiNote: AiNoteFn | undefined,
  aiBudget: { left: number },
): Promise<{ rows: LivePlayRow[]; aiUsed: number }> {
  const rows: LivePlayRow[] = [];
  let aiUsed = 0;
  let prevWp: number | null = null;

  for (const p of plays) {
    const wpAfter = wp[p.playId] ?? prevWp;
    const ctx: PlayContext = { home: event.home, away: event.away, wpBefore: prevWp, wpAfter };
    prevWp = wpAfter;
    if (known.has(p.playId)) continue;

    const reason = bigPlayReason(p, ctx);
    let note: string | null = null;
    let source: LivePlayRow['note_source'] = null;
    if (reason) {
      note = templateNote(p, reason, ctx);
      source = 'template';
      if (aiNote && aiBudget.left > 0) {
        aiBudget.left -= 1;
        const fromAi = await aiNote(p, ctx, note);
        if (fromAi) {
          note = fromAi;
          source = 'ai';
          aiUsed += 1;
        }
      }
    }

    rows.push({
      game_key: event.gameKey,
      play_id: p.playId,
      seq: p.seq,
      quarter: p.quarter,
      clock: p.clock,
      play_type: p.type,
      text: p.text,
      yards: p.yards,
      offense: p.offense,
      home_score: p.homeScore,
      away_score: p.awayScore,
      home_win_prob: wpAfter,
      is_big: reason != null,
      big_reason: reason,
      note,
      note_source: source,
      drive_id: p.driveId,
    });
  }
  return { rows, aiUsed };
}

function gameRow(event: LiveEvent, homeWinProb: number | null): LiveGameRow {
  return {
    game_key: event.gameKey,
    espn_event_id: event.eventId,
    season: event.season,
    week: event.week,
    home_team: event.home,
    away_team: event.away,
    status: event.state,
    quarter: event.quarter,
    clock: event.clock,
    home_score: event.homeScore,
    away_score: event.awayScore,
    possession: event.possession,
    home_win_prob: homeWinProb,
    down: event.down,
    distance: event.distance,
    yard_line: event.yardLine,
  };
}

export function resultRow(event: LiveEvent): ResultRow {
  const winner = event.homeScore === event.awayScore
    ? null
    : event.homeScore > event.awayScore ? event.home : event.away;
  return {
    game_key: event.gameKey,
    home_team: event.home,
    away_team: event.away,
    home_score: event.homeScore,
    away_score: event.awayScore,
    winner,
  };
}

/** When the next tick needs to do real work (null = every tick). */
export function nextCheckAt(events: LiveEvent[], now: Date): string | null {
  if (events.some((e) => e.state === 'in')) return null;
  const upcoming = events
    .filter((e) => e.state === 'pre')
    .map((e) => Date.parse(e.startTime) - PREGAME_LEAD_MS)
    .filter((t) => Number.isFinite(t))
    .sort((a, b) => a - b);
  const next = upcoming[0] ?? now.getTime() + IDLE_RECHECK_MS;
  return next <= now.getTime() ? null : new Date(next).toISOString();
}

export async function runSync({ now, fetchJson, store, aiNote }: SyncDeps): Promise<SyncReport> {
  const report: SyncReport = { skipped: false, gamesUpdated: 0, playsInserted: 0, aiNotes: 0, resultsWritten: 0 };

  const gate = await store.getNextCheckAt();
  if (gate && now.getTime() < Date.parse(gate)) {
    return { ...report, skipped: true };
  }

  const events = parseScoreboard(await fetchJson(SCOREBOARD_URL));
  const aiBudget = { left: MAX_AI_NOTES_PER_TICK };

  for (const event of events) {
    const startsSoon = event.state === 'pre'
      && Date.parse(event.startTime) - now.getTime() <= PREGAME_LEAD_MS;
    const needsFinal = event.state === 'post' && !(await store.hasResult(event.gameKey));
    if (!(event.state === 'in' || needsFinal || startsSoon)) continue;

    if (event.state === 'pre') {
      await store.upsertGame(gameRow(event, null));
      report.gamesUpdated += 1;
      continue;
    }

    const summary = await fetchJson(SUMMARY_URL + event.eventId);
    const plays = parsePlays(summary, event.teamsById);
    const wp = parseWinProbability(summary);
    const known = await store.knownPlayIds(event.gameKey);
    const { rows, aiUsed } = await buildPlayRows(event, plays, wp, known, aiNote, aiBudget);
    if (rows.length) await store.insertPlays(rows);

    const lastWp = plays.length ? wp[plays[plays.length - 1].playId] ?? null : null;
    await store.upsertGame(gameRow(event, event.state === 'post' ? null : lastWp));
    if (event.state === 'post' && event.completed) {
      await store.upsertResult(resultRow(event));
      report.resultsWritten += 1;
    }

    report.gamesUpdated += 1;
    report.playsInserted += rows.length;
    report.aiNotes += aiUsed;
  }

  await store.setNextCheckAt(nextCheckAt(events, now));
  return report;
}
