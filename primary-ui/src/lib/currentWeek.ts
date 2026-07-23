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

const PLAYOFF_TITLES: Record<number, string> = {
  19: 'WILD CARD', 20: 'DIVISIONAL', 21: 'CONFERENCE', 22: 'SUPER BOWL',
};

/** Display masthead label for a week number (e.g. "WEEK 1", "DIVISIONAL"). */
export function weekTitle(week: number): string {
  return PLAYOFF_TITLES[week] ?? `WEEK ${week}`;
}
