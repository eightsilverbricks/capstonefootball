// ─── useUserPicks — ephemeral "who do you have?" store ────────────────────────
// Same pattern as useCompetitionData: a module-level store over useSyncExternalStore,
// alive for the browser session only. No persistence yet — see product-overhaul
// Phase 5/6 for the planned real backend. Keyed by gameKey() so both the homepage
// GameCard and the game page read/write the same pick.

import { useSyncExternalStore } from 'react';

export interface UserPick {
  team: string;
  confidence: number; // 0.5–1.0 (slider space)
  /** The user's favorite team at pick time (from useFanIdentity), or null. */
  fanTeam?: string | null;
}

let store: Record<string, UserPick> = {};
const listeners = new Set<() => void>();

function emit(): void {
  store = { ...store };
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot(): Record<string, UserPick> {
  return store;
}

function setUserPick(key: string, pick: UserPick): void {
  store = { ...store, [key]: pick };
  emit();
}

export interface UserPicksData {
  picks: Record<string, UserPick>;
  setPick: (key: string, pick: UserPick) => void;
}

export function useUserPicks(): UserPicksData {
  const picks = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return { picks, setPick: setUserPick };
}
