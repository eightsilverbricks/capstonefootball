import { describe, expect, it } from 'vitest';
import { shareLines } from './shareImage';

describe('shareLines', () => {
  it('pick card', () => {
    expect(shareLines({ kind: 'pick', team: 'ARI', pct: 90, clarkTeam: 'SEA', clarkPct: 64, matchup: 'ARI at SEA' }))
      .toMatchObject({ big: 'My pick: ARI 90%', sub: 'Clark: SEA 64%' });
  });
  it('result card calls out beating Clark', () => {
    const l = shareLines({ kind: 'result', team: 'ARI', pct: 90, right: true, clarkTeam: 'SEA', clarkRight: false, score: 'ARI 24 – 20 SEA' });
    expect(l.big).toBe('ARI at 90% ✓');
    expect(l.sub).toBe('Called it. Clark had SEA.');
  });
  it('weekly card', () => {
    const l = shareLines({ kind: 'week', week: 4, wins: 11, losses: 5, clarkWins: 10, clarkLosses: 6, grid: ['W', 'L', 'W'] });
    expect(l).toEqual({ kicker: 'The Clark Index · Week 4', big: '11–5', sub: 'Clark 10–6', foot: '✓ ✗ ✓' });
  });
});
