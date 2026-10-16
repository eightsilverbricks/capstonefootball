import { describe, expect, it } from 'vitest';
import { buildRailItems, LOCKED_CLARK_LABEL, weekRecords, weekStats } from './rail';
import { ApiPrediction } from '@/types/prediction';

const game = (over: Partial<ApiPrediction>): ApiPrediction => ({
  season: 2026, week: 5, week_label: 'Week 5', home_team: 'DAL', away_team: 'TB', predicted_winner: 'DAL',
  home_win_prob: 0.64, away_win_prob: 0.36, confidence_label: 'Medium', confidence_score: 0.6, gametime: '20:20', weekday: 'Sunday',
  ...over,
} as ApiPrediction);

describe('buildRailItems', () => {
  it("shows Clark's pick when you haven't picked", () => {
    const [item] = buildRailItems([game({})], {});
    expect(item.pickLabel).toBe('Clark: DAL 64%');
    expect(item.status).toBe('pre');
  });

  it("hides Clark's pick and percentage when Clark is locked", () => {
    const [item] = buildRailItems([game({})], {}, { showClark: false });
    expect(item.pickLabel).toBe(LOCKED_CLARK_LABEL);
    expect(item.pickLabel).not.toMatch(/DAL|%/);
  });

  it('grades your pick on a final game', () => {
    const g = game({ home_score: 17, away_score: 24, actual_winner: 'TB' });
    const items = buildRailItems([g], { '2026_5_TB_DAL': { team: 'TB', confidence: 0.7 } });
    expect(items[0].status).toBe('final');
    expect(items[0].pickResult).toBe('win');
    expect(items[0].pickLabel).toBe('You: TB 70% ✓');
  });

  it('puts upcoming games before finals', () => {
    const items = buildRailItems([game({ home_team: 'NE', away_team: 'LV', home_score: 27, away_score: 10, actual_winner: 'NE' }), game({})], {});
    expect(items[0].status).toBe('pre');
  });
});

describe('weekStats', () => {
  it("counts Clark's record from graded games only", () => {
    const stats = weekStats([
      game({ home_score: 20, away_score: 10, actual_winner: 'DAL' }),
      game({ home_team: 'NYJ', away_team: 'CLE', predicted_winner: 'NYJ', home_score: 13, away_score: 16, actual_winner: 'CLE' }),
      game({ home_team: 'SEA', away_team: 'SF', predicted_winner: 'SEA', home_win_prob: 0.53, away_win_prob: 0.47 }),
    ]);
    expect(stats.find((s) => s.id === 'clark-record')?.value).toBe('1–1');
    expect(stats.find((s) => s.id === 'closest')?.value).toContain('SF @ SEA');
  });

  it('is empty with no games', () => {
    expect(weekStats([])).toEqual([]);
  });

  it("leaves out Clark's lock and closest call when Clark is locked", () => {
    const ids = weekStats([game({}), game({ home_team: 'NE', away_team: 'LV', home_win_prob: 0.51, away_win_prob: 0.49 })], { showClark: false }).map((s) => s.id);
    expect(ids).not.toContain('lock');
    expect(ids).not.toContain('closest');
    expect(ids).toContain('games');
  });
});

describe('weekRecords', () => {
  it('tallies graded picks per week', () => {
    const g1 = game({ week: 1, home_score: 20, away_score: 10, actual_winner: 'DAL' });
    const g2 = game({ week: 1, home_team: 'NYJ', away_team: 'CLE', home_score: 13, away_score: 16, actual_winner: 'CLE' });
    const picks = { '2026_1_TB_DAL': { team: 'DAL', confidence: 0.6 }, '2026_1_CLE_NYJ': { team: 'NYJ', confidence: 0.6 } };
    expect(weekRecords([g1, g2], picks)).toEqual({ 1: '1–1' });
  });
});
