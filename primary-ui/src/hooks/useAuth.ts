// ─── useAuth — the app's single entry point to account state ──────────────────
// Every component reads auth through this hook, never through the client
// directly. That keeps the eventual Supabase migration to one import swap
// below, plus whatever async/loading states the real client introduces.

import { useCallback, useSyncExternalStore } from 'react';
import { localAuthClient } from '@/auth/localAuthClient';
import { AuthClient, AuthResult, ClarkProfile, ProfilePatch, SignInInput, SignUpInput } from '@/auth/types';
import { clearFanTeam, setFanTeam } from './useFanIdentity';

// ── Swap this line for the Supabase-backed client when the backend lands ──
const client: AuthClient = localAuthClient;

function getSnapshot() {
  return client.getSession();
}

function getServerSnapshot() {
  return null;
}

/** Keep the device-local fan-team mirror in step with the account profile. */
function mirrorFanTeam(result: AuthResult): AuthResult {
  const team = result.session?.user.favoriteTeam;
  if (team) setFanTeam(team);
  return result;
}

export interface AuthState {
  user: ClarkProfile | null;
  isSignedIn: boolean;
  signUp: (input: SignUpInput) => Promise<AuthResult>;
  signIn: (input: SignInInput) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  updateProfile: (patch: ProfilePatch) => Promise<AuthResult>;
}

export function useAuth(): AuthState {
  const session = useSyncExternalStore(client.subscribe, getSnapshot, getServerSnapshot);

  const signUp = useCallback(
    async (input: SignUpInput) => mirrorFanTeam(await client.signUp(input)),
    [],
  );

  const signIn = useCallback(
    async (input: SignInInput) => mirrorFanTeam(await client.signIn(input)),
    [],
  );

  const signOut = useCallback(async () => {
    await client.signOut();
    clearFanTeam();
  }, []);

  const updateProfile = useCallback(
    async (patch: ProfilePatch) => mirrorFanTeam(await client.updateProfile(patch)),
    [],
  );

  return {
    user: session?.user ?? null,
    isSignedIn: session != null,
    signUp,
    signIn,
    signOut,
    updateProfile,
  };
}
