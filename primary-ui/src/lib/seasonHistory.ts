// ─── seasonHistory — the full My Season derivation ────────────────────────────
// Pure. Extends seasonSummary with per-week rows (You vs Clark vs Vegas),
// cumulative curves, strongest calls / biggest misses, and pick tendencies.
// Everything is derived from the user's picks + predictions.json (which now
// carries real 2024 outcomes). Vegas net reuses the moneyline-derived
// getVegasPick; the fan direction reuses the real aggregated getFanPick, which
// is absent for games nobody else has picked — those simply don't count toward
// the "sided with the fans" tendency.

import { ApiPrediction } from '@/types/prediction';
import { SentimentMap } from '@/data/sentimentRepository';
import { gameKey, getVegasPick, getFanPick } from '@/lib/threeWaySignal';
import { UserPick } from '@/hooks/useUserPicks';
import { resolvePick, stakeFromConfidence, indexConfidenceFromScore } from '@/competition/scoring';

export interface WeekRow {
  week: number;
  weekLabel: string;
  shortLabel: string;
  picks: number;
  wins: number;
  losses: number;
  yourNet: number;
  clarkNet: number;
  vegasNet: number;
  cumYour: number;
  cumClark: number;
  cumVegas: number;
}

export interface PickHighlight {
  key: string;
  week: number;
  shortLabel: string;
  matchup: string;
  yourTeam: string;
  confidence: number;
  net: number;
  correct: boolean;
  tag: string;
}

export interface Tendencies {
  avgConviction: number;
  withClarkPct: number;
  fadeVegasPct: number;
  withFansPct: number;
  /** Picks that had a community read to compare against — 0 means withFansPct
   * is meaningless and callers should hide it rather than show 0%. */
  crowdComparableCount: number;
}

export interface SeasonHistory {
  weeks: WeekRow[];
  strongestCalls: PickHighlight[];
  biggestMisses: PickHighlight[];
  tendencies: Tendencies;
  longestWinStreak: number;
  totals: { yourNet: number; clarkNet: number; vegasNet: number; wins: number; losses: number };
}

export function shortWeekLabel(week: number): string {
  if (week <= 18) return `${week}`;
  return ['WC', 'DIV', 'CONF', 'SB'][week - 19] ?? `${week}`;
}

interface Row {
  key: string;
  week: number;
  weekLabel: string;
  gameDate: string;
  matchup: string;
  yourTeam: string;
  confidence: number;
  resolved: boolean;
  correct: boolean;
  yourNet: number;
  clarkNet: number;
  vegasNet: number;
  vegasExists: boolean;
  withClark: boolean;
  fadeVegas: boolean;
  /** null when no one else has picked this game — no crowd to agree with. */
  withFans: boolean | null;
}

function highlightTag(r: Row): string {
  if (r.correct) {
    if (!r.withClark) return 'Beat Clark';
    if (r.fadeVegas) return 'Faded Vegas ✓';
    if (r.withFans === false) return 'Minority call ✓';
    return 'Nailed it';
  }
  if (r.confidence >= 0.8) return 'Overconfident miss';
  if (!r.withClark) return 'Fought Clark, lost';
  return 'Cold call';
}

function buildRows(
  picks: Record<string, UserPick>,
  games: ApiPrediction[],
  sentiment: SentimentMap,
): Row[] {
  const byKey = new Map(games.map((g) => [gameKey(g), g]));
  const rows: Row[] = [];

  for (const [key, pick] of Object.entries(picks)) {
    const game = byKey.get(key);
    if (!game) continue;

    const winner = game.actual_winner ?? null;
    const resolved = winner != null;
    const vegas = getVegasPick(game);
    const fan = getFanPick(game, sentiment);
    const clarkConfidence = indexConfidenceFromScore(game.confidence_score);

    rows.push({
      key,
      week: game.week,
      weekLabel: game.week_label ?? `Week ${game.week}`,
      gameDate: game.game_date ?? '',
      matchup: `${game.away_team} at ${game.home_team}`,
      yourTeam: pick.team,
      confidence: pick.confidence,
      resolved,
      correct: resolved && pick.team === winner,
      yourNet: resolvePick({ team: pick.team, confidence: pick.confidence }, winner),
      clarkNet: resolvePick({ team: game.predicted_winner, confidence: clarkConfidence }, winner),
      vegasNet: vegas ? resolvePick({ team: vegas.team, confidence: vegas.prob }, winner) : 0,
      vegasExists: vegas != null,
      withClark: pick.team === game.predicted_winner,
      fadeVegas: vegas != null && pick.team !== vegas.team,
      withFans: fan ? pick.team === fan.team : null,
    });
  }
  return rows;
}

function computeWeeks(resolved: Row[]): WeekRow[] {
  const byWeek = new Map<number, Row[]>();
  for (const r of resolved) {
    const list = byWeek.get(r.week) ?? [];
    list.push(r);
    byWeek.set(r.week, list);
  }

  const weeks = [...byWeek.keys()].sort((a, b) => a - b);
  let cumYour = 0;
  let cumClark = 0;
  let cumVegas = 0;

  return weeks.map((week) => {
    const rows = byWeek.get(week)!;
    const yourNet = rows.reduce((s, r) => s + r.yourNet, 0);
    const clarkNet = rows.reduce((s, r) => s + r.clarkNet, 0);
    const vegasNet = rows.reduce((s, r) => s + r.vegasNet, 0);
    cumYour += yourNet;
    cumClark += clarkNet;
    cumVegas += vegasNet;
    return {
      week,
      weekLabel: rows[0].weekLabel,
      shortLabel: shortWeekLabel(week),
      picks: rows.length,
      wins: rows.filter((r) => r.correct).length,
      losses: rows.filter((r) => !r.correct).length,
      yourNet,
      clarkNet,
      vegasNet,
      cumYour,
      cumClark,
      cumVegas,
    };
  });
}

function computeLongestWinStreak(resolved: Row[]): number {
  let best = 0;
  let run = 0;
  for (const r of resolved) {
    if (r.correct) {
      run += 1;
      best = Math.max(best, run);
    } else {
      run = 0;
    }
  }
  return best;
}

function toHighlight(r: Row): PickHighlight {
  return {
    key: r.key,
    week: r.week,
    shortLabel: shortWeekLabel(r.week),
    matchup: r.matchup,
    yourTeam: r.yourTeam,
    confidence: r.confidence,
    net: r.yourNet,
    correct: r.correct,
    tag: highlightTag(r),
  };
}

export function computeSeasonHistory(
  picks: Record<string, UserPick>,
  games: ApiPrediction[],
  sentiment: SentimentMap,
): SeasonHistory {
  const rows = buildRows(picks, games, sentiment);
  rows.sort((a, b) => (a.week - b.week) || a.gameDate.localeCompare(b.gameDate));

  const resolved = rows.filter((r) => r.resolved);
  const weeks = computeWeeks(resolved);

  const strongestCalls = resolved
    .filter((r) => r.correct)
    .sort((a, b) => b.yourNet - a.yourNet)
    .slice(0, 5)
    .map(toHighlight);

  const biggestMisses = resolved
    .filter((r) => !r.correct)
    .sort((a, b) => a.yourNet - b.yourNet)
    .slice(0, 5)
    .map(toHighlight);

  const withVegas = rows.filter((r) => r.vegasExists);
  // Only games the community has actually weighed in on can say anything about
  // how often you side with them.
  const withCrowd = rows.filter((r) => r.withFans !== null);
  const tendencies: Tendencies = {
    avgConviction: rows.length ? rows.reduce((s, r) => s + r.confidence, 0) / rows.length : 0.5,
    withClarkPct: rows.length ? rows.filter((r) => r.withClark).length / rows.length : 0,
    fadeVegasPct: withVegas.length ? withVegas.filter((r) => r.fadeVegas).length / withVegas.length : 0,
    withFansPct: withCrowd.length ? withCrowd.filter((r) => r.withFans).length / withCrowd.length : 0,
    crowdComparableCount: withCrowd.length,
  };

  return {
    weeks,
    strongestCalls,
    biggestMisses,
    tendencies,
    longestWinStreak: computeLongestWinStreak(resolved),
    totals: {
      yourNet: resolved.reduce((s, r) => s + r.yourNet, 0),
      clarkNet: resolved.reduce((s, r) => s + r.clarkNet, 0),
      vegasNet: resolved.reduce((s, r) => s + r.vegasNet, 0),
      wins: resolved.filter((r) => r.correct).length,
      losses: resolved.filter((r) => !r.correct).length,
    },
  };
}
