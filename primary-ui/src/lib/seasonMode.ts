// ─── Demo mode persistence ───────────────────────────────────────────────────
// Device-local by design: demo mode is a way to look around before the season
// starts, not a property of the account. Keeping it out of the profile also
// means it works signed-out and needs no schema change.

import { SeasonMode } from './season';

const STORAGE_KEY = 'clark-index:season-mode';

export function readSeasonMode(): SeasonMode {
  if (typeof window === 'undefined') return 'live';
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'demo' ? 'demo' : 'live';
  } catch {
    // Private browsing and blocked storage both throw here. Falling back to the
    // live season is the safe default — never strand someone in demo data.
    return 'live';
  }
}

export function writeSeasonMode(mode: SeasonMode): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // Non-fatal: the toggle still applies for this session via React state.
  }
}
