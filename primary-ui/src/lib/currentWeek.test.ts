import { describe, it, expect } from 'vitest';
import { LIVE_SEASON_KICKOFF } from './season';
import {
  CURRENT_WEEK,
  isPlayoffWeek,
  liveSeasonWeek,
  resolveCurrentWeek,
  weekLabel,
  weekShortLabel,
  weekTitle,
} from './currentWeek';

describe('resolveCurrentWeek', () => {
  // A completed season has no "now", so it always opens on week 1.
  const demo = { isDemo: true };

  it('opens a demo season on the configured week', () => {
    expect(resolveCurrentWeek([1, 2, 3], demo)).toBe(CURRENT_WEEK);
  });

  it('falls back to CURRENT_WEEK when there are no weeks at all', () => {
    expect(resolveCurrentWeek([], demo)).toBe(CURRENT_WEEK);
  });

  it('snaps to the first available week when the target is earlier than all of them', () => {
    // Pre-season: the calendar says week 1, but the data starts at week 5.
    // Showing the *last* week here would skip the whole season at a glance.
    expect(resolveCurrentWeek([5, 6, 7], demo)).toBe(5);
  });

  it('tracks the calendar during a live season', () => {
    const weeks = Array.from({ length: 18 }, (_, i) => i + 1);
    // Two and a bit weeks past kickoff is week 3.
    const now = new Date(LIVE_SEASON_KICKOFF.getTime() + 15 * 24 * 3600 * 1000);
    expect(resolveCurrentWeek(weeks, { now })).toBe(3);
  });

  it('clamps to week 1 before kickoff rather than going negative', () => {
    const now = new Date(LIVE_SEASON_KICKOFF.getTime() - 30 * 24 * 3600 * 1000);
    expect(liveSeasonWeek(now)).toBe(1);
    expect(resolveCurrentWeek([1, 2, 3], { now })).toBe(1);
  });

  it('snaps back to the last real week once the calendar runs past the fixtures', () => {
    // The calendar keeps counting after week 18; the schedule does not.
    const weeks = Array.from({ length: 18 }, (_, i) => i + 1);
    const now = new Date(LIVE_SEASON_KICKOFF.getTime() + 300 * 24 * 3600 * 1000);
    expect(resolveCurrentWeek(weeks, { now })).toBe(18);
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
