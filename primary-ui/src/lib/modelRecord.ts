// ─── modelRecord — Clark's live scoreboard, computed from the data itself ─────
// The homepage and landing page both claim an accuracy number. Rather than
// hardcode one (nflData.modelAccuracy is a static snapshot), derive it from the
// same predictions.json everything else reads, so the claim can never drift out
// of step with the shipped dataset.
//
// Only games with a real outcome count. Unplayed games and ties (actual_winner
// null) are excluded from both numerator and denominator.

import { ApiPrediction } from '@/types/prediction';

export type ConfidenceLabel = 'High' | 'Medium' | 'Low';

export interface ConfidenceBucket {
  label: ConfidenceLabel;
  played: number;
  correct: number;
  /** 0–1. Zero when nothing in the bucket has resolved. */
  accuracy: number;
}

export interface ModelRecord {
  played: number;
  correct: number;
  /** 0–1. Zero when nothing has resolved. */
  accuracy: number;
  buckets: ConfidenceBucket[];
  /** The week Clark read best, by hit rate then by volume. Null with no data. */
  bestWeek: { week: number; correct: number; played: number; accuracy: number } | null;
}

const LABELS: ConfidenceLabel[] = ['High', 'Medium', 'Low'];

function isResolved(game: ApiPrediction): boolean {
  return game.actual_winner != null && game.actual_winner !== '';
}

function wasCorrect(game: ApiPrediction): boolean {
  return game.predicted_winner === game.actual_winner;
}

function rate(correct: number, played: number): number {
  return played === 0 ? 0 : correct / played;
}

export function computeModelRecord(games: ApiPrediction[]): ModelRecord {
  const resolved = games.filter(isResolved);
  const correct = resolved.filter(wasCorrect).length;

  const buckets = LABELS.map<ConfidenceBucket>((label) => {
    const inBucket = resolved.filter((g) => g.confidence_label === label);
    const hits = inBucket.filter(wasCorrect).length;
    return { label, played: inBucket.length, correct: hits, accuracy: rate(hits, inBucket.length) };
  });

  const byWeek = new Map<number, { correct: number; played: number }>();
  for (const game of resolved) {
    const row = byWeek.get(game.week) ?? { correct: 0, played: 0 };
    byWeek.set(game.week, {
      correct: row.correct + (wasCorrect(game) ? 1 : 0),
      played: row.played + 1,
    });
  }

  let bestWeek: ModelRecord['bestWeek'] = null;
  for (const [week, row] of byWeek) {
    const accuracy = rate(row.correct, row.played);
    const better =
      !bestWeek ||
      accuracy > bestWeek.accuracy ||
      // Tie-break on volume so a lucky 1-for-1 week never beats a 14-for-16 one.
      (accuracy === bestWeek.accuracy && row.played > bestWeek.played);
    if (better) bestWeek = { week, correct: row.correct, played: row.played, accuracy };
  }

  return { played: resolved.length, correct, accuracy: rate(correct, resolved.length), buckets, bestWeek };
}

/** 0.712 → "71.2%". One decimal, because that's how the model is quoted. */
export function formatAccuracy(accuracy: number): string {
  return `${(accuracy * 100).toFixed(1)}%`;
}
