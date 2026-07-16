// ─── useFanIdentity — favorite-team scaffolding, device-local only ─────────────
// Product-overhaul Phase 5: capture a favorite team so future fanbase-level
// insights ("Packers fans have been the most accurate") have something to key
// off of. This is NOT the real persistence layer — it's localStorage on this
// device only, no account, no sync, no backend. Wiring it to a real account
// system is a later, explicitly-scoped piece of work.

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

export interface FanIdentityData {
  team: string | null;
  setTeam: (team: string) => void;
  clearTeam: () => void;
}

export function useFanIdentity(): FanIdentityData {
  const team = useSyncExternalStore(subscribe, readTeam, () => null);

  const setTeam = useCallback((next: string) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // localStorage unavailable — selection just won't persist this session
    }
    emit();
  }, []);

  const clearTeam = useCallback(() => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // no-op
    }
    emit();
  }, []);

  return { team, setTeam, clearTeam };
}
