// ─── live — pure helpers over live-sync data ─────────────────────────────────
// Merging live scores into the predictions feed, grouping plays into drives,
// grading Clark's pregame calls as the game happens (the live factor
// tracker, CLARK_OVERHAUL_PLAN.md §4 Tab 2), and picking the plays that
// decided a game for the recap.

import type { ApiPrediction } from '@/types/prediction';
import type { DriveSummary, LiveGame, LivePlay } from '@/data/liveRepository';

/** League-typical yards per play; above it an offense is moving the ball. */
export const LEAGUE_YPP = 5.0;
const SPECIAL = /punt|kickoff|field goal|extra point|two-point|timeout|end of|penalty|kneel|spike|coin toss/i;
const TURNOVER = /interception|fumble recovery \(opponent\)/i;

export type LiveAware = ApiPrediction & { live?: LiveGame };

/** The prediction with live state attached, and a final applied the moment it lands. */
export function applyLive(game: ApiPrediction, live: LiveGame | undefined): LiveAware {
  if (!live) return game;
  if (live.status === 'post' && game.home_score == null) {
    const winner = live.home_score === live.away_score ? null
      : live.home_score > live.away_score ? live.home_team : live.away_team;
    return { ...game, live, home_score: live.home_score, away_score: live.away_score, actual_winner: winner };
  }
  return { ...game, live };
}

export function isLive(game: LiveAware): boolean {
  return game.live?.status === 'in';
}

/** "Q3 4:12", "Halftime", "Final". */
export function liveClock(live: LiveGame): string {
  if (live.status === 'post') return 'Final';
  if (live.status === 'pre') return 'Starting soon';
  if (live.quarter === 2 && (live.clock === '0:00' || !live.clock)) return 'Halftime';
  const q = (live.quarter ?? 0) > 4 ? 'OT' : `Q${live.quarter ?? 1}`;
  return live.clock ? `${q} ${live.clock}` : q;
}

/** "3rd & 7 at KC 35". */
export function downAndDistance(live: LiveGame): string | null {
  if (live.status !== 'in' || !live.down) return null;
  const ord = ['', '1st', '2nd', '3rd', '4th'][live.down] ?? `${live.down}th`;
  return `${ord} & ${live.distance ?? '?'}${live.yard_line ? ` at ${live.yard_line}` : ''}`;
}

// ─── Drives ──────────────────────────────────────────────────────────────────

export interface Drive {
  id: string;
  offense: string | null;
  plays: LivePlay[];
  yards: number;
  result: string;
  big: LivePlay[];
  /** ESPN's "8 plays, 75 yards, 4:12", when the feed has it. */
  description: string | null;
  /** Where it started, e.g. "SEA 29". */
  start: string | null;
}

/** ESPN's long drive results, in the short form the feed shows. */
const SHORT_RESULT: Record<string, string> = { Touchdown: 'TD', 'Field Goal': 'FG', 'Downs': 'Downs' };

/**
 * The team with the ball on most real snaps. A drive's first play is often
 * the kickoff, which ESPN credits to the kicking team.
 */
function driveOffense(plays: LivePlay[]): string | null {
  const counts = new Map<string, number>();
  for (const p of plays) {
    if (!p.offense || SPECIAL.test(p.play_type)) continue;
    counts.set(p.offense, (counts.get(p.offense) ?? 0) + 1);
  }
  let best: string | null = null;
  let most = 0;
  for (const [team, n] of counts) if (n > most) { best = team; most = n; }
  return best ?? plays.find((p) => p.offense)?.offense ?? null;
}

function driveResult(last: LivePlay, next: LivePlay | null, gameOver: boolean): string {
  const t = last.play_type.toLowerCase();
  if (t.includes('touchdown') || /touchdown/i.test(last.text)) return 'TD';
  if (t.includes('field goal good')) return 'FG';
  if (t.includes('field goal')) return 'Missed FG';
  if (t.includes('punt')) return 'Punt';
  if (TURNOVER.test(last.play_type)) return 'Turnover';
  if (t.includes('end of half') || /end of (half|game)/i.test(last.text)) return 'End of half';
  if (!next) return gameOver ? 'End of game' : 'In progress';
  // The ball changed hands with no score, punt or turnover: stopped on downs,
  // or the half ran out.
  if (next.offense && next.offense !== last.offense && next.quarter === last.quarter) return 'Downs';
  return next.quarter >= 3 && last.quarter <= 2 ? 'End of half' : 'Downs';
}

/**
 * Plays grouped by drive, oldest first. ESPN's drive summaries, when given,
 * are the authority on who had the ball, the yards and how it ended.
 */
export function groupDrives(plays: LivePlay[], gameOver = false, summaries: DriveSummary[] = []): Drive[] {
  const groups: { id: string; plays: LivePlay[] }[] = [];
  for (const p of [...plays].sort((a, b) => a.seq - b.seq)) {
    const id = p.drive_id ?? 'none';
    const last = groups[groups.length - 1];
    if (last && last.id === id) last.plays.push(p);
    else groups.push({ id, plays: [p] });
  }
  const byId = new Map(summaries.map((d) => [d.id, d]));
  return groups.map((g, i) => {
    const meta = byId.get(g.id);
    const counted = g.plays.filter((p) => !SPECIAL.test(p.play_type)).reduce((n, p) => n + p.yards, 0);
    const fallback = driveResult(g.plays[g.plays.length - 1], groups[i + 1]?.plays[0] ?? null, gameOver);
    const result = meta?.result ? SHORT_RESULT[meta.result] ?? meta.result
      : meta && !gameOver && i === groups.length - 1 ? 'In progress' : fallback;
    return {
      id: g.id,
      offense: meta?.team ?? driveOffense(g.plays),
      plays: g.plays,
      yards: meta ? meta.yards : counted,
      result,
      big: g.plays.filter((p) => p.is_big),
      description: meta?.description || null,
      start: meta?.start ?? null,
    };
  });
}

// ─── Game clock ──────────────────────────────────────────────────────────────

/** Regulation length, and the length of a regular-season overtime. */
export const REGULATION_S = 3600;
export const OT_S = 600;

/** Seconds of game time played when this quarter showed this clock. */
export function elapsedSeconds(quarter: number, clock: string): number {
  const [m, s] = clock.split(':').map(Number);
  const left = Number.isFinite(m) && Number.isFinite(s) ? m * 60 + s : 0;
  if (quarter <= 4) return (Math.max(1, quarter) - 1) * 900 + (900 - Math.min(900, left));
  return REGULATION_S + (quarter - 5) * OT_S + (OT_S - Math.min(OT_S, left));
}

export interface WpPoint { t: number; p: number; play: LivePlay }

/** Home win % against game time, one point per play that has one. */
export function winProbSeries(plays: LivePlay[]): WpPoint[] {
  const out: WpPoint[] = [];
  for (const play of [...plays].sort((a, b) => a.seq - b.seq)) {
    if (play.home_win_prob == null) continue;
    // Clocks only run down; keep the line from doubling back on a stray stamp.
    const t = Math.max(out.length ? out[out.length - 1].t : 0, elapsedSeconds(play.quarter, play.clock));
    out.push({ t, p: play.home_win_prob, play });
  }
  return out;
}

// ─── Field ───────────────────────────────────────────────────────────────────

export interface FieldState {
  /** Ball spot, yards from the home goal line. */
  ball: number;
  /** Line to gain on the same scale, or null (goal to go, or unknown). */
  toGain: number | null;
  /** Which way the offense is going: +1 toward the away goal, -1 toward home. */
  direction: 1 | -1 | 0;
  offense: string | null;
}

/** Where the ball is and where the sticks are, from the live situation. */
export function fieldState(live: LiveGame): FieldState | null {
  if (live.status !== 'in' || live.ball_on == null) return null;
  const ball = Math.min(100, Math.max(0, live.ball_on));
  const offense = live.possession;
  const direction: FieldState['direction'] = offense === live.home_team ? 1 : offense === live.away_team ? -1 : 0;
  const gain = live.distance != null && live.down != null && direction !== 0 ? ball + direction * live.distance : null;
  const toGain = gain != null && gain > 0 && gain < 100 ? gain : null;
  return { ball, toGain, direction, offense };
}

/** Seconds since the live row last changed. */
export function secondsSince(iso: string, now = Date.now()): number {
  const t = Date.parse(iso);
  return Number.isFinite(t) ? Math.max(0, Math.round((now - t) / 1000)) : Number.POSITIVE_INFINITY;
}

/** The drive in progress: the last one, while the game is still going. */
export function currentDrive(drives: Drive[], gameOver: boolean): Drive | null {
  if (gameOver || !drives.length) return null;
  const last = drives[drives.length - 1];
  return last.result === 'In progress' ? last : null;
}

/** "3rd & 7" for a play, or null for kicks and untimed downs. */
export function playDown(p: LivePlay): string | null {
  if (!p.down || p.down > 4) return null;
  const ord = ['', '1st', '2nd', '3rd', '4th'][p.down];
  return `${ord} & ${p.distance ?? '?'}`;
}

// ─── Box score from plays ────────────────────────────────────────────────────

export interface TeamLine { plays: number; yards: number; ypp: number; turnovers: number; sacksTaken: number }

export function teamLines(plays: LivePlay[], home: string, away: string): Record<string, TeamLine> {
  const out: Record<string, TeamLine> = {
    [home]: { plays: 0, yards: 0, ypp: 0, turnovers: 0, sacksTaken: 0 },
    [away]: { plays: 0, yards: 0, ypp: 0, turnovers: 0, sacksTaken: 0 },
  };
  for (const p of plays) {
    const line = p.offense ? out[p.offense] : undefined;
    if (!line) continue;
    if (TURNOVER.test(p.play_type)) line.turnovers += 1;
    if (/^sack/i.test(p.play_type)) line.sacksTaken += 1;
    if (SPECIAL.test(p.play_type)) continue;
    line.plays += 1;
    line.yards += p.yards;
  }
  for (const line of Object.values(out)) line.ypp = line.plays ? line.yards / line.plays : 0;
  return out;
}

/** Score at the end of the first half, once the second half has started. */
export function halftimeScore(plays: LivePlay[]): { home: number; away: number } | null {
  const first = plays.filter((p) => p.quarter <= 2);
  if (!first.length || !plays.some((p) => p.quarter >= 3)) return null;
  const last = first.reduce((a, b) => (b.seq > a.seq ? b : a));
  return { home: last.home_score, away: last.away_score };
}

// ─── Live factor tracker ─────────────────────────────────────────────────────

export type TrackState = 'yes' | 'no' | 'waiting';
export interface TrackItem { claim: string; now: string; state: TrackState }

const one = (n: number) => n.toFixed(1);

/** Clark's three pregame calls, graded against the plays so far. */
export function factorTracker(game: ApiPrediction, plays: LivePlay[]): TrackItem[] {
  const over = game.home_score != null && game.away_score != null;
  const soFar = over ? 'in the game' : 'so far';
  const pick = game.predicted_winner;
  const other = pick === game.home_team ? game.away_team : game.home_team;
  const lines = teamLines(plays, game.home_team, game.away_team);
  const items: TrackItem[] = [];
  const deciding = game.clark_report?.deciding.table;

  if (deciding) {
    const off = deciding.offense_team;
    const line = lines[off];
    const pickHasBall = off === pick;
    const claim = pickHasBall
      ? `The ${off} offense would move the ball on ${deciding.defense_team}`
      : `The ${deciding.defense_team} defense would stall ${off}`;
    const moving = line.ypp >= LEAGUE_YPP;
    items.push({
      claim,
      now: !line.plays ? 'Waiting for the first snaps'
        : line.plays < 8 ? `${off}: ${one(line.ypp)} yards per play on ${line.plays} snaps. Graded after 8.`
        : `${off}: ${one(line.ypp)} yards per play ${soFar}`,
      state: line.plays < 8 ? 'waiting' : (pickHasBall ? moving : !moving) ? 'yes' : 'no',
    });
  }

  const pickTo = lines[pick].turnovers;
  const otherTo = lines[other].turnovers;
  items.push({
    claim: `${pick} would not lose the turnover battle by 2+`,
    now: `Turnovers: ${pick} ${pickTo}, ${other} ${otherTo}`,
    state: pickTo - otherTo >= 2 ? 'no' : plays.length < 20 ? 'waiting' : 'yes',
  });

  const half = halftimeScore(plays);
  const pickIsHome = pick === game.home_team;
  if (deciding?.offense_team === pick) {
    const pts = half ? (pickIsHome ? half.home : half.away) : null;
    items.push({
      claim: `${pick} would have 10+ points at halftime`,
      now: pts == null ? 'Checked at halftime' : `${pick} had ${pts} at the half`,
      state: pts == null ? 'waiting' : pts >= 10 ? 'yes' : 'no',
    });
  } else {
    const pts = half ? (pickIsHome ? half.away : half.home) : null;
    items.push({
      claim: `${other} would score under 14 in the first half`,
      now: pts == null ? 'Checked at halftime' : `${other} had ${pts} at the half`,
      state: pts == null ? 'waiting' : pts < 14 ? 'yes' : 'no',
    });
  }
  return items;
}

// ─── Recap ───────────────────────────────────────────────────────────────────

export interface Swing { play: LivePlay; swing: number }

/** The n plays that moved the home win % the most. */
export function decidingPlays(plays: LivePlay[], n = 5): Swing[] {
  const ordered = [...plays].sort((a, b) => a.seq - b.seq);
  const swings: Swing[] = [];
  let prev: number | null = null;
  for (const p of ordered) {
    if (p.home_win_prob == null) continue;
    if (prev != null) swings.push({ play: p, swing: p.home_win_prob - prev });
    prev = p.home_win_prob;
  }
  return swings.sort((a, b) => Math.abs(b.swing) - Math.abs(a.swing)).slice(0, n)
    .sort((a, b) => a.play.seq - b.play.seq);
}

/** "winning" / "losing" / "tied" for a pick against the live score. */
export function pickStanding(team: string, game: { home_team: string; home_score: number; away_score: number }): 'winning' | 'losing' | 'tied' {
  const mine = team === game.home_team ? game.home_score : game.away_score;
  const theirs = team === game.home_team ? game.away_score : game.home_score;
  return mine > theirs ? 'winning' : mine < theirs ? 'losing' : 'tied';
}

/** Key for the current 4th-down poll, or null when it isn't 4th down. */
export function pollKey(live: LiveGame): string | null {
  if (live.status !== 'in' || live.down !== 4) return null;
  return `${live.quarter}|${live.yard_line ?? ''}|${live.possession ?? ''}`;
}
