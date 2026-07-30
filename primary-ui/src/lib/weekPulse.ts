// ─── weekPulse — the homepage's "what's interesting this week" widgets ────────
// Pure selectors over the current week's games. Every widget is a real read of
// the data, never a fabricated storyline: the lock is genuinely Clark's most
// confident game, the coin flip is genuinely the closest, and the contrarian
// slot only appears when Clark actually disagrees with the market.
//
// Selection is greedy and de-duplicated by game, so four widgets means four
// different matchups.

import { ApiPrediction, getConfidenceScore, getPredictedProbability } from '@/types/prediction';
import { gameKey } from '@/lib/threeWaySignal';

export type PulseKind = 'lock' | 'contrarian' | 'weather' | 'coinFlip' | 'roadPick';

export interface PulseItem {
  kind: PulseKind;
  /** Widget title — the label above the number. */
  label: string;
  /** The headline figure. */
  value: string;
  /** One sentence of context, drawn from the game's own data. */
  detail: string;
  game: ApiPrediction;
  /** Token name for the widget's accent color. */
  accent: string;
}

const WIND_THRESHOLD_MPH = 15;

function matchupLabel(game: ApiPrediction): string {
  return `${game.away_team} at ${game.home_team}`;
}

function winnerPct(game: ApiPrediction): number {
  return Math.round(getPredictedProbability(game) * 100);
}

/** Highest-confidence game — Clark's firmest read of the slate. */
function selectLock(games: ApiPrediction[]): PulseItem | null {
  const game = [...games].sort((a, b) => getConfidenceScore(b) - getConfidenceScore(a))[0];
  if (!game) return null;
  return {
    kind: 'lock',
    label: "Clark's strongest read",
    value: `${game.predicted_winner} ${winnerPct(game)}%`,
    detail: `${matchupLabel(game)} — the widest edge on the board this week.`,
    game,
    accent: 'var(--accent-gold)',
  };
}

/** Clark taking a side the betting market has as the underdog. Rare and loud. */
function selectContrarian(games: ApiPrediction[]): PulseItem | null {
  const disagreements = games.filter((g) => {
    const favorite = g.market_context?.market_favorite;
    return Boolean(favorite) && favorite !== g.predicted_winner;
  });
  const game = disagreements.sort((a, b) => getConfidenceScore(b) - getConfidenceScore(a))[0];
  if (!game) return null;
  return {
    kind: 'contrarian',
    label: 'Off the market',
    value: game.predicted_winner,
    detail: `Vegas has ${game.market_context?.market_favorite}. Clark has ${game.predicted_winner} at ${winnerPct(game)}% in ${matchupLabel(game)}.`,
    game,
    accent: 'var(--stake-negative)',
  };
}

/** The game the elements are most likely to decide. */
function selectWeather(games: ApiPrediction[]): PulseItem | null {
  const notable = games.filter((g) => g.weather?.is_notable && g.weather.is_outdoor !== false);
  const game = notable.sort((a, b) => (b.weather?.wind ?? 0) - (a.weather?.wind ?? 0))[0];
  if (!game?.weather) return null;

  const { wind, temp, summary } = game.weather;
  const value =
    wind != null && wind >= WIND_THRESHOLD_MPH ? `${Math.round(wind)} mph` : temp != null ? `${Math.round(temp)}°F` : 'Notable';

  return {
    kind: 'weather',
    label: 'Weather to watch',
    value,
    detail: summary ? `${matchupLabel(game)} — ${summary}.` : `Conditions are a factor in ${matchupLabel(game)}.`,
    game,
    accent: 'var(--status-moderate)',
  };
}

/** Closest game on the board — where Clark is least sure. */
function selectCoinFlip(games: ApiPrediction[]): PulseItem | null {
  const game = [...games].sort((a, b) => getConfidenceScore(a) - getConfidenceScore(b))[0];
  if (!game) return null;
  return {
    kind: 'coinFlip',
    label: 'Closest call',
    value: `${winnerPct(game)}%`,
    detail: `${matchupLabel(game)} is the nearest thing to a coin flip Clark sees this week.`,
    game,
    accent: 'var(--status-minor)',
  };
}

/** Most confident road pick — home field is the hardest thing to bet against. */
function selectRoadPick(games: ApiPrediction[]): PulseItem | null {
  const roadPicks = games.filter((g) => g.predicted_winner === g.away_team);
  const game = roadPicks.sort((a, b) => getConfidenceScore(b) - getConfidenceScore(a))[0];
  if (!game) return null;
  return {
    kind: 'roadPick',
    label: 'Best road bet',
    value: `${game.away_team} ${winnerPct(game)}%`,
    detail: `Clark takes ${game.away_team} on the road at ${game.home_team}.`,
    game,
    accent: 'var(--status-decisive)',
  };
}

// Order matters twice over: it's both the selection priority (earlier selectors
// claim their game first) and the reading order in the grid.
const SELECTORS = [selectLock, selectContrarian, selectWeather, selectCoinFlip, selectRoadPick];

/**
 * Up to `limit` widgets for the current week, each about a different game.
 * Returns fewer than `limit` when the slate is small or the data is thin —
 * callers should render whatever comes back rather than padding it out.
 */
export function selectWeekPulse(games: ApiPrediction[], limit = 4): PulseItem[] {
  if (games.length === 0) return [];

  const used = new Set<string>();
  const items: PulseItem[] = [];

  for (const select of SELECTORS) {
    if (items.length >= limit) break;
    const candidates = games.filter((g) => !used.has(gameKey(g)));
    const item = select(candidates);
    if (!item) continue;
    used.add(gameKey(item.game));
    items.push(item);
  }

  return items;
}
