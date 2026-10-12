import { describe, expect, it } from 'vitest';
import { divisionLines, pickRows, splits, weekLines } from './seasonBreakdown';
import { ApiPrediction } from '@/types/prediction';

const game = (over: Partial<ApiPrediction>): ApiPrediction => ({
  season: 2026, week: 1, week_label: 'Week 1', home_team: 'DAL', away_team: 'TB', predicted_winner: 'DAL',
  home_win_prob: 0.64, away_win_prob: 0.36, confidence_label: 'Medium', confidence_score: 0.6,
  ...over,
} as ApiPrediction);

const won = game({ actual_winner: 'DAL', home_score: 20, away_score: 10 });
const lost = game({ week: 2, home_team: 'BUF', away_team: 'MIA', predicted_winner: 'BUF', actual_winner: 'MIA', home_score: 3, away_score: 9 });
const open = game({ week: 2, home_team: 'KC', away_team: 'LV', predicted_winner: 'KC' });
const games = [open, lost, won];
const picks = {
  '2026_1_TB_DAL': { team: 'DAL', confidence: 0.85 },
  '2026_2_MIA_BUF': { team: 'BUF', confidence: 0.55 },
  '2026_2_LV_KC': { team: 'LV', confidence: 0.7 },
};

describe('pickRows', () => {
  it('joins picks to games in kickoff order, ungraded as null', () => {
    const rows = pickRows(picks, games);
    expect(rows.map((r) => r.correct)).toEqual([true, null, false]);
  });
});

describe('weekLines', () => {
  it('builds squares and records per week', () => {
    const lines = weekLines(pickRows(picks, games));
    expect(lines).toHaveLength(2);
    expect(lines[1].squares).toEqual(['n', 'l']);
    expect(lines[1].you).toEqual({ w: 0, l: 1 });
    expect(lines[1].clark).toEqual({ w: 0, l: 1 });
  });
});

describe('splits', () => {
  it('drops empty splits and names your team', () => {
    const s = splits(pickRows(picks, games), 'BUF');
    expect(s.map((x) => x.id)).toEqual(['with', 'sure', 'unsure', 'team']);
    expect(s.find((x) => x.id === 'team')?.label).toBe('Picking the Bills');
  });
});

describe('divisionLines', () => {
  it('counts a game for both divisions and ranks by hit rate', () => {
    const lines = divisionLines(pickRows(picks, games));
    expect(lines.map((l) => l.division)).toEqual(['NFC East', 'NFC South', 'AFC East']);
    expect(lines[2].you).toEqual({ w: 0, l: 1 });
  });
});
