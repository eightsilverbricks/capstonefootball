/**
 * Data for the masthead: the score rail (every game in the week) and the
 * community bar. Pure functions so they're unit-tested apart from React.
 */
import { ApiPrediction } from '@/types/prediction';
import { PickMap } from '@/data/picksRepository';
import { gameKey } from '@/lib/threeWaySignal';
import { isFinal } from '@/lib/gameStatus';
import { formatKickoff, kickoffSortKey } from '@/lib/slate';
import { liveClock, pickStanding, type LiveAware } from '@/lib/live';

export type RailStatus = 'live' | 'pre' | 'final';
export type PickResult = 'win' | 'loss' | null;

export interface RailItem {
  key: string;
  game: ApiPrediction;
  status: RailStatus;
  statusLabel: string;
  winner: string | null;
  pickLabel: string;
  pickResult: PickResult;
  /** Live score while the game is on. */
  score: { away: number; home: number } | null;
}

const pct = (p: number): number => Math.round(p * 100);

function clarkLabel(g: ApiPrediction): string {
  const prob = g.predicted_winner === g.home_team ? g.home_win_prob : g.away_win_prob;
  return `Clark: ${g.predicted_winner} ${pct(prob)}%`;
}

/** Signed out, Clark's pick is members-only, so the rail names it without giving it away. */
export const LOCKED_CLARK_LABEL = 'Clark: members only';

export function buildRailItems(games: LiveAware[], picks: PickMap, { showClark = true }: { showClark?: boolean } = {}): RailItem[] {
  const items = games.map((game): RailItem => {
    const key = gameKey(game);
    const final = isFinal(game);
    const live = !final && game.live?.status === 'in' ? game.live : null;
    const winner = final ? game.actual_winner ?? null : null;
    const pick = picks[key];
    let pickLabel = showClark ? clarkLabel(game) : LOCKED_CLARK_LABEL;
    let pickResult: PickResult = null;
    if (pick) {
      pickLabel = `You: ${pick.team} ${pct(pick.confidence)}%`;
      if (final && winner) {
        pickResult = pick.team === winner ? 'win' : 'loss';
        pickLabel += pickResult === 'win' ? ' ✓' : ' ✗';
      } else if (live) {
        pickLabel += ` · ${pickStanding(pick.team, live)}`;
      }
    }
    return {
      key,
      game,
      status: final ? 'final' : live ? 'live' : 'pre',
      statusLabel: final ? 'Final' : live ? liveClock(live)
        : `${game.weekday ? `${game.weekday.slice(0, 3)} ` : ''}${formatKickoff(game.gametime)}`,
      score: final ? { away: game.away_score ?? 0, home: game.home_score ?? 0 }
        : live ? { away: live.away_score, home: live.home_score } : null,
      winner,
      pickLabel,
      pickResult,
    };
  });
  // Live games first, then upcoming (soonest kickoff), then finals.
  const order: Record<RailStatus, number> = { live: 0, pre: 1, final: 2 };
  return [...items].sort((a, b) => {
    if (a.status !== b.status) return order[a.status] - order[b.status];
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
/** `showClark: false` leaves out the two stats that give away Clark's picks. */
export function weekStats(games: ApiPrediction[], { showClark = true }: { showClark?: boolean } = {}): CommunityStat[] {
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
  if (showClark) {
    const lock = [...pool].sort((a, b) => probOf(b) - probOf(a))[0];
    stats.push({ id: 'lock', team: lock.predicted_winner, label: "Clark's most confident pick", value: `${lock.predicted_winner} ${pct(probOf(lock))}%` });
    const closest = [...pool].sort((a, b) => probOf(a) - probOf(b))[0];
    stats.push({ id: 'closest', label: 'Closest call', value: `${closest.away_team} @ ${closest.home_team}, ${pct(probOf(closest))}%` });
  }
  const liveNow = upcoming.filter((g) => (g as LiveAware).live?.status === 'in').length;
  const toPlay = upcoming.length - liveNow;
  stats.push({ id: 'games', label: 'Games this week', value: [`${games.length}`, liveNow ? `${liveNow} live` : '', toPlay ? `${toPlay} to play` : ''].filter(Boolean).join(' · ') });
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
