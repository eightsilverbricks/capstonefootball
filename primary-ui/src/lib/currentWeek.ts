// ─── Current week — one source of truth shared by Home and the Games page ─────
// A live season has to track the calendar: "this week" moves every Tuesday and
// nobody should have to redeploy for it. A completed demo season has no such
// thing as now, so it opens on week 1 and stays there.

import { LIVE_SEASON_KICKOFF } from './season';

export const CURRENT_WEEK = 1;

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

/**
 * Which week the live season is in, counted from kickoff. Weeks are 1-indexed
 * and clamped to 1 before the season starts, so the pre-season shows the
 * opening slate rather than a negative week.
 */
export function liveSeasonWeek(now: Date = new Date()): number {
  const elapsed = now.getTime() - LIVE_SEASON_KICKOFF.getTime();
  if (elapsed < 0) return 1;
  return Math.floor(elapsed / MS_PER_WEEK) + 1;
}

/**
 * The week to open on. Live seasons follow the calendar; demo seasons are
 * finished, so they start at week 1. Either way the result is snapped to a week
 * the data actually contains — the calendar keeps counting past week 18 but the
 * fixtures do not.
 */
export function resolveCurrentWeek(
  availableWeeks: number[],
  options: { isDemo?: boolean; now?: Date } = {},
): number {
  if (availableWeeks.length === 0) return CURRENT_WEEK;

  const target = options.isDemo ? CURRENT_WEEK : liveSeasonWeek(options.now);
  if (availableWeeks.includes(target)) return target;

  // Snap to the nearest available week at or below the target, else the first.
  const earlier = availableWeeks.filter((w) => w <= target);
  return earlier.length > 0
    ? earlier[earlier.length - 1]
    : availableWeeks[0];
}

// ── Week naming ──────────────────────────────────────────────────────────────
// One source of truth for what a week is called. This used to live as four
// near-copies (WeekStrip, GameBanner, GamePage, here), which had week 21
// reading "Conf. Champ.", "Conference Championship" and "CONFERENCE" on three
// surfaces of the same site. Two spellings are kept — a full name and a
// compact one for tight navigation — and nothing else redefines them.

const ROUND_NAMES: Record<number, string> = {
  19: 'Wild Card',
  20: 'Divisional',
  21: 'Conference Championship',
  22: 'Super Bowl',
};

const ROUND_SHORT_NAMES: Record<number, string> = {
  19: 'Wild Card',
  20: 'Divisional',
  21: 'Conf. Champ.',
  22: 'Super Bowl',
};

/** Full name for a week — "Week 1", "Conference Championship". */
export function weekLabel(week: number): string {
  return ROUND_NAMES[week] ?? `Week ${week}`;
}

/** Compact name for tight navigation — "Wk 1", "Conf. Champ.". */
export function weekShortLabel(week: number): string {
  return ROUND_SHORT_NAMES[week] ?? `Wk ${week}`;
}

/** Masthead form, set uppercase — "WEEK 1", "SUPER BOWL". */
export function weekTitle(week: number): string {
  return weekLabel(week).toUpperCase();
}

/** True for the postseason weeks, which several surfaces style differently. */
export function isPlayoffWeek(week: number): boolean {
  return week >= 19;
}
