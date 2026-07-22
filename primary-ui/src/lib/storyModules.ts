// ─── storyModules — the homepage's editorial "conversation" layer ─────────────
// Builds the compact set of large story modules that sit beside The Signal:
// support swinging, the boldest public call, and the most divided fanbase.
// Reuses the same Clark/Vegas/Fan helpers; fan data + the sentiment series are
// the PROVISIONAL placeholders documented in threeWaySignal.ts.

import { ApiPrediction } from '@/types/prediction';
import { gameKey, getFanPick, getFanSentimentSeries, SentimentPoint } from './threeWaySignal';
import { getHeroInsight } from './heroInsight';

export interface StoryModule {
  id: string;
  kicker: string;
  headline: string;
  accentTeam: string;
  game: ApiPrediction;
  statLabel: string;
  statValue: string;
  sparkline?: SentimentPoint[];
  /** True when any part of this module leans on provisional fan data. */
  provisional: boolean;
  /** The non-obvious factor headline behind Clark's pick (B5) — makes the
   * homepage itself deliver an observation, not just a crowd/market stat. */
  clarkHeadline: string | null;
}

export function computeStoryModules(games: ApiPrediction[], excludeKey?: string): StoryModule[] {
  const pool = games.filter((g) => gameKey(g) !== excludeKey);
  if (pool.length === 0) return [];

  const used = new Set<string>();
  const modules: StoryModule[] = [];

  // ── Support swinging — biggest weekly move in provisional fan support ──
  const bySwing = pool
    .map((g) => {
      const series = getFanSentimentSeries(g);
      const delta = series.points[series.points.length - 1].pct - series.points[0].pct;
      return { g, series, delta };
    })
    .sort((a, b) => b.delta - a.delta);
  const swing = bySwing.find((x) => !used.has(gameKey(x.g)));
  if (swing && swing.delta > 0.02) {
    const finalPct = Math.round(swing.series.points[swing.series.points.length - 1].pct * 100);
    modules.push({
      id: 'swing',
      kicker: 'Support swinging',
      headline: `${swing.series.team} fans piled in this week — now ${finalPct}% behind them.`,
      accentTeam: swing.series.team,
      game: swing.g,
      statLabel: 'week move',
      statValue: `+${Math.round(swing.delta * 100)} pts`,
      sparkline: swing.series.points,
      provisional: true,
      clarkHeadline: getHeroInsight(swing.g)?.headline ?? null,
    });
    used.add(gameKey(swing.g));
  }

  // ── Boldest public call — most confident fanbase, weighted toward fading Clark ──
  const bold = pool
    .map((g) => ({ g, fan: getFanPick(g), clarkTeam: g.predicted_winner }))
    .filter((x) => !used.has(gameKey(x.g)))
    .sort((a, b) => {
      const av = a.fan.prob + (a.fan.team !== a.clarkTeam ? 0.3 : 0);
      const bv = b.fan.prob + (b.fan.team !== b.clarkTeam ? 0.3 : 0);
      return bv - av;
    })[0];
  if (bold) {
    const against = bold.fan.team !== bold.clarkTeam;
    const fanPct = Math.round(bold.fan.prob * 100);
    modules.push({
      id: 'bold',
      kicker: against ? 'Boldest public call' : 'Loudest consensus',
      headline: against
        ? `${fanPct}% of the public is on ${bold.fan.team} — straight against Clark.`
        : `The public is all-in on ${bold.fan.team} — ${fanPct}% and climbing.`,
      accentTeam: bold.fan.team,
      game: bold.g,
      statLabel: 'fan support',
      statValue: `${fanPct}%`,
      provisional: true,
      clarkHeadline: getHeroInsight(bold.g)?.headline ?? null,
    });
    used.add(gameKey(bold.g));
  }

  // ── Most divided fanbase — fan lean closest to a coin flip ──
  const divided = pool
    .map((g) => ({ g, fan: getFanPick(g) }))
    .filter((x) => !used.has(gameKey(x.g)))
    .sort((a, b) => Math.abs(a.fan.prob - 0.5) - Math.abs(b.fan.prob - 0.5))[0];
  if (divided) {
    modules.push({
      id: 'divided',
      kicker: 'Most divided fanbase',
      headline: `${divided.g.away_team} at ${divided.g.home_team} — the fanbase is split right down the middle.`,
      accentTeam: divided.g.home_team,
      game: divided.g,
      statLabel: 'fan lean',
      statValue: `${Math.round(divided.fan.prob * 100)}%`,
      provisional: true,
      clarkHeadline: getHeroInsight(divided.g)?.headline ?? null,
    });
  }

  return modules;
}
