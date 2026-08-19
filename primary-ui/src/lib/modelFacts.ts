// ─── Model facts — quoted in one place, so the site cannot contradict itself ──
// These mirror nfl-prediction/outputs/metrics.json. They were previously
// inlined at half a dozen call sites, which is how the footer ended up
// advertising a training range the model no longer used and a 71% accuracy it
// only ever hit on one particularly predictable season.

/** Seasons the production model is fitted on. */
export const TRAIN_SEASON_RANGE = '2006–2024';

/** The held-out season the quoted accuracy is measured on. */
export const EVAL_SEASON = 2025;
export const EVAL_GAMES = 285;

/** Held-out accuracy, expanding-week protocol. */
export const MODEL_ACCURACY = 0.656;

/**
 * Accuracy pooled over 2015–2025 (3,025 games), against the Vegas closing line
 * over the same games. The comparison is the honest headline: a single season's
 * accuracy swings from 62% to 71% on luck alone, so "we track the closing line"
 * says far more than any one percentage.
 */
export const POOLED_ACCURACY = 0.6648;
export const POOLED_VEGAS_ACCURACY = 0.6610;
export const POOLED_SEASON_RANGE = '2015–2025';

/** 0.656 → "65.6%". One decimal, because that is how the model is quoted. */
export function formatPct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}
