import { describe, it, expect } from 'vitest';
import { CURRENT_WEEK, resolveCurrentWeek, weekTitle } from './currentWeek';

describe('resolveCurrentWeek', () => {
  it('returns the configured current week when the data has it', () => {
    expect(resolveCurrentWeek([1, 2, 3])).toBe(CURRENT_WEEK);
  });

  it('falls back to the last available week when the current week is absent', () => {
    const weeks = [5, 6, 7];
    expect(weeks).not.toContain(CURRENT_WEEK);
    expect(resolveCurrentWeek(weeks)).toBe(7);
  });

  it('falls back to CURRENT_WEEK when there are no weeks at all', () => {
    expect(resolveCurrentWeek([])).toBe(CURRENT_WEEK);
  });
});

describe('weekTitle', () => {
  it('labels regular-season weeks', () => {
    expect(weekTitle(1)).toBe('WEEK 1');
    expect(weekTitle(12)).toBe('WEEK 12');
  });

  it('labels playoff rounds', () => {
    expect(weekTitle(19)).toBe('WILD CARD');
    expect(weekTitle(22)).toBe('SUPER BOWL');
  });
});
