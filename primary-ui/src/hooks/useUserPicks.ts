// ─── useUserPicks — the user's picks, per account ─────────────────────────────
// Picks ARE the product: record, streak, Clark Differential, My Season and the
// whole Clark Competition are derived from this store. Where they're stored is
// picksRepository's problem (Supabase when configured, localStorage otherwise);
// this module owns the synchronous cache components render from.
//
// Writes are optimistic: the cache updates immediately so the UI never waits on
// a round trip, and the repository persists in the background.
//
// Signed-out visitors get no bucket at all. They can still drag the slider and
// read everything; the moment they commit, the pick is stashed and replayed
// once they have an account (see stashPendingPick).

import { useCallback, useSyncExternalStore } from 'react';
import { localAuthClient } from '@/auth/localAuthClient';
import { supabaseAuthClient } from '@/auth/supabaseAuthClient';
import { isSupabaseConfigured } from '@/auth/supabaseClient';
import { deletePick, loadPicks, savePick, PickMap, UserPick } from '@/data/picksRepository';
import { invalidateFanSentiment } from '@/hooks/useFanSentiment';

export type { UserPick } from '@/data/picksRepository';

const authClient = isSupabaseConfigured ? supabaseAuthClient : localAuthClient;

const EMPTY: PickMap = {};

let activeUserId: string | null = null;
let store: PickMap = EMPTY;
/** A pick made before signing up, replayed the moment an account exists. */
let pendingPick: { key: string; pick: UserPick } | null = null;

const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((l) => l());
}

/**
 * Point the store at whichever account is signed in. Runs on every auth change,
 * so signing out empties the board and signing back in restores that account's
 * season — from the server, on any device.
 */
async function syncToSession(): Promise<void> {
  const nextId = authClient.getSession()?.user.id ?? null;
  if (nextId === activeUserId) return;

  activeUserId = nextId;
  store = EMPTY;
  emit(); // clear immediately; don't show the previous account's picks while loading

  if (!nextId) return;

  const loaded = await loadPicks(nextId);
  // Guard against a fast sign-out/sign-in landing an out-of-date response.
  if (activeUserId !== nextId) return;
  store = loaded;

  // Someone picked, then signed up to make it count — honor that pick.
  if (pendingPick) {
    const { key, pick } = pendingPick;
    pendingPick = null;
    store = { ...store, [key]: pick };
    void savePick(nextId, key, pick, store).then(invalidateFanSentiment);
  }

  emit();
}

authClient.subscribe(() => { void syncToSession(); });
void syncToSession();

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function getSnapshot(): PickMap {
  return store;
}

function setUserPick(key: string, pick: UserPick): void {
  if (!activeUserId) {
    // No account yet — hold it until there is one.
    pendingPick = { key, pick };
    return;
  }
  store = { ...store, [key]: pick };
  emit();
  // Your own pick is part of the community split — re-read it once the write
  // lands so the percentage you're looking at includes you.
  void savePick(activeUserId, key, pick, store).then(invalidateFanSentiment);
}

function clearUserPick(key: string): void {
  if (!activeUserId || !(key in store)) return;
  const next = { ...store };
  delete next[key];
  store = next;
  emit();
  void deletePick(activeUserId, key, store).then(invalidateFanSentiment);
}

/**
 * Remember a pick made while signed out so it can be applied the instant the
 * account exists. Callers should open the sign-up dialog right after.
 */
export function stashPendingPick(key: string, pick: UserPick): void {
  pendingPick = { key, pick };
}

/** Test-only: drop every pick and forget the active account. */
export function __resetPicksForTests(): void {
  if (activeUserId) {
    try {
      window.localStorage.removeItem(`clark-index:picks:v1:${activeUserId}`);
    } catch {
      // ignore
    }
  }
  activeUserId = null;
  store = EMPTY;
  pendingPick = null;
  emit();
}

export interface UserPicksData {
  picks: PickMap;
  setPick: (key: string, pick: UserPick) => void;
  /** Undo a pick entirely — returns the game to its unpicked state. */
  clearPick: (key: string) => void;
}

export function useUserPicks(): UserPicksData {
  const picks = useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);

  const setPick = useCallback((key: string, pick: UserPick) => setUserPick(key, pick), []);
  const clearPick = useCallback((key: string) => clearUserPick(key), []);

  return { picks, setPick, clearPick };
}
