// ─── gameStatus — has this game been played, and can it still be picked? ──────
// One source of truth for the two questions every game surface now asks. A
// game is final when the feed carries both scores (a tie is final too, even
// though it has no winner), and a played game in the live season is closed to
// picking — you can't call a result you already know.
//
// The demo season is deliberately exempt. Its whole purpose is to let a
// visitor make picks on a completed season and watch them resolve, so its
// games stay pickable even though every one of them is final.

import { ApiPrediction } from '@/types/prediction';
import { DEMO_SEASON } from '@/lib/season';

/** True once the game has a final score. */
export function isFinal(game: ApiPrediction): boolean {
  return game.home_score != null && game.away_score != null;
}

/** "ARI 26 — LAC 14", or null while the game is unplayed. */
export function finalScore(game: ApiPrediction): string | null {
  if (!isFinal(game)) return null;
  return `${game.away_team} ${game.away_score} — ${game.home_team} ${game.home_score}`;
}

/** True when the game has been played and no new pick may be made on it. */
export function isPickingClosed(game: ApiPrediction): boolean {
  return game.season !== DEMO_SEASON && isFinal(game);
}
