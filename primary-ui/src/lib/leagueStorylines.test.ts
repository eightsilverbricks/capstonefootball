import { describe, it, expect } from 'vitest';
import { selectStorylines } from './leagueStorylines';
import type { ApiPrediction, FactorCard } from '@/types/prediction';

const card = (overrides: Partial<FactorCard> = {}): FactorCard => ({
  name: 'Defensive Edge',
  advantage_team: 'BUF',
  raw_edge: 0.2,
  contribution_strength: 0.8,
  status: 'DECISIVE',
  confident: true,
  headline: 'BUF bring the pass rush that matters here.',
  explanation: 'They get to the quarterback on 12% of dropbacks. That pressure is what tilts it.',
  ...overrides,
});

const game = (overrides: Partial<ApiPrediction> = {}): ApiPrediction => ({
  game_id: 'ARI-BUF',
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
  factor_cards: [card()],
  risk_factor: 'ARI bring pressure that could stall the drives BUF need.',
  key_battle: 'Defensive Resistance: BUF has the clearest edge over ARI — score 4.1/10.',
  market_note: 'The market also favors BUF via a 6.5-point spread, aligning with the model.',
  ...overrides,
});

describe('selectStorylines', () => {
  it('returns nothing for an empty slate', () => {
    expect(selectStorylines([])).toEqual([]);
  });

  it('leads with the model factor headline for the strongest game', () => {
    const [first] = selectStorylines([game()]);
    expect(first.angle).toBe('read');
    expect(first.headline).toBe('BUF bring the pass rush that matters here.');
  });

  it('rotates the angle so consecutive cards differ', () => {
    const games = ['a', 'b', 'c', 'd'].map((id, i) =>
      game({ game_id: id, home_win_prob: 0.9 - i * 0.1, away_win_prob: 0.1 + i * 0.1 }),
    );
    expect(selectStorylines(games).map((s) => s.angle)).toEqual(['read', 'upset', 'battle', 'market']);
  });

  it('ranks by confidence, strongest first', () => {
    const weak = game({ game_id: 'weak', home_win_prob: 0.52, away_win_prob: 0.48 });
    const strong = game({ game_id: 'strong', home_win_prob: 0.9, away_win_prob: 0.1 });
    expect(selectStorylines([weak, strong]).map((s) => s.game.game_id)).toEqual(['strong', 'weak']);
  });

  it('falls through to another angle when the rotated one has no data', () => {
    const first = game({ game_id: 'a', home_win_prob: 0.9, away_win_prob: 0.1 });
    // Second card would rotate to 'upset', but this game has no risk_factor.
    const second = game({ game_id: 'b', home_win_prob: 0.8, away_win_prob: 0.2, risk_factor: undefined });
    const [, story] = selectStorylines([first, second]);
    expect(story.angle).toBe('battle');
  });

  it('skips games with no usable prose at all', () => {
    const bare = game({
      game_id: 'bare',
      home_win_prob: 0.95,
      away_win_prob: 0.05,
      factor_cards: [],
      risk_factor: undefined,
      key_battle: undefined,
      market_note: undefined,
    });
    const usable = game({ game_id: 'usable', home_win_prob: 0.6, away_win_prob: 0.4 });
    expect(selectStorylines([bare, usable]).map((s) => s.game.game_id)).toEqual(['usable']);
  });

  it('strips the label prefix off key_battle headlines', () => {
    const g = game({ factor_cards: [], risk_factor: undefined, market_note: undefined });
    expect(selectStorylines([g])[0].headline).toBe('Defensive Resistance');
  });

  it('names the market angle by whether Clark and Vegas agree', () => {
    const base = { factor_cards: [], risk_factor: undefined, key_battle: undefined };
    const agrees = game({
      ...base,
      market_context: {
        market_used: true, market_favorite: 'BUF', spread_line: -6.5,
        home_moneyline: -310, away_moneyline: 250, interpretation: '',
      },
    });
    expect(selectStorylines([agrees])[0].headline).toBe('Clark and Vegas agree here');

    const disagrees = game({
      ...base,
      market_context: {
        market_used: true, market_favorite: 'ARI', spread_line: 2.5,
        home_moneyline: 120, away_moneyline: -140, interpretation: '',
      },
    });
    expect(selectStorylines([disagrees])[0].headline).toBe('Clark and Vegas part ways');
  });

  it('truncates long prose on a word boundary', () => {
    const long = 'word '.repeat(80).trim();
    const g = game({ factor_cards: [], risk_factor: long });
    const body = selectStorylines([g])[0].body;
    expect(body.length).toBeLessThanOrEqual(191);
    expect(body.endsWith('…')).toBe(true);
    expect(body).not.toMatch(/wo…$/);
  });

  it('respects the limit', () => {
    const games = ['a', 'b', 'c'].map((id) => game({ game_id: id }));
    expect(selectStorylines(games, 2)).toHaveLength(2);
  });
});
