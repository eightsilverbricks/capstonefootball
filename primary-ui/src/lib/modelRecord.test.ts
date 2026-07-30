import { describe, it, expect } from 'vitest';
import { computeModelRecord, formatAccuracy } from './modelRecord';
import type { ApiPrediction } from '@/types/prediction';

const game = (overrides: Partial<ApiPrediction>): ApiPrediction => ({
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
  actual_winner: 'BUF',
  ...overrides,
});

describe('computeModelRecord', () => {
  it('returns an all-zero record for an empty slate', () => {
    const record = computeModelRecord([]);
    expect(record).toMatchObject({ played: 0, correct: 0, accuracy: 0, bestWeek: null });
  });

  it('counts only games with a real outcome', () => {
    const record = computeModelRecord([
      game({ actual_winner: 'BUF' }),
      game({ actual_winner: 'ARI' }),
      game({ actual_winner: null }), // tie or unplayed
      game({ actual_winner: undefined }),
    ]);
    expect(record.played).toBe(2);
    expect(record.correct).toBe(1);
    expect(record.accuracy).toBeCloseTo(0.5);
  });

  it('splits accuracy by confidence label', () => {
    const record = computeModelRecord([
      game({ confidence_label: 'High', actual_winner: 'BUF' }),
      game({ confidence_label: 'High', actual_winner: 'BUF' }),
      game({ confidence_label: 'Low', actual_winner: 'ARI' }),
    ]);

    const high = record.buckets.find((b) => b.label === 'High');
    const low = record.buckets.find((b) => b.label === 'Low');
    const medium = record.buckets.find((b) => b.label === 'Medium');

    expect(high).toMatchObject({ played: 2, correct: 2, accuracy: 1 });
    expect(low).toMatchObject({ played: 1, correct: 0, accuracy: 0 });
    // Empty buckets are still reported, at zero rather than NaN.
    expect(medium).toMatchObject({ played: 0, correct: 0, accuracy: 0 });
  });

  it('picks the best week by hit rate', () => {
    const record = computeModelRecord([
      game({ week: 1, actual_winner: 'BUF' }),
      game({ week: 1, actual_winner: 'ARI' }),
      game({ week: 2, actual_winner: 'BUF' }),
      game({ week: 2, actual_winner: 'BUF' }),
    ]);
    expect(record.bestWeek).toMatchObject({ week: 2, correct: 2, played: 2 });
  });

  it('breaks a hit-rate tie on volume, not week order', () => {
    const record = computeModelRecord([
      game({ week: 5, actual_winner: 'BUF' }),
      game({ week: 9, actual_winner: 'BUF' }),
      game({ week: 9, actual_winner: 'BUF' }),
    ]);
    expect(record.bestWeek?.week).toBe(9);
  });
});

describe('formatAccuracy', () => {
  it('renders one decimal place', () => {
    expect(formatAccuracy(0.7122)).toBe('71.2%');
    expect(formatAccuracy(1)).toBe('100.0%');
    expect(formatAccuracy(0)).toBe('0.0%');
  });
});
