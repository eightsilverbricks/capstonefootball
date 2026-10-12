import { describe, expect, it } from 'vitest';
import { resultsPayload, toLeaderRow } from './leaderboardRepository';
import { ApiPrediction } from '@/types/prediction';

const game = (over: Partial<ApiPrediction>): ApiPrediction => ({
  season: 2026, week: 5, week_label: 'Week 5', home_team: 'DAL', away_team: 'TB', predicted_winner: 'DAL',
  home_win_prob: 0.64, away_win_prob: 0.36, confidence_label: 'Medium', confidence_score: 0.6,
  ...over,
} as ApiPrediction);

describe('resultsPayload', () => {
  it('sends only graded games, keyed like picks', () => {
    const graded = game({ actual_winner: 'TB', home_score: 10, away_score: 20 });
    const open = game({ home_team: 'KC' });
    expect(resultsPayload([graded, open])).toEqual({ '2026_5_TB_DAL': { winner: 'TB', clark: 'DAL', week: 5 } });
  });
});

describe('toLeaderRow', () => {
  it('turns stake units into points and parses numeric strings', () => {
    const row = toLeaderRow({
      user_id: 'u', handle: 'zane', display_name: 'Zane', favorite_team: 'BUF', wins: 3, losses: 1,
      stake_units: '1.400', clark_wins: 2, clark_losses: 2, board_rank: 1, board_size: 9,
    });
    expect(row.points).toBe(70);
    expect(row.rank).toBe(1);
  });
});
