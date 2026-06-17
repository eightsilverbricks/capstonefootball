// ─── useCompetitionData — thin data-access layer for The Clark Competition ─────
// Wraps mock fixtures + ephemeral local state behind a single interface so a
// later phase can replace the internals with real API calls without touching
// any UI. A module-level store keeps locked picks / challenges alive across
// route changes within a session (same pattern as usePredictions' cache).

import { useSyncExternalStore } from 'react';
import { CompetitionGame, FactorChallenge, Pick } from '@/competition/types';
import {
  COMPETITION_GAMES,
  CURRENT_WEEK,
  MOCK_CHALLENGES,
  MOCK_USERS,
  MOCK_LEAGUES,
} from '@/mocks/competitionFixtures';

interface Store {
  /** Live "you" picks for the current week, keyed by gameId. */
  picks: Record<string, Pick>;
  lockedWeeks: Set<number>;
  challenges: FactorChallenge[];
}

function seedPicks(): Record<string, Pick> {
  const out: Record<string, Pick> = {};
  for (const g of COMPETITION_GAMES) {
    if (g.week === CURRENT_WEEK) out[g.gameId] = { ...g.you };
  }
  return out;
}

let store: Store = {
  picks: seedPicks(),
  lockedWeeks: new Set<number>(),
  challenges: MOCK_CHALLENGES.map(c => ({ ...c })),
};

const listeners = new Set<() => void>();
function emit() {
  store = { ...store }; // new identity for getSnapshot equality
  listeners.forEach(l => l());
}
function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
function getSnapshot(): Store {
  return store;
}

// ─── Mutations ────────────────────────────────────────────────────────────────
function setPick(gameId: string, pick: Pick) {
  store.picks = { ...store.picks, [gameId]: pick };
  emit();
}

function lockWeek(week: number) {
  store.lockedWeeks = new Set(store.lockedWeeks).add(week);
  emit();
}

function addChallenge(gameId: string, factorName: string, text: string) {
  const id = `c-local-${Date.now()}`;
  const entry: FactorChallenge = {
    id, gameId, factorName,
    submitter: 'You', avatar: '🙂',
    text, upvotes: 1, isTopChallenge: false,
  };
  store.challenges = recomputeTopChallenges([...store.challenges, entry]);
  emit();
}

function upvoteChallenge(id: string) {
  store.challenges = recomputeTopChallenges(
    store.challenges.map(c => (c.id === id ? { ...c, upvotes: c.upvotes + 1 } : c)),
  );
  emit();
}

function recomputeTopChallenges(list: FactorChallenge[]): FactorChallenge[] {
  const topId = new Map<string, string>();
  for (const c of list) {
    const key = `${c.gameId}::${c.factorName}`;
    const cur = topId.get(key);
    const curVotes = cur ? list.find(x => x.id === cur)!.upvotes : -1;
    if (c.upvotes > curVotes) topId.set(key, c.id);
  }
  return list.map(c => ({ ...c, isTopChallenge: topId.get(`${c.gameId}::${c.factorName}`) === c.id }));
}

// ─── Public hook ──────────────────────────────────────────────────────────────
export interface CompetitionData {
  /** All games, with current-week "you" picks reflecting live local edits. */
  games: CompetitionGame[];
  currentWeek: number;
  currentWeekGames: CompetitionGame[];
  /** Most recent fully-settled week (for the Weekly Recap). */
  lastSettledWeek: number;
  settledGamesThrough: (week: number) => CompetitionGame[];
  isWeekLocked: (week: number) => boolean;
  setPick: (gameId: string, pick: Pick) => void;
  lockWeek: (week: number) => void;
  users: typeof MOCK_USERS;
  leagues: typeof MOCK_LEAGUES;
  challengesFor: (gameId: string, factorName: string) => FactorChallenge[];
  addChallenge: (gameId: string, factorName: string, text: string) => void;
  upvoteChallenge: (id: string) => void;
}

export function useCompetitionData(): CompetitionData {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  // Merge live "you" picks into the current-week games.
  const games: CompetitionGame[] = COMPETITION_GAMES.map(g => {
    const live = snap.picks[g.gameId];
    return live && g.week === CURRENT_WEEK ? { ...g, you: live } : g;
  });

  const currentWeekGames = games.filter(g => g.week === CURRENT_WEEK);
  const settledWeeks = [...new Set(games.filter(g => g.resolved).map(g => g.week))];
  const lastSettledWeek = settledWeeks.length ? Math.max(...settledWeeks) : CURRENT_WEEK - 1;

  return {
    games,
    currentWeek: CURRENT_WEEK,
    currentWeekGames,
    lastSettledWeek,
    settledGamesThrough: (week: number) => games.filter(g => g.resolved && g.week <= week),
    isWeekLocked: (week: number) => snap.lockedWeeks.has(week),
    setPick,
    lockWeek,
    users: MOCK_USERS,
    leagues: MOCK_LEAGUES,
    challengesFor: (gameId: string, factorName: string) =>
      snap.challenges
        .filter(c => c.gameId === gameId && c.factorName === factorName)
        .sort((a, b) => b.upvotes - a.upvotes),
    addChallenge,
    upvoteChallenge,
  };
}
