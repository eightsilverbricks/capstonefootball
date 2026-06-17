// ─── The Clark Competition — shared types ─────────────────────────────────────
// Mode where users wager confidence against the model and the crowd.

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
  /** Crowd position — confidence is the mean of mock users' submissions. */
  crowd: Pick;
  /** Your sample/seed position (editable on Make Your Case for the live week). */
  you: Pick;
}

/** A leaderboard competitor. */
export interface MockUser {
  id: string;
  displayName: string;
  /** Placeholder avatar — an emoji or initials token, not a real image. */
  avatar: string;
  clarkScore: number;
  clarkDifferential: number;
  /** This week's net, for the "this week" sort. */
  weeklyNet: number;
  /** Biggest single correct stake this season. */
  biggestCorrectStake: number;
  /** League id this user is tagged to, or 'global' only. */
  leagueId: string | null;
}

export interface MockLeague {
  id: string;
  name: string;
  tag: string;
  memberIds: string[];
}

/** A community challenge against one of a game's factor cards. */
export interface FactorChallenge {
  id: string;
  gameId: string;
  /** Factor card name this challenge targets (matches FactorCard.name). */
  factorName: string;
  submitter: string;
  avatar: string;
  text: string;
  upvotes: number;
  /** Derived: highest-upvoted challenge for its factor. */
  isTopChallenge: boolean;
}
