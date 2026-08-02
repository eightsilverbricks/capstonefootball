// ─── useUserPicks — the user's picks, persisted per account ───────────────────
// Picks ARE the product: record, streak, Clark Differential, My Season and the
// whole Clark Competition are derived from this store. So it persists, and it
// persists *per account* — two people signing in on the same laptop must never
// see each other's season.
//
// Storage is localStorage under `clark-index:picks:v1:<userId>`, which means it
// is still device-local (see [[project_clark_index]] — no server yet). Signing
// in on another machine starts an empty season until the Supabase backend
// lands, at which point this module's read/write pair is what moves server-side.
//
// Signed-out visitors get no bucket at all. They can still drag the slider and
// read everything; the moment they commit, the pick is stashed and replayed
// once they have an account (see stashPendingPick).

import { useCallback, useSyncExternalStore } from 'react';
import { localAuthClient } from '@/auth/localAuthClient';

export interface UserPick {
  team: string;
  confidence: number; // 0.5–1.0 (slider space)
  /** The user's favorite team at pick time (from useFanIdentity), or null. */
  fanTeam?: string | null;
}

const STORAGE_PREFIX = 'clark-index:picks:v1:';

type PickMap = Record<string, UserPick>;

const EMPTY: PickMap = {};

let activeUserId: string | null = null;
let store: PickMap = EMPTY;
/** A pick made before signing up, replayed the moment an account exists. */
let pendingPick: { key: string; pick: UserPick } | null = null;

const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((l) => l());
}

function storageKey(userId: string): string {
  return `${STORAGE_PREFIX}${userId}`;
}

function readBucket(userId: string): PickMap {
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw);
    // Guard against hand-edited or corrupt storage rather than crashing render.
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return EMPTY;
    return parsed as PickMap;
  } catch {
    return EMPTY;
  }
}

function writeBucket(): void {
  if (!activeUserId) return;
  try {
    window.localStorage.setItem(storageKey(activeUserId), JSON.stringify(store));
  } catch {
    // Storage full or unavailable — the in-memory store still works this session.
  }
}

/**
 * Point the store at whichever account is currently signed in. Called on every
 * auth change, so signing out empties the board and signing back in restores
 * exactly that account's season.
 */
function syncToSession(): void {
  const nextId = localAuthClient.getSession()?.user.id ?? null;
  if (nextId === activeUserId) return;

  activeUserId = nextId;
  store = nextId ? readBucket(nextId) : EMPTY;

  // Someone picked, then signed up to make it count — honor that pick.
  if (nextId && pendingPick) {
    store = { ...store, [pendingPick.key]: pendingPick.pick };
    pendingPick = null;
    writeBucket();
  }

  emit();
}

localAuthClient.subscribe(syncToSession);
syncToSession();

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
  writeBucket();
  emit();
}

function clearUserPick(key: string): void {
  if (!activeUserId || !(key in store)) return;
  const next = { ...store };
  delete next[key];
  store = next;
  writeBucket();
  emit();
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
      window.localStorage.removeItem(storageKey(activeUserId));
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
