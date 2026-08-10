import { describe, it, expect } from 'vitest';
import {
  CURRENT_WEEK,
  isPlayoffWeek,
  resolveCurrentWeek,
  weekLabel,
  weekShortLabel,
  weekTitle,
} from './currentWeek';

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

describe('weekLabel', () => {
  it('names regular-season weeks and playoff rounds', () => {
    expect(weekLabel(1)).toBe('Week 1');
    expect(weekLabel(19)).toBe('Wild Card');
    expect(weekLabel(21)).toBe('Conference Championship');
  });
});

describe('weekShortLabel', () => {
  it('abbreviates for tight navigation', () => {
    expect(weekShortLabel(1)).toBe('Wk 1');
    expect(weekShortLabel(21)).toBe('Conf. Champ.');
  });
});

describe('week naming consistency', () => {
  // The three spellings are intentional variants of one name, not four
  // independent maps — the drift this guards against is exactly what these
  // helpers were introduced to end.
  it('keeps every spelling of a round in agreement', () => {
    for (const week of [1, 12, 19, 20, 21, 22]) {
      expect(weekTitle(week)).toBe(weekLabel(week).toUpperCase());
    }
    // The compact form may abbreviate, but never renames the round.
    expect(weekShortLabel(22)).toBe(weekLabel(22));
    expect(weekShortLabel(19)).toBe(weekLabel(19));
  });
});

describe('isPlayoffWeek', () => {
  it('splits the regular season from the postseason', () => {
    expect(isPlayoffWeek(18)).toBe(false);
    expect(isPlayoffWeek(19)).toBe(true);
    expect(isPlayoffWeek(22)).toBe(true);
  });
});
