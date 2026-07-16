import { describe, it, expect } from 'vitest';
import { computeSeasonSummary } from './seasonSummary';
import { ApiPrediction } from '@/types/prediction';
import { UserPick } from '@/hooks/useUserPicks';

// Minimal game factory — only the fields computeSeasonSummary reads.
function game(partial: Partial<ApiPrediction> & { game_id: string }): ApiPrediction {
  return {
    season: 2024,
    week: 1,
    week_label: 'Week 1',
    home_team: 'HOME',
    away_team: 'AWAY',
    predicted_winner: 'HOME',
    home_win_prob: 0.6,
    away_win_prob: 0.4,
    confidence_label: 'Medium',
    confidence_score: 20,
    ...partial,
  } as ApiPrediction;
}

// stakeFromConfidence(0.8) = 50 * (2*0.8 - 1) = 30
const CONF = 0.8;

describe('computeSeasonSummary', () => {
  it('returns an empty standing when there are no picks', () => {
    const s = computeSeasonSummary({}, [game({ game_id: 'g1' })]);
    expect(s.picksMade).toBe(0);
    expect(s.seasonScore).toBe(0);
    expect(s.streak).toBeNull();
  });

  it('awards +stake for a correct pick and −stake for a wrong one', () => {
    const games = [
      game({ game_id: 'g1', week: 1, game_date: '2024-09-08', actual_winner: 'HOME' }),
      game({ game_id: 'g2', week: 2, game_date: '2024-09-15', actual_winner: 'AWAY' }),
    ];
    const picks: Record<string, UserPick> = {
      g1: { team: 'HOME', confidence: CONF }, // correct → +30
      g2: { team: 'HOME', confidence: CONF }, // wrong   → −30
    };
    const s = computeSeasonSummary(picks, games);
    expect(s.wins).toBe(1);
    expect(s.losses).toBe(1);
    expect(s.seasonScore).toBe(0); // +30 −30
    expect(s.resolvedCount).toBe(2);
  });

  it('computes Clark Differential over only the games the user picked', () => {
    // Clark always picks HOME. User fades Clark on g2 and is right.
    const games = [
      game({ game_id: 'g1', week: 1, game_date: '2024-09-08', actual_winner: 'HOME' }),
      game({ game_id: 'g2', week: 2, game_date: '2024-09-15', actual_winner: 'AWAY' }),
    ];
    const picks: Record<string, UserPick> = {
      g1: { team: 'HOME', confidence: CONF }, // with Clark, both right → user +30
      g2: { team: 'AWAY', confidence: CONF }, // fades Clark, right → user +30, Clark −?
    };
    const s = computeSeasonSummary(picks, games);
    // User: +30 +30 = 60. Clark (confidence from score 20 → 0.6, stake 10): g1 +10, g2 −10 = 0.
    expect(s.seasonScore).toBe(60);
    expect(s.clarkScore).toBe(0);
    expect(s.clarkDifferential).toBe(60);
  });

  it('reports the current streak newest-first in chronological order', () => {
    const games = [
      game({ game_id: 'g1', week: 1, game_date: '2024-09-08', actual_winner: 'HOME' }),
      game({ game_id: 'g2', week: 2, game_date: '2024-09-15', actual_winner: 'HOME' }),
      game({ game_id: 'g3', week: 3, game_date: '2024-09-22', actual_winner: 'AWAY' }),
    ];
    const picks: Record<string, UserPick> = {
      g1: { team: 'AWAY', confidence: CONF }, // wrong
      g2: { team: 'HOME', confidence: CONF }, // right
      g3: { team: 'AWAY', confidence: CONF }, // right → latest run is 2 wins
    };
    const s = computeSeasonSummary(picks, games);
    expect(s.streak).toEqual({ type: 'W', count: 2 });
    expect(s.latestWeek).toBe(3);
  });

  it('counts unplayed games (null winner) as pending, not losses', () => {
    const games = [game({ game_id: 'g1', actual_winner: null })];
    const picks: Record<string, UserPick> = { g1: { team: 'HOME', confidence: CONF } };
    const s = computeSeasonSummary(picks, games);
    expect(s.pendingCount).toBe(1);
    expect(s.resolvedCount).toBe(0);
    expect(s.losses).toBe(0);
    expect(s.creditsPending).toBe(30);
  });
});
