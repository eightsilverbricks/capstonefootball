import { describe, expect, it } from 'vitest';
import { divisionPlace, ordinal, teamNotes, teamOutlook, teamRecord, teamSchedule } from './teamPage';
import { ApiPrediction } from '@/types/prediction';

const game = (over: Partial<ApiPrediction>): ApiPrediction => ({
  season: 2026, week: 1, week_label: 'Week 1', home_team: 'SEA', away_team: 'DEN', predicted_winner: 'SEA',
  home_win_prob: 0.6, away_win_prob: 0.4, confidence_label: 'Medium', confidence_score: 0.6,
  ...over,
} as ApiPrediction);

const w1 = game({ actual_winner: 'SEA', home_score: 26, away_score: 20 });
const w2 = game({ week: 2, home_team: 'LA', away_team: 'SEA', predicted_winner: 'SEA', home_win_prob: 0.45, away_win_prob: 0.55, actual_winner: 'LA', home_score: 24, away_score: 17 });
const w3 = game({ week: 3, home_team: 'SEA', away_team: 'SF', predicted_winner: 'SF', home_win_prob: 0.4, away_win_prob: 0.6,
  injury_notes: [{ name: 'Sam Darnold', team: 'SEA', position: 'QB', status: 'Questionable', injury: 'wrist' }, { name: 'X', team: 'SF', position: 'WR', status: 'Out', injury: 'knee' }] });
const games = [w3, w1, w2];

describe('teamSchedule', () => {
  it('orders by week and scores from the team’s side', () => {
    const s = teamSchedule('SEA', games);
    expect(s.map((r) => r.opponent)).toEqual(['DEN', 'LA', 'SF']);
    expect(s[1].result).toEqual({ won: false, us: 17, them: 24 });
    expect(s[2].result).toBeNull();
  });
});

describe('teamRecord and divisionPlace', () => {
  it('counts graded games and places the team in its division', () => {
    expect(teamRecord('SEA', games)).toEqual({ w: 1, l: 1 });
    expect(divisionPlace('LA', games)).toBe(1);
    expect(divisionPlace('SEA', games)).toBe(2);
    expect(divisionPlace('SEA', [w3])).toBeNull();
  });
});

describe('teamOutlook', () => {
  it("grades Clark on the team's games and projects the rest", () => {
    const o = teamOutlook(teamSchedule('SEA', games));
    expect(o.clark).toEqual({ w: 1, l: 1 });
    expect(o.favoredIn).toBe(0);
    expect(o.remaining).toBe(1);
    expect(o.expectedWins).toBeCloseTo(0.4);
  });
});

describe('teamNotes', () => {
  it("uses the next game's notes for this team only", () => {
    expect(teamNotes('SEA', teamSchedule('SEA', games)).injuries.map((i) => i.name)).toEqual(['Sam Darnold']);
  });
});

describe('ordinal', () => {
  it('handles teens', () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22].map(ordinal)).toEqual(['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd']);
  });
});
