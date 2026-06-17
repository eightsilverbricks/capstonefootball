// ─── The Clark Competition — scoring logic ────────────────────────────────────
// This is the trust mechanism of the whole feature. Keep it pure, tested, and
// exactly matching the published formulas.
//
//   stake (magnitude) = 50 * (2 * confidence - 1)     // confidence ∈ [0.5, 1.0]
//   resolve: backed team wins → +stake; loses → −stake; confidence 0.5 → 0
//   weekly net  = Σ resolved stakes across the week
//   Clark Score = cumulative Σ weekly nets across the season
//   Clark Diff  = entity Clark Score − Index Clark Score

import { CompetitionGame, EntityKind, Pick } from './types';

/** Per-game credit cap. Each entity has an independent 50-credit cap per game. */
export const GAME_CREDIT_CAP = 50;

/** Confidence slider bounds (decimal). */
export const MIN_CONFIDENCE = 0.5;
export const MAX_CONFIDENCE = 1.0;

/**
 * Stake magnitude from confidence. Always ≥ 0 and ≤ GAME_CREDIT_CAP.
 * At 0.5 confidence → 0 (no position). At 1.0 → 50.
 */
export function stakeFromConfidence(confidence: number): number {
  const clamped = Math.min(MAX_CONFIDENCE, Math.max(MIN_CONFIDENCE, confidence));
  const raw = GAME_CREDIT_CAP * (2 * clamped - 1);
  // Strip IEEE-754 drift so resolved sums stay exact (slider steps in whole
  // percent, where the formula yields integer credits).
  return Math.round(raw * 1e6) / 1e6;
}

/**
 * Resolve one pick against the actual winner.
 * Returns the signed credits: +stake if the backed team won, −stake if it lost,
 * and exactly 0 when confidence was 50% (no position taken), regardless of outcome.
 */
export function resolvePick(pick: Pick, actualWinner: string | null): number {
  const stake = stakeFromConfidence(pick.confidence);
  if (stake === 0 || !actualWinner) return 0;
  return pick.team === actualWinner ? stake : -stake;
}

/** Select an entity's pick off a game row. */
export function pickForEntity(game: CompetitionGame, entity: EntityKind): Pick {
  return entity === 'you' ? game.you : entity === 'crowd' ? game.crowd : game.index;
}

/** Sum of one entity's resolved stakes across a set of (resolved) games. */
export function weeklyNet(games: CompetitionGame[], entity: EntityKind): number {
  return games.reduce((sum, g) => {
    if (!g.resolved) return sum;
    return sum + resolvePick(pickForEntity(g, entity), g.actualWinner);
  }, 0);
}

/**
 * Cumulative Clark Score for an entity across all resolved games in the season.
 * (Equivalent to summing weekly nets, since weekly net is itself a sum.)
 */
export function clarkScore(games: CompetitionGame[], entity: EntityKind): number {
  return weeklyNet(games, entity);
}

/** Clark Differential = entity Clark Score − Index Clark Score. */
export function clarkDifferential(games: CompetitionGame[], entity: EntityKind): number {
  return clarkScore(games, entity) - clarkScore(games, 'index');
}

/** The single largest correct (positive) stake an entity has resolved this season. */
export function biggestCorrectStake(games: CompetitionGame[], entity: EntityKind): number {
  let best = 0;
  for (const g of games) {
    if (!g.resolved) continue;
    const v = resolvePick(pickForEntity(g, entity), g.actualWinner);
    if (v > best) best = v;
  }
  return best;
}

/** Total credits an entity has at risk across a set of (any) games for a week. */
export function creditsAtRisk(games: CompetitionGame[], entity: EntityKind): number {
  return games.reduce((sum, g) => sum + stakeFromConfidence(pickForEntity(g, entity).confidence), 0);
}

/** Mean confidence across submissions — used to derive a crowd position. */
export function meanConfidence(confidences: number[]): number {
  if (confidences.length === 0) return MIN_CONFIDENCE;
  const sum = confidences.reduce((a, b) => a + b, 0);
  return sum / confidences.length;
}

/**
 * Map the Index's existing `confidence_score` (a 0–100 edge magnitude in
 * predictions.json) into slider-space confidence (0.5–1.0). This reuses the
 * model's own published signal rather than inventing a new value:
 *   confidence = 0.5 + score / 200   (a 19.4 score → ~0.60, matching win prob)
 */
export function indexConfidenceFromScore(confidenceScore: number): number {
  return Math.min(MAX_CONFIDENCE, Math.max(MIN_CONFIDENCE, 0.5 + confidenceScore / 200));
}

/** A human stake preview string, e.g. "+50 if BUF wins" / "−35 if CIN wins". */
export function stakePreview(pick: Pick): string {
  const stake = Math.round(stakeFromConfidence(pick.confidence));
  if (stake === 0) return 'No position — 50/50';
  return `+${stake} if ${pick.team} wins · −${stake} if not`;
}
