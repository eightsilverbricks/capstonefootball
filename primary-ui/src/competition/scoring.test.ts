import { describe, it, expect } from 'vitest';
import {
  stakeFromConfidence,
  resolvePick,
  weeklyNet,
  clarkScore,
  clarkDifferential,
  biggestCorrectStake,
  creditsAtRisk,
  meanConfidence,
  GAME_CREDIT_CAP,
} from './scoring';
import { CompetitionGame } from './types';

function game(partial: Partial<CompetitionGame>): CompetitionGame {
  return {
    gameId: 'g',
    season: 2024,
    week: 1,
    weekLabel: 'Week 1',
    awayTeam: 'BUF',
    homeTeam: 'CIN',
    actualWinner: 'BUF',
    resolved: true,
    index: { team: 'BUF', confidence: 0.5 },
    crowd: { team: 'BUF', confidence: 0.5 },
    you: { team: 'BUF', confidence: 0.5 },
    ...partial,
  };
}

describe('stakeFromConfidence', () => {
  it('is 0 at 50% confidence (no position)', () => {
    expect(stakeFromConfidence(0.5)).toBe(0);
  });

  it('is the full cap at 100% confidence', () => {
    expect(stakeFromConfidence(1.0)).toBe(GAME_CREDIT_CAP);
  });

  it('matches 50 * (2*confidence - 1) exactly', () => {
    expect(stakeFromConfidence(0.75)).toBeCloseTo(50 * (2 * 0.75 - 1), 10); // 25
    expect(stakeFromConfidence(0.6)).toBeCloseTo(50 * (2 * 0.6 - 1), 10);   // 10
    expect(stakeFromConfidence(0.85)).toBeCloseTo(35, 10);
  });

  it('clamps out-of-range confidence to the slider bounds', () => {
    expect(stakeFromConfidence(0.3)).toBe(0);
    expect(stakeFromConfidence(1.4)).toBe(GAME_CREDIT_CAP);
  });
});

describe('resolvePick', () => {
  it('awards +stake when the backed team wins', () => {
    expect(resolvePick({ team: 'BUF', confidence: 0.9 }, 'BUF')).toBe(40);
  });

  it('subtracts stake when the backed team loses', () => {
    expect(resolvePick({ team: 'CIN', confidence: 0.9 }, 'BUF')).toBe(-40);
  });

  it('returns 0 at 50% confidence regardless of outcome', () => {
    expect(resolvePick({ team: 'BUF', confidence: 0.5 }, 'BUF')).toBe(0);
    expect(resolvePick({ team: 'CIN', confidence: 0.5 }, 'BUF')).toBe(0);
  });

  it('returns 0 for an unresolved game', () => {
    expect(resolvePick({ team: 'BUF', confidence: 1.0 }, null)).toBe(0);
  });
});

describe('weeklyNet', () => {
  it('sums resolved stakes across the week', () => {
    const games = [
      game({ gameId: '1', actualWinner: 'BUF', you: { team: 'BUF', confidence: 1.0 } }),  // +50
      game({ gameId: '2', actualWinner: 'CIN', you: { team: 'BUF', confidence: 0.8 } }),  // -30
      game({ gameId: '3', actualWinner: 'BUF', you: { team: 'BUF', confidence: 0.5 } }),  // 0
    ];
    expect(weeklyNet(games, 'you')).toBe(20);
  });

  it('ignores unresolved games', () => {
    const games = [
      game({ gameId: '1', resolved: false, actualWinner: null, you: { team: 'BUF', confidence: 1.0 } }),
    ];
    expect(weeklyNet(games, 'you')).toBe(0);
  });

  it('treats per-game caps as independent — an early loss does not reduce later wager room', () => {
    const games = [
      game({ gameId: '1', actualWinner: 'CIN', you: { team: 'BUF', confidence: 1.0 } }), // -50
      game({ gameId: '2', actualWinner: 'BUF', you: { team: 'BUF', confidence: 1.0 } }), // +50 (full 50 still available)
    ];
    expect(weeklyNet(games, 'you')).toBe(0);
  });
});

describe('clarkScore & differential', () => {
  const games = [
    game({ gameId: '1', week: 1, actualWinner: 'BUF',
      you: { team: 'BUF', confidence: 1.0 }, index: { team: 'BUF', confidence: 0.8 } }),   // you +50, idx +30
    game({ gameId: '2', week: 2, actualWinner: 'CIN',
      you: { team: 'BUF', confidence: 0.6 }, index: { team: 'CIN', confidence: 0.7 } }),   // you -10, idx +20
  ];

  it('accumulates Clark Score across weeks', () => {
    expect(clarkScore(games, 'you')).toBe(40);   // 50 - 10
    expect(clarkScore(games, 'index')).toBe(50);  // 30 + 20
  });

  it('computes Clark Differential vs the Index', () => {
    expect(clarkDifferential(games, 'you')).toBe(-10); // 40 - 50
    expect(clarkDifferential(games, 'index')).toBe(0);
  });
});

describe('biggestCorrectStake & creditsAtRisk', () => {
  const games = [
    game({ gameId: '1', actualWinner: 'BUF', you: { team: 'BUF', confidence: 0.9 } }), // +40 correct
    game({ gameId: '2', actualWinner: 'CIN', you: { team: 'BUF', confidence: 1.0 } }), // -50 wrong
  ];

  it('returns the largest correct positive stake only', () => {
    expect(biggestCorrectStake(games, 'you')).toBe(40);
  });

  it('sums credits at risk across the week', () => {
    expect(creditsAtRisk(games, 'you')).toBe(90); // 40 + 50
  });
});

describe('meanConfidence', () => {
  it('averages submissions', () => {
    expect(meanConfidence([0.6, 0.8, 1.0])).toBeCloseTo(0.8, 10);
  });
  it('falls back to the slider minimum when empty', () => {
    expect(meanConfidence([])).toBe(0.5);
  });
});
