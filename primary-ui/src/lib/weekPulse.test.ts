import { describe, it, expect } from 'vitest';
import { selectWeekPulse } from './weekPulse';
import type { ApiPrediction } from '@/types/prediction';

const game = (overrides: Partial<ApiPrediction>): ApiPrediction => ({
  game_id: `${overrides.away_team ?? 'ARI'}-${overrides.home_team ?? 'BUF'}`,
  season: 2024,
  week: 1,
  week_label: 'Week 1',
  home_team: 'BUF',
  away_team: 'ARI',
  predicted_winner: 'BUF',
  home_win_prob: 0.7,
  away_win_prob: 0.3,
  confidence_label: 'High',
  confidence_score: 40,
  ...overrides,
});

const lopsided = game({ game_id: 'g-lock', home_win_prob: 0.92, away_win_prob: 0.08 });
const close = game({
  game_id: 'g-close',
  home_team: 'NYJ',
  away_team: 'MIA',
  predicted_winner: 'NYJ',
  home_win_prob: 0.51,
  away_win_prob: 0.49,
});
const windy = game({
  game_id: 'g-wind',
  home_team: 'CHI',
  away_team: 'GB',
  predicted_winner: 'CHI',
  home_win_prob: 0.6,
  away_win_prob: 0.4,
  weather: { wind: 24, temp: 38, is_notable: true, is_outdoor: true, summary: '38°F · 24 mph wind (high)' },
});

describe('selectWeekPulse', () => {
  it('returns nothing for an empty slate', () => {
    expect(selectWeekPulse([])).toEqual([]);
  });

  it('leads with the highest-confidence game as the lock', () => {
    const [first] = selectWeekPulse([close, lopsided, windy]);
    expect(first.kind).toBe('lock');
    expect(first.game.game_id).toBe('g-lock');
    expect(first.value).toBe('BUF 92%');
  });

  it('surfaces the closest game as the coin flip', () => {
    const coinFlip = selectWeekPulse([close, lopsided, windy]).find((i) => i.kind === 'coinFlip');
    expect(coinFlip?.game.game_id).toBe('g-close');
    expect(coinFlip?.value).toBe('51%');
  });

  it('surfaces notable outdoor weather with the windiest game', () => {
    const weather = selectWeekPulse([close, lopsided, windy]).find((i) => i.kind === 'weather');
    expect(weather?.game.game_id).toBe('g-wind');
    expect(weather?.value).toBe('24 mph');
  });

  it('ignores weather that is not flagged notable', () => {
    const mild = game({
      game_id: 'g-mild',
      weather: { wind: 4, temp: 70, is_notable: false, is_outdoor: true },
    });
    const kinds = selectWeekPulse([mild, close]).map((i) => i.kind);
    expect(kinds).not.toContain('weather');
  });

  it('only reports a contrarian pick when Clark actually fades the market', () => {
    const agrees = game({
      game_id: 'g-agree',
      market_context: {
        market_used: true,
        market_favorite: 'BUF',
        spread_line: -6.5,
        home_moneyline: -310,
        away_moneyline: 250,
        interpretation: '',
      },
    });
    expect(selectWeekPulse([agrees, close]).map((i) => i.kind)).not.toContain('contrarian');

    // Real market fades are always near-coin-flips (in the 2024 set, all 8 sit
    // at ≤0.071 confidence against weekly maxima of 0.24–0.34), so the fade is
    // never also the week's lock.
    const fades = game({
      game_id: 'g-fade',
      home_team: 'DAL',
      away_team: 'PHI',
      predicted_winner: 'PHI',
      home_win_prob: 0.47,
      away_win_prob: 0.53,
      market_context: {
        market_used: true,
        market_favorite: 'DAL',
        spread_line: -3,
        home_moneyline: -160,
        away_moneyline: 140,
        interpretation: '',
      },
    });
    const contrarian = selectWeekPulse([lopsided, fades, close]).find((i) => i.kind === 'contrarian');
    expect(contrarian?.game.game_id).toBe('g-fade');
    expect(contrarian?.detail).toContain('Vegas has DAL');
  });

  it('gives the lock priority when one game qualifies for two widgets', () => {
    // Dedupe runs in selector order, so the higher-priority widget keeps the
    // game and the lower-priority one moves to its next-best candidate.
    const fadeAndLock = game({
      game_id: 'g-both',
      home_win_prob: 0.95,
      away_win_prob: 0.05,
      market_context: {
        market_used: true, market_favorite: 'ARI', spread_line: 3,
        home_moneyline: 140, away_moneyline: -160, interpretation: '',
      },
    });
    const items = selectWeekPulse([fadeAndLock, close]);
    expect(items.find((i) => i.kind === 'lock')?.game.game_id).toBe('g-both');
    expect(items.map((i) => i.kind)).not.toContain('contrarian');
  });

  it('never shows the same game in two widgets', () => {
    const items = selectWeekPulse([lopsided, close, windy]);
    const ids = items.map((i) => i.game.game_id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('degrades gracefully on a one-game slate', () => {
    const items = selectWeekPulse([lopsided]);
    expect(items).toHaveLength(1);
    expect(items[0].kind).toBe('lock');
  });

  it('respects the limit', () => {
    expect(selectWeekPulse([lopsided, close, windy], 2)).toHaveLength(2);
  });

  it('falls back to a road pick when richer angles are exhausted', () => {
    const road = game({
      game_id: 'g-road',
      home_team: 'NE',
      away_team: 'KC',
      predicted_winner: 'KC',
      home_win_prob: 0.25,
      away_win_prob: 0.75,
    });
    const kinds = selectWeekPulse([lopsided, close, road]).map((i) => i.kind);
    expect(kinds).toContain('roadPick');
  });
});
