import { describe, it, expect } from 'vitest';
import { isFinal, finalScore, isPickingClosed } from './gameStatus';
import { ApiPrediction } from '@/types/prediction';
import { DEMO_SEASON, LIVE_SEASON } from '@/lib/season';

function game(partial: Partial<ApiPrediction> = {}): ApiPrediction {
  return {
    season: LIVE_SEASON,
    week: 1,
    week_label: 'Week 1',
    home_team: 'LAC',
    away_team: 'ARI',
    predicted_winner: 'LAC',
    home_win_prob: 0.79,
    away_win_prob: 0.21,
    confidence_label: 'High',
    confidence_score: 57.5,
    ...partial,
  } as ApiPrediction;
}

describe('isFinal', () => {
  it('is false while the game has no scores', () => {
    expect(isFinal(game())).toBe(false);
  });

  it('is true once both scores are present', () => {
    expect(isFinal(game({ home_score: 14, away_score: 26 }))).toBe(true);
  });

  it('treats a tie as final even though it has no winner', () => {
    expect(isFinal(game({ home_score: 17, away_score: 17, actual_winner: null }))).toBe(true);
  });

  it('is false on a zero-zero-looking half record', () => {
    expect(isFinal(game({ home_score: 0 }))).toBe(false);
  });
});

describe('finalScore', () => {
  it('reads away then home', () => {
    expect(finalScore(game({ home_score: 14, away_score: 26 }))).toBe('ARI 26 — LAC 14');
  });

  it('is null before kickoff', () => {
    expect(finalScore(game())).toBeNull();
  });
});

describe('isPickingClosed', () => {
  it('closes a played live-season game', () => {
    expect(isPickingClosed(game({ home_score: 14, away_score: 26 }))).toBe(true);
  });

  it('leaves an unplayed live-season game open', () => {
    expect(isPickingClosed(game())).toBe(false);
  });

  it('closes at the scheduled kickoff', () => {
    const g = game({ kickoff_at: '2026-10-18T17:00:00Z' });
    expect(isPickingClosed(g, new Date('2026-10-18T16:59:00Z'))).toBe(false);
    expect(isPickingClosed(g, new Date('2026-10-18T17:00:00Z'))).toBe(true);
  });

  it('closes as soon as live-sync sees the game start', () => {
    const g = { ...game({ kickoff_at: '2026-10-18T17:00:00Z' }), live: { status: 'in' } } as ApiPrediction;
    expect(isPickingClosed(g, new Date('2026-10-18T16:55:00Z'))).toBe(true);
  });

  it('leaves the demo season open so its picks can still be made', () => {
    expect(
      isPickingClosed(game({ season: DEMO_SEASON, home_score: 34, away_score: 28 })),
    ).toBe(false);
  });
});
