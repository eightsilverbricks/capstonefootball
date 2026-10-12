/**
 * My season, sliced: week-by-week squares, splits, and records by division.
 * Built only from your real picks and graded results.
 */
import { ApiPrediction } from '@/types/prediction';
import { PickMap } from '@/data/picksRepository';
import { getTeam } from '@/data/teams';
import { gameKey } from '@/lib/threeWaySignal';
import { isFinal } from '@/lib/gameStatus';
import { kickoffSortKey } from '@/lib/slate';

export interface WL { w: number; l: number }
export type Square = 'w' | 'l' | 'n';

export interface PickRow {
  game: ApiPrediction;
  team: string;
  confidence: number;
  /** null until the game is graded. */
  correct: boolean | null;
}

/** Your picks joined to their games, in kickoff order. */
export function pickRows(picks: PickMap, games: ApiPrediction[]): PickRow[] {
  return games
    .filter((g) => picks[gameKey(g)])
    .map((g) => {
      const pick = picks[gameKey(g)];
      const graded = isFinal(g) && g.actual_winner;
      return { game: g, team: pick.team, confidence: pick.confidence, correct: graded ? pick.team === g.actual_winner : null };
    })
    .sort((a, b) => a.game.week - b.game.week
      || kickoffSortKey(a.game).localeCompare(kickoffSortKey(b.game))
      || gameKey(a.game).localeCompare(gameKey(b.game)));
}

const tally = (rows: PickRow[]): WL => ({
  w: rows.filter((r) => r.correct === true).length,
  l: rows.filter((r) => r.correct === false).length,
});

export interface WeekLine {
  week: number;
  squares: Square[];
  you: WL;
  /** Clark on the same games you picked, so the two records compare like for like. */
  clark: WL;
}

export function weekLines(rows: PickRow[]): WeekLine[] {
  const weeks = [...new Set(rows.map((r) => r.game.week))].sort((a, b) => a - b);
  return weeks.map((week) => {
    const mine = rows.filter((r) => r.game.week === week);
    const graded = mine.filter((r) => r.correct !== null).map((r) => r.game);
    const clarkW = graded.filter((g) => g.predicted_winner === g.actual_winner).length;
    return {
      week,
      squares: mine.map((r) => (r.correct === null ? 'n' : r.correct ? 'w' : 'l')),
      you: tally(mine),
      clark: { w: clarkW, l: graded.length - clarkW },
    };
  });
}

export interface Split { id: string; label: string; record: WL }

/** Records that say something about how you pick. Empty splits are dropped. */
export function splits(rows: PickRow[], favoriteTeam: string | null): Split[] {
  const team = favoriteTeam ? getTeam(favoriteTeam)?.name ?? favoriteTeam : null;
  const all: Split[] = [
    { id: 'against', label: 'Going against Clark', record: tally(rows.filter((r) => r.team !== r.game.predicted_winner)) },
    { id: 'with', label: 'Agreeing with Clark', record: tally(rows.filter((r) => r.team === r.game.predicted_winner)) },
    { id: 'sure', label: 'Confidence 80% or more', record: tally(rows.filter((r) => r.confidence >= 0.8)) },
    { id: 'unsure', label: 'Confidence under 60%', record: tally(rows.filter((r) => r.confidence < 0.6)) },
  ];
  if (favoriteTeam && team) {
    all.push({ id: 'team', label: `Picking the ${team}`, record: tally(rows.filter((r) => r.team === favoriteTeam)) });
  }
  return all.filter((s) => s.record.w + s.record.l > 0);
}

export interface DivisionLine { division: string; you: WL; rate: number }

/** Your record in games involving each division (a game counts for both teams' divisions). */
export function divisionLines(rows: PickRow[]): DivisionLine[] {
  const by = new Map<string, PickRow[]>();
  rows.filter((r) => r.correct !== null).forEach((r) => {
    const divs = new Set([r.game.home_team, r.game.away_team].map((t) => {
      const info = getTeam(t);
      return info ? `${info.conference} ${info.division}` : null;
    }).filter((d): d is string => d !== null));
    divs.forEach((d) => by.set(d, [...(by.get(d) ?? []), r]));
  });
  return [...by.entries()]
    .map(([division, list]) => {
      const you = tally(list);
      return { division, you, rate: you.w / (you.w + you.l) };
    })
    .sort((a, b) => b.rate - a.rate || b.you.w - a.you.w);
}

export const formatRecord = (r: WL): string => `${r.w}–${r.l}`;
