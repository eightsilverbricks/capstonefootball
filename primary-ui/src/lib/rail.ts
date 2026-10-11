/**
 * Data for the masthead: the score rail (every game in the week) and the
 * community bar. Pure functions so they're unit-tested apart from React.
 */
import { ApiPrediction } from '@/types/prediction';
import { PickMap } from '@/data/picksRepository';
import { gameKey } from '@/lib/threeWaySignal';
import { isFinal } from '@/lib/gameStatus';
import { formatKickoff, kickoffSortKey } from '@/lib/slate';

export type RailStatus = 'final' | 'pre';
export type PickResult = 'win' | 'loss' | null;

export interface RailItem {
  key: string;
  game: ApiPrediction;
  status: RailStatus;
  statusLabel: string;
  winner: string | null;
  pickLabel: string;
  pickResult: PickResult;
}

const pct = (p: number): number => Math.round(p * 100);

function clarkLabel(g: ApiPrediction): string {
  const prob = g.predicted_winner === g.home_team ? g.home_win_prob : g.away_win_prob;
  return `Clark: ${g.predicted_winner} ${pct(prob)}%`;
}

export function buildRailItems(games: ApiPrediction[], picks: PickMap): RailItem[] {
  const items = games.map((game): RailItem => {
    const key = gameKey(game);
    const final = isFinal(game);
    const winner = final ? game.actual_winner ?? null : null;
    const pick = picks[key];
    let pickLabel = clarkLabel(game);
    let pickResult: PickResult = null;
    if (pick) {
      pickLabel = `You: ${pick.team} ${pct(pick.confidence)}%`;
      if (final && winner) {
        pickResult = pick.team === winner ? 'win' : 'loss';
        pickLabel += pickResult === 'win' ? ' ✓' : ' ✗';
      }
    }
    return {
      key,
      game,
      status: final ? 'final' : 'pre',
      statusLabel: final ? 'Final' : `${game.weekday ? `${game.weekday.slice(0, 3)} ` : ''}${formatKickoff(game.gametime)}`,
      winner,
      pickLabel,
      pickResult,
    };
  });
  // Upcoming games first (soonest kickoff), then finals.
  return [...items].sort((a, b) => {
    if (a.status !== b.status) return a.status === 'pre' ? -1 : 1;
    return kickoffSortKey(a.game).localeCompare(kickoffSortKey(b.game));
  });
}

export interface CommunityStat {
  id: string;
  /** Team whose logo leads the item, if any. */
  team?: string;
  label: string;
  value: string;
}

/** Facts about the week drawn only from real data (Clark's picks and graded results). */
export function weekStats(games: ApiPrediction[]): CommunityStat[] {
  if (games.length === 0) return [];
  const stats: CommunityStat[] = [];
  const graded = games.filter((g) => isFinal(g) && g.actual_winner);
  if (graded.length > 0) {
    const right = graded.filter((g) => g.actual_winner === g.predicted_winner).length;
    stats.push({ id: 'clark-record', label: 'Clark this week', value: `${right}–${graded.length - right}` });
  }
  const upcoming = games.filter((g) => !isFinal(g));
  const pool = upcoming.length > 0 ? upcoming : games;
  const probOf = (g: ApiPrediction) => Math.max(g.home_win_prob, g.away_win_prob);
  const lock = [...pool].sort((a, b) => probOf(b) - probOf(a))[0];
  stats.push({ id: 'lock', team: lock.predicted_winner, label: "Clark's most confident pick", value: `${lock.predicted_winner} ${pct(probOf(lock))}%` });
  const closest = [...pool].sort((a, b) => probOf(a) - probOf(b))[0];
  stats.push({ id: 'closest', label: 'Closest call', value: `${closest.away_team} @ ${closest.home_team}, ${pct(probOf(closest))}%` });
  stats.push({ id: 'games', label: 'Games this week', value: `${games.length} · ${upcoming.length} still to play` });
  return stats;
}

/** Your "W–L" per week, for weeks with at least one graded pick. */
export function weekRecords(games: ApiPrediction[], picks: PickMap): Record<number, string> {
  const tally: Record<number, { w: number; l: number }> = {};
  games.forEach((g) => {
    const pick = picks[gameKey(g)];
    if (!pick || !isFinal(g) || !g.actual_winner) return;
    const t = (tally[g.week] ??= { w: 0, l: 0 });
    if (pick.team === g.actual_winner) t.w += 1; else t.l += 1;
  });
  return Object.fromEntries(Object.entries(tally).map(([w, t]) => [Number(w), `${t.w}–${t.l}`]));
}
