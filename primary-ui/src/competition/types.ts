// ─── The Clark Competition — shared types ─────────────────────────────────────
// Mode where users wager confidence against the model and the crowd.
// Leaderboard/league/challenge shapes used to live here to describe fabricated
// users; the real ones now come off Supabase — see data/challengesRepository.ts
// and data/sentimentRepository.ts.

export type EntityKind = 'you' | 'crowd' | 'index';

/** A single confidence position: which team is backed, and how strongly (0.5–1.0). */
export interface Pick {
  /** Team abbreviation this entity is backing. */
  team: string;
  /** Confidence as a decimal, 0.5 (no position) … 1.0 (max). */
  confidence: number;
}

/** One game in the competition slate, with each entity's position + the result. */
export interface CompetitionGame {
  gameId: string;
  season: number;
  week: number;
  weekLabel: string;
  awayTeam: string;
  homeTeam: string;
  /** Winner abbreviation once the game is resolved; null while pending. */
  actualWinner: string | null;
  resolved: boolean;
  /** Clark Index's own position — confidence pulled from predictions.json. */
  index: Pick;
  /** Crowd position — confidence is the mean of real users' submissions. */
  crowd: Pick;
  /** Your sample/seed position (editable on Make Your Case for the live week). */
  you: Pick;
}
