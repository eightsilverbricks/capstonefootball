// ─── pickReading — a personalized read of the user's locked pick ──────────────
// Pure helper. Given the user's pick and the three other signals (Clark, Vegas,
// Fans), produce one short editorial sentence describing where the user stands:
// with the consensus, siding with Clark, fading Vegas, or a bold minority call.
// No numbers — the ThreeWayCompare bars already carry those. Both the market and
// the fan signal are optional: a game can have no line and no community picks
// yet, and the reading simply drops whichever voice is missing.

import { ApiPrediction } from '@/types/prediction';
import { FanPick, TeamPick } from '@/lib/threeWaySignal';

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
  fan: FanPick | null,
): string {
  const userTeam = pick.team;
  const clarkTeam = game.predicted_winner;

  const withClark = userTeam === clarkTeam;
  // Both null when that voice has nothing to say about this game: no market
  // line, or no community picks yet.
  const withVegas = vegas ? userTeam === vegas.team : null;
  const withFans = fan ? userTeam === fan.team : null;
  const againstVegas = withVegas === false;
  const againstFans = withFans === false;

  const bold = pick.confidence >= 0.85;

  // 1. Alone against all three signals.
  if (!withClark && againstFans && againstVegas) {
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
  if (!withClark && againstFans) {
    return `A contrarian call on ${userTeam} — Clark and the fans are both elsewhere.`;
  }

  // 5. Broke from Clark with no community read to place you against.
  if (!withClark) {
    return againstVegas
      ? `You're off both Clark and Vegas on ${userTeam}. Nobody else has weighed in yet.`
      : `You broke from Clark on ${userTeam} — the first call on this game.`;
  }

  // From here on the user agrees with Clark.

  // 6. With Clark, fading the market.
  if (againstVegas) {
    return `You and Clark are fading Vegas on ${userTeam}.`;
  }

  // 7. With Clark, but the fans lean the other way — a quiet minority call.
  if (againstFans) {
    return `A minority call — the fans lean away, but Clark's on ${userTeam} with you.`;
  }

  // 8. With Clark, and no community read yet to agree or disagree.
  if (withFans === null) {
    return bold
      ? `Locked in on ${userTeam} with Clark — and you're first on the board.`
      : `You're with Clark on ${userTeam}. No one else has picked this one yet.`;
  }

  // 9. Everyone's together.
  return bold
    ? `Locked in on ${userTeam} — and Clark, Vegas, and the fans are right there with you.`
    : `You're with the consensus on ${userTeam}.`;
}
