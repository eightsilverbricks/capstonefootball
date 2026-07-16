// ─── pickReading — a personalized read of the user's locked pick ──────────────
// Pure helper. Given the user's pick and the three other signals (Clark, Vegas,
// Fans), produce one short editorial sentence describing where the user stands:
// with the consensus, siding with Clark, fading Vegas, or a bold minority call.
// No numbers — the ThreeWayCompare bars already carry those. Fan data is
// PROVISIONAL (see threeWaySignal.ts); this only reads its direction.

import { ApiPrediction } from '@/types/prediction';
import { TeamPick } from '@/lib/threeWaySignal';

export interface UserSide {
  team: string;
  confidence: number; // 0.5–1.0
}

/**
 * A qualitative interpretation of the user's pick relative to Clark, Vegas, and
 * the fans. Precedence runs from boldest (against everyone) to safest
 * (full consensus) so the most screenshot-worthy read wins.
 */
export function getPickReading(
  game: ApiPrediction,
  pick: UserSide,
  vegas: TeamPick | null,
  fan: TeamPick,
): string {
  const userTeam = pick.team;
  const clarkTeam = game.predicted_winner;

  const withClark = userTeam === clarkTeam;
  const withFans = userTeam === fan.team;
  // null when there's no market line for this game.
  const withVegas = vegas ? userTeam === vegas.team : null;
  const againstVegas = withVegas === false;

  const bold = pick.confidence >= 0.85;

  // 1. Alone against all three signals.
  if (!withClark && !withFans && againstVegas) {
    return bold
      ? `Full conviction on ${userTeam} — and you're the only one. Clark, Vegas, and the fans all disagree.`
      : `You're on an island: Clark, Vegas, and the fans are all off ${userTeam}.`;
  }

  // 2. Riding the crowd, but breaking from both Clark and Vegas.
  if (!withClark && withFans && againstVegas) {
    return `You're with the fans on ${userTeam} — against both Clark and Vegas.`;
  }

  // 3. Broke from Clark to side with the fans.
  if (!withClark && withFans) {
    return `You broke from Clark and sided with ${userTeam} fans.`;
  }

  // 4. Broke from Clark, and the fans aren't with you either — pure contrarian.
  if (!withClark && !withFans) {
    return `A contrarian call on ${userTeam} — Clark and the fans are both elsewhere.`;
  }

  // From here on the user agrees with Clark.

  // 5. With Clark, fading the market.
  if (againstVegas) {
    return `You and Clark are fading Vegas on ${userTeam}.`;
  }

  // 6. With Clark, but the fans lean the other way — a quiet minority call.
  if (!withFans) {
    return `A minority call — the fans lean away, but Clark's on ${userTeam} with you.`;
  }

  // 7. Everyone's together.
  return bold
    ? `Locked in on ${userTeam} — and Clark, Vegas, and the fans are right there with you.`
    : `You're with the consensus on ${userTeam}.`;
}
