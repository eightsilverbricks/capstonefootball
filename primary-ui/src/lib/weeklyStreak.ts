// ─── Weekly streak (§8) ──────────────────────────────────────────────────────
// One or more picks in a week keeps the streak going. A missed week is covered
// by a streak freeze when one is banked; a freeze is earned back 4 weeks after
// the last one was used. The week in progress never breaks the streak, but
// from Friday on it is "at risk" until you pick something.

export const FREEZE_EVERY_WEEKS = 4;
const FRIDAY = 5;

export interface WeeklyStreak {
  weeks: number;
  freezeReady: boolean;
  frozenWeeks: number[];
  atRisk: boolean;
}

/**
 * @param pickedWeeks weeks with at least one pick
 * @param currentWeek the week being played now
 */
export function weeklyStreak(pickedWeeks: Set<number>, currentWeek: number, now: Date = new Date()): WeeklyStreak {
  let weeks = 0;
  let freezeReady = true;
  let lastFreeze = -Infinity;
  const frozenWeeks: number[] = [];

  for (let w = 1; w < currentWeek; w += 1) {
    if (!freezeReady && w - lastFreeze >= FREEZE_EVERY_WEEKS) freezeReady = true;
    if (pickedWeeks.has(w)) { weeks += 1; continue; }
    if (weeks > 0 && freezeReady) {
      freezeReady = false;
      lastFreeze = w;
      frozenWeeks.push(w);
      continue;
    }
    weeks = 0;
  }
  if (!freezeReady && currentWeek - lastFreeze >= FREEZE_EVERY_WEEKS) freezeReady = true;
  const pickedNow = pickedWeeks.has(currentWeek);
  if (pickedNow) weeks += 1;
  const atRisk = !pickedNow && weeks > 0 && now.getDay() >= FRIDAY;
  return { weeks, freezeReady, frozenWeeks, atRisk };
}
