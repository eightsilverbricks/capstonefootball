// ─── useFanIdentity — favorite-team scaffolding, device-local only ─────────────
// Product-overhaul Phase 5: capture a favorite team so future fanbase-level
// insights ("Packers fans have been the most accurate") have something to key
// off of. This is NOT the real persistence layer — it's localStorage on this
// device only, no sync, no backend.
//
// Once someone has an account (see src/auth/), the profile's favoriteTeam is the
// source of truth and useAuth mirrors it down here on sign-in / profile update,
// so every team-colored surface keeps working the same way for signed-out
// visitors and signed-in members alike.

import { useCallback, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'clark-index:fan-team';

function readTeam(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null; // localStorage unavailable (private browsing, etc.) — fail quiet, no crash
  }
}

const listeners = new Set<() => void>();

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function emit(): void {
  listeners.forEach((l) => l());
}

/** Module-level setter so non-hook code (useAuth) can mirror the profile team. */
export function setFanTeam(team: string): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, team);
  } catch {
    // localStorage unavailable — selection just won't persist this session
  }
  emit();
}

/** Module-level clear, used on sign-out. */
export function clearFanTeam(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // no-op
  }
  emit();
}

export interface FanIdentityData {
  team: string | null;
  setTeam: (team: string) => void;
  clearTeam: () => void;
}

export function useFanIdentity(): FanIdentityData {
  const team = useSyncExternalStore(subscribe, readTeam, () => null);

  const setTeam = useCallback((next: string) => setFanTeam(next), []);
  const clearTeam = useCallback(() => clearFanTeam(), []);

  return { team, setTeam, clearTeam };
}
