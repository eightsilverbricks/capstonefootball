/**
 * One team's season from predictions.json: schedule, record, division place,
 * Clark's outlook, and the latest injury and key-player notes.
 */
import { ApiPrediction, InjuryNote, KeyPlayer } from '@/types/prediction';
import { TEAMS, getTeam } from '@/data/teams';
import { isFinal } from '@/lib/gameStatus';

export interface WL { w: number; l: number }

export interface ScheduleRow {
  game: ApiPrediction;
  opponent: string;
  home: boolean;
  /** Set once the game is final. */
  result: { won: boolean; us: number; them: number } | null;
  clarkPicksUs: boolean;
  clarkProb: number;
}

const involves = (g: ApiPrediction, team: string) => g.home_team === team || g.away_team === team;
const graded = (g: ApiPrediction) => isFinal(g) && Boolean(g.actual_winner);

export function teamSchedule(team: string, games: ApiPrediction[]): ScheduleRow[] {
  return games
    .filter((g) => involves(g, team))
    .sort((a, b) => a.week - b.week)
    .map((g) => {
      const home = g.home_team === team;
      const us = (home ? g.home_score : g.away_score) ?? 0;
      const them = (home ? g.away_score : g.home_score) ?? 0;
      return {
        game: g,
        opponent: home ? g.away_team : g.home_team,
        home,
        result: graded(g) ? { won: g.actual_winner === team, us, them } : null,
        clarkPicksUs: g.predicted_winner === team,
        clarkProb: home ? g.home_win_prob : g.away_win_prob,
      };
    });
}

export function teamRecord(team: string, games: ApiPrediction[]): WL {
  const done = games.filter((g) => involves(g, team) && graded(g));
  const w = done.filter((g) => g.actual_winner === team).length;
  return { w, l: done.length - w };
}

/** 1-based place in the division by win %, then wins; null when nothing is graded. */
export function divisionPlace(team: string, games: ApiPrediction[]): number | null {
  const info = getTeam(team);
  if (!info) return null;
  const rivals = TEAMS.filter((t) => t.conference === info.conference && t.division === info.division);
  const table = rivals.map((t) => ({ abbr: t.abbr, rec: teamRecord(t.abbr, games) }));
  if (table.every((r) => r.rec.w + r.rec.l === 0)) return null;
  const pct = (r: WL) => (r.w + r.l ? r.w / (r.w + r.l) : 0);
  table.sort((a, b) => pct(b.rec) - pct(a.rec) || b.rec.w - a.rec.w || a.abbr.localeCompare(b.abbr));
  return table.findIndex((r) => r.abbr === team) + 1;
}

export interface Outlook {
  /** Clark's record picking this team's graded games. */
  clark: WL;
  /** Upcoming games Clark has this team winning, out of how many. */
  favoredIn: number;
  remaining: number;
  /** Sum of this team's win probabilities in games still to play. */
  expectedWins: number;
}

export function teamOutlook(schedule: ScheduleRow[]): Outlook {
  const done = schedule.filter((r) => r.result);
  const clarkW = done.filter((r) => r.clarkPicksUs === r.result?.won).length;
  const left = schedule.filter((r) => !r.result);
  return {
    clark: { w: clarkW, l: done.length - clarkW },
    favoredIn: left.filter((r) => r.clarkPicksUs).length,
    remaining: left.length,
    expectedWins: left.reduce((sum, r) => sum + r.clarkProb, 0),
  };
}

/** Injury and key-player notes for this team from its next game, or its latest one. */
export function teamNotes(team: string, schedule: ScheduleRow[]): { injuries: InjuryNote[]; players: KeyPlayer[]; from: ApiPrediction | null } {
  const next = schedule.find((r) => !r.result) ?? schedule[schedule.length - 1];
  if (!next) return { injuries: [], players: [], from: null };
  return {
    injuries: (next.game.injury_notes ?? []).filter((n) => n.team === team),
    players: (next.game.key_players ?? []).filter((p) => p.team === team),
    from: next.game,
  };
}

export const ordinal = (n: number): string => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
};
