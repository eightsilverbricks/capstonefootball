// ─── shareCard — text helpers for the per-pick "I called this" artifact ───────
// Pure. Builds the one narrative line that travels off-platform with the
// share card: the contrarian/consensus framing plus the resolved outcome,
// modeled on the plan's example: "I backed ARI at 85% when Vegas didn't —
// cashed +35."

import { Pick } from '@/competition/types';
import { TeamPick } from '@/lib/threeWaySignal';
import { signed } from '@/lib/format';

/**
 * The share card's headline sentence. Degrades gracefully across three
 * states: no market line, unresolved pick, and resolved win/loss.
 */
export function getShareLine(
  pick: Pick,
  vegas: TeamPick | null,
  resolvedNet: number | null,
): string {
  const pct = Math.round(pick.confidence * 100);
  const contrarian = vegas != null && vegas.team !== pick.team;
  const marketClause = contrarian ? " when Vegas didn't" : '';

  if (resolvedNet == null) {
    return `I'm on ${pick.team} at ${pct}%${marketClause}.`;
  }
  if (resolvedNet > 0) {
    return `I backed ${pick.team} at ${pct}%${marketClause} — cashed ${signed(resolvedNet)}.`;
  }
  if (resolvedNet < 0) {
    return `I backed ${pick.team} at ${pct}%${marketClause} — missed ${Math.abs(Math.round(resolvedNet))}.`;
  }
  return `I backed ${pick.team} at ${pct}%${marketClause} — pushed, no credits moved.`;
}
