import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { localAuthClient, __resetLocalAuthForTests } from '@/auth/localAuthClient';
import { useUserPicks, stashPendingPick, __resetPicksForTests } from './useUserPicks';

/** The picks actually written to disk for whoever is signed in. */
function storedPicks(userId?: string) {
  const id = userId ?? localAuthClient.getSession()?.user.id;
  const raw = id ? window.localStorage.getItem(`clark-index:picks:v1:${id}`) : null;
  return raw ? JSON.parse(raw) : {};
}

/** The same setPick/clearPick the components call. */
function picks() {
  return renderHook(() => useUserPicks()).result.current;
}

const signUp = (email: string, displayName: string) =>
  localAuthClient.signUp({ email, password: 'longenoughpw', displayName, favoriteTeam: null });

const signIn = (email: string) =>
  localAuthClient.signIn({ email, password: 'longenoughpw' });

describe('useUserPicks', () => {
  beforeEach(() => {
    __resetPicksForTests();
    __resetLocalAuthForTests();
    window.localStorage.clear();
  });

  it('persists a pick so it survives a reload', async () => {
    await signUp('zane@example.com', 'Zane Wolf');
    picks().setPick('2024_01_ARI_BUF', { team: 'BUF', confidence: 0.8, fanTeam: 'BUF' });

    expect(storedPicks()['2024_01_ARI_BUF']).toMatchObject({ team: 'BUF', confidence: 0.8 });
  });

  it('exposes the stored picks through the hook', async () => {
    await signUp('zane@example.com', 'Zane Wolf');
    picks().setPick('g1', { team: 'BUF', confidence: 0.8 });

    expect(picks().picks.g1).toMatchObject({ team: 'BUF', confidence: 0.8 });
  });

  it("keeps each account's season separate on a shared device", async () => {
    await signUp('zane@example.com', 'Zane Wolf');
    const zaneId = localAuthClient.getSession()!.user.id;
    picks().setPick('g1', { team: 'BUF', confidence: 0.9 });
    await localAuthClient.signOut();

    await signUp('nicholas@example.com', 'Nicholas Chan');
    picks().setPick('g1', { team: 'NYG', confidence: 0.7 });

    expect(storedPicks().g1.team).toBe('NYG');
    expect(storedPicks(zaneId).g1.team).toBe('BUF');
  });

  it('shows an empty board while signed out', async () => {
    await signUp('zane@example.com', 'Zane Wolf');
    picks().setPick('g1', { team: 'BUF', confidence: 0.9 });

    await localAuthClient.signOut();
    expect(picks().picks).toEqual({});
  });

  it('restores the right season when switching back between accounts', async () => {
    await signUp('zane@example.com', 'Zane Wolf');
    picks().setPick('g1', { team: 'BUF', confidence: 0.9 });
    await localAuthClient.signOut();

    await signUp('nicholas@example.com', 'Nicholas Chan');
    await localAuthClient.signOut();

    await signIn('zane@example.com');
    expect(picks().picks.g1.team).toBe('BUF');
  });

  it('replays a pick made before the account existed', async () => {
    stashPendingPick('g1', { team: 'KC', confidence: 0.85 });
    expect(localAuthClient.getSession()).toBeNull();

    await signUp('newfan@example.com', 'New Fan');

    expect(storedPicks().g1).toMatchObject({ team: 'KC', confidence: 0.85 });
    expect(picks().picks.g1.team).toBe('KC');
  });

  it('drops a pick made while signed out if no account follows', async () => {
    // Nothing is written anywhere until there's an account to own it.
    picks().setPick('g1', { team: 'KC', confidence: 0.85 });
    expect(picks().picks).toEqual({});
  });

  it('clearPick removes the pick from storage', async () => {
    await signUp('zane@example.com', 'Zane Wolf');
    picks().setPick('g1', { team: 'BUF', confidence: 0.9 });
    expect(storedPicks().g1).toBeDefined();

    picks().clearPick('g1');
    expect(storedPicks().g1).toBeUndefined();
    expect(picks().picks.g1).toBeUndefined();
  });

  it('recovers from corrupt stored data instead of crashing', async () => {
    await signUp('zane@example.com', 'Zane Wolf');
    const id = localAuthClient.getSession()!.user.id;
    await localAuthClient.signOut();

    window.localStorage.setItem(`clark-index:picks:v1:${id}`, 'not json at all');
    await signIn('zane@example.com');

    expect(picks().picks).toEqual({});
    expect(() => picks().setPick('g1', { team: 'BUF', confidence: 0.8 })).not.toThrow();
    expect(storedPicks().g1.team).toBe('BUF');
  });
});
