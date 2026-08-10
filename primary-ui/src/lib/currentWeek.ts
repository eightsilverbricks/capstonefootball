// ─── Current week — one source of truth shared by Home and the Games page ─────
// The 2024 dataset is complete, so "current" is a configured constant rather
// than a live clock. Change CURRENT_WEEK to move what the dashboard treats as
// "this week"; the Games page uses it as the initial selected week.

export const CURRENT_WEEK = 1;

/** The configured current week if the data has it, else the last available week. */
export function resolveCurrentWeek(availableWeeks: number[]): number {
  if (availableWeeks.includes(CURRENT_WEEK)) return CURRENT_WEEK;
  return availableWeeks[availableWeeks.length - 1] ?? CURRENT_WEEK;
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
