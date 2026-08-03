import { describe, it, expect } from 'vitest';
import {
  buildSentimentSeries,
  computeFanbaseStandings,
  getFanPick,
  getFanbaseSplit,
} from './threeWaySignal';
import { FanbaseTotal, SentimentDay, SentimentMap } from '@/data/sentimentRepository';
import { ApiPrediction } from '@/types/prediction';

// Minimal game factory — only the fields these helpers read.
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

const G = game({ game_id: 'g1' });

describe('getFanPick', () => {
  it('returns null when the game has no community picks', () => {
    expect(getFanPick(G, {})).toBeNull();
  });

  it('returns null when the game is present but every count is zero', () => {
    const sentiment: SentimentMap = { g1: { total: 0, byTeam: {} } };

    expect(getFanPick(G, sentiment)).toBeNull();
  });

  it('reports the more-backed team and its real share of picks', () => {
    const sentiment: SentimentMap = { g1: { total: 10, byTeam: { HOME: 3, AWAY: 7 } } };

    const fan = getFanPick(G, sentiment);

    expect(fan).toEqual({ team: 'AWAY', prob: 0.7, picks: 10 });
  });

  it('ignores counts for teams that are not in this matchup', () => {
    const sentiment: SentimentMap = { g1: { total: 9, byTeam: { HOME: 2, AWAY: 2, OTHER: 5 } } };

    const fan = getFanPick(G, sentiment);

    expect(fan).toEqual({ team: 'HOME', prob: 0.5, picks: 4 });
  });
});

describe('buildSentimentSeries', () => {
  const days: SentimentDay[] = [
    { day: '2024-09-01', byTeam: { HOME: 1, AWAY: 1 } },
    { day: '2024-09-02', byTeam: { HOME: 3 } },
  ];

  it('returns null when there are too few days to show a trend', () => {
    expect(buildSentimentSeries(G, [days[0]])).toBeNull();
  });

  it('returns null when there are too few picks to mean anything', () => {
    const thin: SentimentDay[] = [
      { day: '2024-09-01', byTeam: { HOME: 1 } },
      { day: '2024-09-02', byTeam: { AWAY: 1 } },
    ];

    expect(buildSentimentSeries(G, thin)).toBeNull();
  });

  it('accumulates each day into the leading team’s running share', () => {
    const series = buildSentimentSeries(G, days);

    expect(series).not.toBeNull();
    expect(series!.team).toBe('HOME');
    expect(series!.picks).toBe(5);
    // Day 1: 1 of 2 backed HOME. Day 2: 4 of 5, cumulatively.
    expect(series!.points.map((p) => p.pct)).toEqual([0.5, 0.8]);
  });
});

describe('getFanbaseSplit', () => {
  const totals: FanbaseTotal[] = [
    { fanTeam: 'HOME', gameKey: 'g1', team: 'HOME', picks: 3, stakeUnits: 1.5 },
    { fanTeam: 'HOME', gameKey: 'g1', team: 'AWAY', picks: 1, stakeUnits: 0.5 },
  ];

  it('returns null when no fanbase has picked the game', () => {
    expect(getFanbaseSplit(G, [])).toBeNull();
  });

  it('reports loyalty for the side that picked and null for the side that did not', () => {
    const split = getFanbaseSplit(G, totals);

    expect(split!.home).toEqual({ team: 'HOME', backsOwn: 0.75, picks: 4 });
    expect(split!.away).toBeNull();
  });

  it('ignores rows belonging to a different game', () => {
    const other: FanbaseTotal[] = [
      ...totals,
      { fanTeam: 'HOME', gameKey: 'g2', team: 'AWAY', picks: 99, stakeUnits: 40 },
    ];

    expect(getFanbaseSplit(G, other)!.home!.picks).toBe(4);
  });
});

describe('computeFanbaseStandings', () => {
  const resolved = game({ game_id: 'g1', actual_winner: 'HOME' });
  const pending = game({ game_id: 'g2', actual_winner: undefined });

  it('is empty when no picks are tagged with a fanbase', () => {
    expect(computeFanbaseStandings([resolved], [])).toEqual([]);
  });

  it('skips unresolved games entirely', () => {
    const totals: FanbaseTotal[] = [
      { fanTeam: 'HOME', gameKey: 'g2', team: 'HOME', picks: 4, stakeUnits: 2 },
    ];

    expect(computeFanbaseStandings([pending], totals)).toEqual([]);
  });

  it('credits winners and debits losers at the real staked amount', () => {
    const totals: FanbaseTotal[] = [
      // Backed the winner: +50 * 1.2 credits.
      { fanTeam: 'HOME', gameKey: 'g1', team: 'HOME', picks: 3, stakeUnits: 1.2 },
      // Backed the loser: −50 * 0.4.
      { fanTeam: 'HOME', gameKey: 'g1', team: 'AWAY', picks: 1, stakeUnits: 0.4 },
    ];

    const [standing] = computeFanbaseStandings([resolved], totals);

    expect(standing.team).toBe('HOME');
    expect(standing.picks).toBe(4);
    expect(standing.correct).toBe(3);
    expect(standing.net).toBe(60 - 20);
    expect(standing.loyaltyPct).toBe(0.75);
  });

  it('ranks fanbases by net credits, best first', () => {
    const totals: FanbaseTotal[] = [
      { fanTeam: 'HOME', gameKey: 'g1', team: 'HOME', picks: 1, stakeUnits: 0.2 },
      { fanTeam: 'AWAY', gameKey: 'g1', team: 'HOME', picks: 1, stakeUnits: 0.8 },
    ];

    expect(computeFanbaseStandings([resolved], totals).map((s) => s.team)).toEqual(['AWAY', 'HOME']);
  });
});
