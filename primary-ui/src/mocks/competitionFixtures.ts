// ─── The Clark Competition — sample data fixtures ─────────────────────────────
// All mock. No backend. Structured so a later phase can swap these for real API
// responses behind useCompetitionData() without touching the UI.

import { CompetitionGame, MockUser, MockLeague, FactorChallenge } from '@/competition/types';

/** The live week users are actively picking (unresolved). Earlier weeks are settled. */
export const CURRENT_WEEK = 4;

// Helper to keep fixture rows terse.
function g(
  week: number,
  weekLabel: string,
  away: string,
  home: string,
  actualWinner: string | null,
  you: [string, number],
  crowd: [string, number],
  index: [string, number],
): CompetitionGame {
  return {
    gameId: `2024_${week}_${away}_${home}`,
    season: 2024,
    week,
    weekLabel,
    awayTeam: away,
    homeTeam: home,
    actualWinner,
    resolved: actualWinner !== null,
    you:   { team: you[0],   confidence: you[1] },
    crowd: { team: crowd[0], confidence: crowd[1] },
    index: { team: index[0], confidence: index[1] },
  };
}

// ─── Weeks 1–3: settled. Build the season Clark Scores. ───────────────────────
const WEEK_1: CompetitionGame[] = [
  g(1, 'Week 1', 'BUF', 'MIA', 'BUF', ['BUF', 0.90], ['BUF', 0.84], ['BUF', 0.78]),
  g(1, 'Week 1', 'DAL', 'PHI', 'PHI', ['DAL', 0.72], ['PHI', 0.60], ['PHI', 0.66]),
  g(1, 'Week 1', 'KC',  'BAL', 'KC',  ['KC',  0.66], ['KC',  0.70], ['KC',  0.74]),
  g(1, 'Week 1', 'SF',  'LAR', 'LAR', ['SF',  0.58], ['SF',  0.54], ['LAR', 0.56]),
];

const WEEK_2: CompetitionGame[] = [
  g(2, 'Week 2', 'DET', 'GB',  'DET', ['DET', 0.80], ['DET', 0.74], ['DET', 0.70]),
  g(2, 'Week 2', 'CIN', 'KC',  'KC',  ['KC',  0.62], ['KC',  0.66], ['KC',  0.72]),
  g(2, 'Week 2', 'MIN', 'CHI', 'MIN', ['MIN', 0.76], ['MIN', 0.68], ['MIN', 0.64]),
  g(2, 'Week 2', 'HOU', 'IND', 'IND', ['HOU', 0.64], ['IND', 0.52], ['HOU', 0.58]),
];

const WEEK_3: CompetitionGame[] = [
  g(3, 'Week 3', 'BAL', 'BUF', 'BUF', ['BUF', 0.84], ['BUF', 0.72], ['BUF', 0.62]),
  g(3, 'Week 3', 'PHI', 'TB',  'PHI', ['PHI', 0.78], ['PHI', 0.80], ['PHI', 0.76]),
  g(3, 'Week 3', 'LAC', 'DEN', 'DEN', ['LAC', 0.70], ['LAC', 0.56], ['DEN', 0.54]),
  g(3, 'Week 3', 'GB',  'MIN', 'GB',  ['GB',  0.60], ['MIN', 0.58], ['GB',  0.52]),
];

// ─── Week 4: live. "You" seeded at 0.5 (no position) — set on Make Your Case. ──
const WEEK_4: CompetitionGame[] = [
  g(4, 'Week 4', 'BUF', 'CIN', null, ['BUF', 0.50], ['BUF', 0.68], ['BUF', 0.72]),
  g(4, 'Week 4', 'KC',  'PHI', null, ['KC',  0.50], ['PHI', 0.55], ['KC',  0.60]),
  g(4, 'Week 4', 'DET', 'SF',  null, ['DET', 0.50], ['DET', 0.62], ['DET', 0.58]),
  g(4, 'Week 4', 'DAL', 'NYG', null, ['DAL', 0.50], ['DAL', 0.74], ['DAL', 0.80]),
];

/** Every game across the season, settled + live. */
export const COMPETITION_GAMES: CompetitionGame[] = [
  ...WEEK_1, ...WEEK_2, ...WEEK_3, ...WEEK_4,
];

// ─── Mock leagues ─────────────────────────────────────────────────────────────
export const MOCK_LEAGUES: MockLeague[] = [
  {
    id: 'league_couch',
    name: 'Couch Coaches',
    tag: 'COUCH',
    memberIds: ['u01', 'u03', 'u05', 'u07', 'u09', 'u11'],
  },
  {
    id: 'league_press',
    name: 'Press Box',
    tag: 'PRESS',
    memberIds: ['u02', 'u04', 'u06', 'u08', 'u10'],
  },
];

// ─── Mock leaderboard users ───────────────────────────────────────────────────
// clarkScore / clarkDifferential are pre-baked season totals (no live recompute).
export const MOCK_USERS: MockUser[] = [
  { id: 'u01', displayName: 'GridironGwen',  avatar: '🦅', clarkScore: 312, clarkDifferential:  74, weeklyNet:  88, biggestCorrectStake: 50, leagueId: 'league_couch' },
  { id: 'u02', displayName: 'AnalyticsAnde', avatar: '📊', clarkScore: 288, clarkDifferential:  50, weeklyNet:  42, biggestCorrectStake: 50, leagueId: 'league_press' },
  { id: 'u03', displayName: 'FourthDownFox', avatar: '🦊', clarkScore: 244, clarkDifferential:   6, weeklyNet:  61, biggestCorrectStake: 45, leagueId: 'league_couch' },
  { id: 'u04', displayName: 'RedZoneRiya',   avatar: '🎯', clarkScore: 221, clarkDifferential: -17, weeklyNet: -12, biggestCorrectStake: 48, leagueId: 'league_press' },
  { id: 'u05', displayName: 'BlitzBenny',    avatar: '⚡', clarkScore: 205, clarkDifferential: -33, weeklyNet:  30, biggestCorrectStake: 40, leagueId: 'league_couch' },
  { id: 'u06', displayName: 'PylonPete',     avatar: '🚩', clarkScore: 198, clarkDifferential: -40, weeklyNet:  18, biggestCorrectStake: 44, leagueId: 'league_press' },
  { id: 'u07', displayName: 'HailMaryHana',  avatar: '🙏', clarkScore: 176, clarkDifferential: -62, weeklyNet:  -8, biggestCorrectStake: 50, leagueId: 'league_couch' },
  { id: 'u08', displayName: 'CoverTwoCole',  avatar: '🛡️', clarkScore: 169, clarkDifferential: -69, weeklyNet:  24, biggestCorrectStake: 38, leagueId: 'league_press' },
  { id: 'u09', displayName: 'AudibleAisha',  avatar: '🎙️', clarkScore: 154, clarkDifferential: -84, weeklyNet:  12, biggestCorrectStake: 42, leagueId: 'league_couch' },
  { id: 'u10', displayName: 'TwoMinuteTom',  avatar: '⏱️', clarkScore: 141, clarkDifferential: -97, weeklyNet: -20, biggestCorrectStake: 36, leagueId: 'league_press' },
  { id: 'u11', displayName: 'OnsideOmar',    avatar: '🏈', clarkScore: 128, clarkDifferential: -110, weeklyNet: 16, biggestCorrectStake: 40, leagueId: 'league_couch' },
  { id: 'u12', displayName: 'ScrambleSam',   avatar: '🌀', clarkScore: 117, clarkDifferential: -121, weeklyNet:  6, biggestCorrectStake: 34, leagueId: null },
  { id: 'u13', displayName: 'NickelNadia',   avatar: '🪙', clarkScore: 103, clarkDifferential: -135, weeklyNet: -4, biggestCorrectStake: 30, leagueId: null },
  { id: 'u14', displayName: 'FlagFootFred',  avatar: '🚦', clarkScore:  92, clarkDifferential: -146, weeklyNet: 22, biggestCorrectStake: 46, leagueId: null },
  { id: 'u15', displayName: 'ChainCrewChad', avatar: '⛓️', clarkScore:  78, clarkDifferential: -160, weeklyNet:  2, biggestCorrectStake: 28, leagueId: null },
  { id: 'u16', displayName: 'PuntGodPriya',  avatar: '🦵', clarkScore:  61, clarkDifferential: -177, weeklyNet: -6, biggestCorrectStake: 32, leagueId: null },
  { id: 'u17', displayName: 'GadgetGreg',    avatar: '🎲', clarkScore:  44, clarkDifferential: -194, weeklyNet:  8, biggestCorrectStake: 26, leagueId: null },
];

// ─── Challenge-a-Factor — keyed to real predictions.json games + factor names ──
// These surface on the Clark Report (/game/...) factor rows.
const rawChallenges: Omit<FactorChallenge, 'isTopChallenge'>[] = [
  { id: 'c01', gameId: '2024_22_KC_PHI', factorName: 'Market Edge',    submitter: 'AnalyticsAnde', avatar: '📊', text: 'Spread closed at PHI −1.5 after opening KC −1. The market actually moved toward Philly — this card overstates the KC read.', upvotes: 47 },
  { id: 'c02', gameId: '2024_22_KC_PHI', factorName: 'Market Edge',    submitter: 'FourthDownFox', avatar: '🦊', text: 'Moneyline was basically a pick’em. Calling this a KC edge feels generous.', upvotes: 23 },
  { id: 'c03', gameId: '2024_22_KC_PHI', factorName: 'Defensive Edge', submitter: 'CoverTwoCole',  avatar: '🛡️', text: 'PHI front four generated pressure at a top-3 rate in the playoffs. The defensive edge should lean Philadelphia, not Kansas City.', upvotes: 61 },
  { id: 'c04', gameId: '2024_22_KC_PHI', factorName: 'Defensive Edge', submitter: 'BlitzBenny',    avatar: '⚡', text: 'Mahomes was pressured on ~40% of dropbacks. That’s the whole game and it points the other way.', upvotes: 38 },
  { id: 'c05', gameId: '2024_22_KC_PHI', factorName: 'Momentum',       submitter: 'GridironGwen',  avatar: '🦅', text: 'PHI won 3 straight by double digits into the SB. Momentum was clearly green, not gray.', upvotes: 29 },
  { id: 'c06', gameId: '2024_21_BUF_KC', factorName: 'Market Edge',    submitter: 'RedZoneRiya',   avatar: '🎯', text: 'KC at home in January is always underpriced. Market edge undersells the Arrowhead factor.', upvotes: 31 },
  { id: 'c07', gameId: '2024_21_BUF_KC', factorName: 'Recent Offense', submitter: 'AudibleAisha',  avatar: '🎙️', text: 'BUF offense was the hotter unit down the stretch — Allen’s EPA/play led all playoff QBs.', upvotes: 44 },
  { id: 'c08', gameId: '2024_21_WAS_PHI', factorName: 'Defensive Edge', submitter: 'PylonPete',    avatar: '🚩', text: 'WAS rookie QB vs that Philly pass rush — the defensive edge is even bigger than shown.', upvotes: 19 },
];

/** Top challenge = highest upvotes within each (gameId, factorName) group. */
function deriveTopChallenges(items: Omit<FactorChallenge, 'isTopChallenge'>[]): FactorChallenge[] {
  const topByGroup = new Map<string, string>(); // group key → winning challenge id
  for (const it of items) {
    const key = `${it.gameId}::${it.factorName}`;
    const current = topByGroup.get(key);
    const currentVotes = current ? items.find(x => x.id === current)!.upvotes : -1;
    if (it.upvotes > currentVotes) topByGroup.set(key, it.id);
  }
  return items.map(it => ({
    ...it,
    isTopChallenge: topByGroup.get(`${it.gameId}::${it.factorName}`) === it.id,
  }));
}

export const MOCK_CHALLENGES: FactorChallenge[] = deriveTopChallenges(rawChallenges);
