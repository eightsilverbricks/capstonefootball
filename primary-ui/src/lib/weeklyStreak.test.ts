import { describe, expect, it } from 'vitest';
import { weeklyStreak } from './weeklyStreak';

const wed = new Date('2026-10-14T12:00:00');
const sat = new Date('2026-10-17T12:00:00');

describe('weeklyStreak', () => {
  it('counts consecutive weeks with a pick, including this one', () => {
    expect(weeklyStreak(new Set([1, 2, 3, 4]), 4, wed).weeks).toBe(4);
  });
  it('the week in progress does not break it', () => {
    expect(weeklyStreak(new Set([1, 2, 3]), 4, wed)).toMatchObject({ weeks: 3, atRisk: false });
  });
  it('is at risk from Friday until you pick', () => {
    expect(weeklyStreak(new Set([1, 2, 3]), 4, sat).atRisk).toBe(true);
  });
  it('a freeze covers one missed week, then recharges after 4 weeks', () => {
    const s = weeklyStreak(new Set([1, 2, 4, 5]), 5, wed);
    expect(s).toMatchObject({ weeks: 4, frozenWeeks: [3], freezeReady: false });
    expect(weeklyStreak(new Set([1, 2, 4, 5, 6, 7]), 7, wed).freezeReady).toBe(true);
  });
  it('two misses before the freeze recharges end it', () => {
    expect(weeklyStreak(new Set([1, 2, 5, 6]), 6, wed).weeks).toBe(2);
  });
  it('no picks, no streak', () => {
    expect(weeklyStreak(new Set(), 5, sat)).toMatchObject({ weeks: 0, atRisk: false });
  });
});
