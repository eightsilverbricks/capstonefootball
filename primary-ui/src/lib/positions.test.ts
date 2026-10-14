import { describe, expect, it } from 'vitest';
import { explainPosition, placeOnField } from './positions';

describe('positions', () => {
  it('explains known positions in two sentences, with a fallback', () => {
    expect(explainPosition('QB').split('. ').length).toBe(2);
    expect(explainPosition('LS')).toMatch(/starter/);
  });
  it('spreads repeated positions to different spots, offense below the line', () => {
    const placed = placeOnField([{ pos: 'WR' }, { pos: 'WR' }, { pos: 'WR' }, { pos: 'QB' }, { pos: 'FS' }]);
    const xs = placed.slice(0, 3).map((p) => p.x);
    expect(new Set(xs).size).toBe(3);
    expect(placed[3].y).toBeGreaterThan(50);
    expect(placed[4].y).toBeLessThan(50);
  });
});
