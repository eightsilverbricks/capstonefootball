import { describe, expect, it } from 'vitest';
import { recordStrip, showcaseGame } from './landingFeed';
import { ApiPrediction, FactorCard } from '@/types/prediction';
import { SentimentMap } from '@/data/sentimentRepository';

const game = (over: Partial<ApiPrediction>): ApiPrediction => ({
  season: 2026, week: 5, week_label: 'Week 5', home_team: 'DAL', away_team: 'TB', predicted_winner: 'DAL',
  home_win_prob: 0.64, away_win_prob: 0.36, confidence_label: 'Medium', confidence_score: 0.6,
  ...over,
} as ApiPrediction);

const factor = (name: string): FactorCard => ({
  name, advantage_team: 'DAL', raw_edge: 1, contribution_strength: 1, status: 'DECISIVE', headline: 'Dallas rushes the passer', confident: true,
} as FactorCard);

describe('showcaseGame', () => {
  it("prefers this week's upcoming game with a strong lead factor", () => {
    const plain = game({ home_team: 'NE', confidence_score: 0.9 });
    const strong = game({ factor_cards: [factor('Defensive Edge')] });
    expect(showcaseGame([plain, strong], [plain, strong])?.home_team).toBe('DAL');
  });

  it("falls back to the week's most confident pick", () => {
    const a = game({ home_team: 'NE', confidence_score: 0.9 });
    const b = game({ confidence_score: 0.2 });
    expect(showcaseGame([a, b], [a, b])?.home_team).toBe('NE');
  });

  it('returns null with no games', () => {
    expect(showcaseGame([], [])).toBeNull();
  });
});

describe('recordStrip', () => {
  it('reports record, rate, and fan picks, and skips the line stat with no contrarian games', () => {
    const won = game({ actual_winner: 'DAL', home_score: 20, away_score: 10 });
    const lost = game({ home_team: 'NE', predicted_winner: 'NE', actual_winner: 'TB', home_score: 3, away_score: 9 });
    const upcoming = game({ home_team: 'KC' });
    const sentiment = { '2026_5_TB_KC': { total: 1200, byTeam: {} } } as unknown as SentimentMap;
    const stats = recordStrip([won, lost, upcoming], [upcoming], sentiment);
    expect(stats.map((s) => s.value)).toEqual(['1–1', '50%', '1,200']);
  });

  it('is empty before any game is graded or picked', () => {
    expect(recordStrip([game({})], [game({})], {})).toEqual([]);
  });
});
