// ─── Season configuration — one source of truth for which dataset is live ─────
// The site serves two datasets. The live season is the one being played; it has
// no outcomes until games are actually played, so records and streaks stay
// empty. Demo mode swaps in a completed season where every pick resolves, which
// is the only way a visitor can see the season surfaces do anything before
// kickoff.

export const LIVE_SEASON = 2026;
export const DEMO_SEASON = 2024;

/** First kickoff of the live season, used for the pre-season state. */
export const LIVE_SEASON_KICKOFF = new Date('2026-09-09T00:00:00Z');

export type SeasonMode = 'live' | 'demo';

export interface SeasonConfig {
  mode: SeasonMode;
  season: number;
  /** Where usePredictions should fetch this dataset from. */
  dataUrl: string;
  /** True when picks made here must not count toward a real record. */
  isDemo: boolean;
}

const LIVE: SeasonConfig = {
  mode: 'live',
  season: LIVE_SEASON,
  dataUrl: '/predictions.json',
  isDemo: false,
};

const DEMO: SeasonConfig = {
  mode: 'demo',
  season: DEMO_SEASON,
  dataUrl: `/predictions-${DEMO_SEASON}.json`,
  isDemo: true,
};

export function seasonConfig(mode: SeasonMode): SeasonConfig {
  return mode === 'demo' ? DEMO : LIVE;
}

/** True before the live season's first game has kicked off. */
export function isPreSeason(now: Date = new Date()): boolean {
  return now < LIVE_SEASON_KICKOFF;
}

/** Whole days until the live season starts; 0 once it has. */
export function daysUntilKickoff(now: Date = new Date()): number {
  const ms = LIVE_SEASON_KICKOFF.getTime() - now.getTime();
  return ms <= 0 ? 0 : Math.ceil(ms / 86_400_000);
}
