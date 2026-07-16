// ─── seasonSummary — derive the user's season standing from their picks ───────
// Pure. Joins the session's locked picks (from useUserPicks) against the games
// (which now carry real 2024 outcomes via actual_winner) and reduces them with
// the Clark Competition scoring primitives. Everything here is derived, never
// stored — the single source of truth stays the picks store + predictions.json.

import { ApiPrediction } from '@/types/prediction';
import { gameKey } from '@/lib/threeWaySignal';
import { UserPick } from '@/hooks/useUserPicks';
import { resolvePick, stakeFromConfidence, indexConfidenceFromScore } from '@/competition/scoring';

export interface Streak {
  type: 'W' | 'L';
  count: number;
}

export interface SeasonSummary {
  picksMade: number;
  resolvedCount: number;
  pendingCount: number;
  /** Sum of stakes still unresolved (pending games). */
  creditsPending: number;
  /** Your net credits across resolved picks (the season score). */
  seasonScore: number;
  /** Clark's net credits on the SAME games you picked. */
  clarkScore: number;
  /** seasonScore − clarkScore: are you beating the model on your own slate? */
  clarkDifferential: number;
  wins: number;
  losses: number;
  /** Net credits from the most recent week you have a resolved pick in. */
  latestWeek: number | null;
  latestWeekLabel: string | null;
  latestWeekNet: number;
  /** Current run of consecutive same-result resolved picks, newest-first. */
  streak: Streak | null;
}

interface Row {
  week: number;
  weekLabel: string;
  gameDate: string;
  resolved: boolean;
  correct: boolean | null;
  yourNet: number;
  clarkNet: number;
  stake: number;
}

function buildRows(picks: Record<string, UserPick>, games: ApiPrediction[]): Row[] {
  const byKey = new Map(games.map((g) => [gameKey(g), g]));
  const rows: Row[] = [];

  for (const [key, pick] of Object.entries(picks)) {
    const game = byKey.get(key);
    if (!game) continue;

    const winner = game.actual_winner ?? null;
    const resolved = winner != null;
    const clarkConfidence = indexConfidenceFromScore(game.confidence_score);

    rows.push({
      week: game.week,
      weekLabel: game.week_label ?? `Week ${game.week}`,
      gameDate: game.game_date ?? '',
      resolved,
      correct: resolved ? pick.team === winner : null,
      yourNet: resolvePick({ team: pick.team, confidence: pick.confidence }, winner),
      clarkNet: resolvePick({ team: game.predicted_winner, confidence: clarkConfidence }, winner),
      stake: stakeFromConfidence(pick.confidence),
    });
  }
  return rows;
}

/** Consecutive same-result run at the end of the chronologically-ordered picks. */
function computeStreak(resolvedRows: Row[]): Streak | null {
  if (resolvedRows.length === 0) return null;
  const last = resolvedRows[resolvedRows.length - 1];
  const type: 'W' | 'L' = last.correct ? 'W' : 'L';
  let count = 0;
  for (let i = resolvedRows.length - 1; i >= 0; i--) {
    if ((resolvedRows[i].correct ? 'W' : 'L') !== type) break;
    count++;
  }
  return { type, count };
}

export function computeSeasonSummary(
  picks: Record<string, UserPick>,
  games: ApiPrediction[],
): SeasonSummary {
  const rows = buildRows(picks, games);
  // Chronological order so streak + "latest week" read correctly.
  rows.sort((a, b) => (a.week - b.week) || a.gameDate.localeCompare(b.gameDate));

  const resolved = rows.filter((r) => r.resolved);
  const pending = rows.filter((r) => !r.resolved);

  const seasonScore = resolved.reduce((s, r) => s + r.yourNet, 0);
  const clarkScore = resolved.reduce((s, r) => s + r.clarkNet, 0);
  const wins = resolved.filter((r) => r.correct === true).length;
  const losses = resolved.filter((r) => r.correct === false).length;

  const latest = resolved.length > 0 ? resolved[resolved.length - 1] : null;
  const latestWeek = latest ? latest.week : null;
  const latestWeekNet = latest
    ? resolved.filter((r) => r.week === latest.week).reduce((s, r) => s + r.yourNet, 0)
    : 0;

  return {
    picksMade: rows.length,
    resolvedCount: resolved.length,
    pendingCount: pending.length,
    creditsPending: pending.reduce((s, r) => s + r.stake, 0),
    seasonScore,
    clarkScore,
    clarkDifferential: seasonScore - clarkScore,
    wins,
    losses,
    latestWeek,
    latestWeekLabel: latest ? latest.weekLabel : null,
    latestWeekNet,
    streak: computeStreak(resolved),
  };
}
