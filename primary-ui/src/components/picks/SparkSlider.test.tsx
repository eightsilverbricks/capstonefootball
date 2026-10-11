import { describe, expect, it } from 'vitest';
import { toPick, toPosition } from './SparkSlider';

describe('SparkSlider position mapping', () => {
  it('centre is no pick', () => {
    expect(toPosition({ team: 'DAL', confidence: 0.5 }, 'DAL')).toBe(50);
    expect(toPick(50, 'TB', 'DAL').confidence).toBe(0.5);
  });

  it('right of centre is the home team', () => {
    expect(toPick(80, 'TB', 'DAL')).toEqual({ team: 'DAL', confidence: 0.8 });
    expect(toPosition({ team: 'DAL', confidence: 0.8 }, 'DAL')).toBe(80);
  });

  it('left of centre is the away team, mirrored', () => {
    expect(toPick(25, 'TB', 'DAL')).toEqual({ team: 'TB', confidence: 0.75 });
    expect(toPosition({ team: 'TB', confidence: 0.75 }, 'DAL')).toBe(25);
  });
});
