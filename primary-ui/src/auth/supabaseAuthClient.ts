// ─── supabaseAuthClient — real accounts ───────────────────────────────────────
// Implements the same AuthClient contract as localAuthClient, so nothing
// outside src/auth/ changes when this becomes the live client. Differences that
// matter:
//
//   • Passwords are handled entirely by Supabase Auth (bcrypt, server-side).
//     This file never sees, stores, or hashes one.
//   • The profile row is created by a database trigger, not here, so an account
//     can never exist without its profile.
//   • Sessions survive across devices and browsers, unlike the local fallback.

import type { Session } from '@supabase/supabase-js';
import { AuthClient, AuthError, AuthResult, ClarkProfile, ProfilePatch, SignInInput, SignUpInput } from './types';
import { isSupabaseConfigured, requireSupabase } from './supabaseClient';

/**
 * A request that never settles is indistinguishable from a broken button, so
 * every auth call races a clock. Generous enough not to fire on a slow phone
 * connection; short enough that a stall becomes a message rather than a
 * spinner someone stares at.
 */
const AUTH_TIMEOUT_MS = 15_000;

class AuthTimeoutError extends Error {}

function withTimeout<T>(promise: PromiseLike<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new AuthTimeoutError()), AUTH_TIMEOUT_MS);
    Promise.resolve(promise).then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

/** Turns a thrown network/timeout failure into the shape the dialog renders. */
function failureResult(error: unknown): AuthResult {
  if (error instanceof AuthTimeoutError) {
    return {
      session: null,
      error: { message: "That took too long — check your connection and try again." },
    };
  }
  return {
    session: null,
    error: { message: "Couldn't reach the server. Check your connection and try again." },
  };
}

interface ProfileRow {
  id: string;
  handle: string;
  display_name: string;
  favorite_team: string | null;
  created_at: string;
}

function toProfile(row: ProfileRow, email: string): ClarkProfile {
  return {
    id: row.id,
    handle: row.handle,
    displayName: row.display_name,
    email,
    favoriteTeam: row.favorite_team,
    createdAt: row.created_at,
  };
}

/** Supabase's messages are written for developers; these are for fans. */
function friendlyError(message: string): AuthError {
  const lower = message.toLowerCase();
  if (lower.includes('already registered') || lower.includes('already been registered')) {
    return { message: 'An account already uses that email — sign in instead.', field: 'email' };
  }
  if (lower.includes('invalid login credentials')) {
    return { message: 'Email or password is incorrect.', field: 'password' };
  }
  if (lower.includes('password')) {
    return { message, field: 'password' };
  }
  if (lower.includes('email')) {
    return { message, field: 'email' };
  }
  return { message };
}

// ── Session cache ────────────────────────────────────────────────────────────
// getSession() must be synchronous (useSyncExternalStore calls it during
// render), but Supabase's profile lookup is async. So the profile is cached
// here and refreshed whenever auth state changes.

let currentSession: { user: ClarkProfile } | null = null;
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((l) => l());
}

function setSession(next: { user: ClarkProfile } | null): void {
  currentSession = next;
  emit();
}

async function loadProfile(userId: string, email: string): Promise<ClarkProfile | null> {
  const { data, error } = await requireSupabase()
    .from('profiles')
    .select('id, handle, display_name, favorite_team, created_at')
    .eq('id', userId)
    .single();

  if (error || !data) return null;
  return toProfile(data as ProfileRow, email);
}

/** Load the profile behind an auth session and publish it, or clear the session. */
async function hydrateFrom(session: Session | null): Promise<void> {
  const authUser = session?.user;
  if (!authUser) {
    setSession(null);
    return;
  }
  const profile = await loadProfile(authUser.id, authUser.email ?? '');
  setSession(profile ? { user: profile } : null);
}

/**
 * Wire up session hydration. Called once at module load when Supabase is the
 * live client; safe to call again (listeners are replaced, not stacked).
 */
function initialise(): void {
  const client = requireSupabase();

  void client.auth.getSession().then(({ data }) => hydrateFrom(data.session));

  // The handler passed to onAuthStateChange MUST stay synchronous.
  // supabase-js holds an internal lock for as long as the callback runs, and
  // every PostgREST request needs that same lock to attach the access token —
  // so awaiting a query in here deadlocks: the profile fetch waits on a lock
  // the callback is still holding. That is what made sign-in spin forever on
  // "One second…" instead of ever resolving. Deferring to a macrotask lets the
  // lock release before the profile is fetched.
  client.auth.onAuthStateChange((_event, session) => {
    setTimeout(() => {
      void hydrateFrom(session);
    }, 0);
  });
}

// Guarded: this module is imported unconditionally by useAuth so it can choose
// between clients, but it must not throw when Supabase isn't configured.
if (isSupabaseConfigured) initialise();

export const supabaseAuthClient: AuthClient = {
  getSession() {
    return currentSession;
  },

  async signUp(input: SignUpInput): Promise<AuthResult> {
    const displayName = input.displayName.trim();
    if (displayName.length < 2) {
      return { session: null, error: { message: 'Give us a name to put on the leaderboard.', field: 'displayName' } };
    }

    // The handle and profile row are derived from this metadata by the
    // on_auth_user_created trigger — see supabase/schema.sql.
    try {
      const { data, error } = await withTimeout(requireSupabase().auth.signUp({
        email: input.email.trim(),
        password: input.password,
        options: {
          data: {
            display_name: displayName,
            favorite_team: input.favoriteTeam ?? '',
          },
        },
      }));

      if (error) return { session: null, error: friendlyError(error.message) };

      // Gate on the session, not the user. With email confirmation enabled
      // Supabase still returns a `user` here, but no session — and a profile
      // row is publicly readable, so trusting `user` would hand back a
      // signed-in-looking session that carries no auth. Every RLS-protected
      // write would then fail, and the session would vanish on reload.
      const authUser = data.session?.user;
      if (!authUser) {
        return {
          session: null,
          error: { message: 'Check your email to confirm your account, then sign in.' },
        };
      }

      const profile = await withTimeout(loadProfile(authUser.id, authUser.email ?? input.email));
      if (!profile) {
        return { session: null, error: { message: 'Account created, but the profile did not. Try signing in.' } };
      }

      setSession({ user: profile });
      return { session: { user: profile }, error: null };
    } catch (err) {
      return failureResult(err);
    }
  },

  async signIn(input: SignInInput): Promise<AuthResult> {
    try {
      const { data, error } = await withTimeout(requireSupabase().auth.signInWithPassword({
        email: input.email.trim(),
        password: input.password,
      }));

      if (error) return { session: null, error: friendlyError(error.message) };

      const authUser = data.session?.user;
      if (!authUser) {
        return { session: null, error: { message: 'Email or password is incorrect.', field: 'password' } };
      }

      const profile = await withTimeout(loadProfile(authUser.id, authUser.email ?? input.email));
      if (!profile) return { session: null, error: { message: 'That account has no profile yet.' } };

      setSession({ user: profile });
      return { session: { user: profile }, error: null };
    } catch (err) {
      return failureResult(err);
    }
  },

  async signOut() {
    const { error } = await requireSupabase().auth.signOut();
    setSession(null);
    return { error: error ? { message: error.message } : null };
  },

  async updateProfile(patch: ProfilePatch): Promise<AuthResult> {
    if (!currentSession) return { session: null, error: { message: 'You are not signed in.' } };

    const row: Record<string, unknown> = {};
    if (patch.displayName !== undefined) row.display_name = patch.displayName;
    if (patch.favoriteTeam !== undefined) row.favorite_team = patch.favoriteTeam;
    if (patch.handle !== undefined) row.handle = patch.handle;

    const { data, error } = await requireSupabase()
      .from('profiles')
      .update(row)
      .eq('id', currentSession.user.id)
      .select('id, handle, display_name, favorite_team, created_at')
      .single();

    if (error || !data) {
      return { session: null, error: { message: error?.message ?? 'Could not save those changes.' } };
    }

    const profile = toProfile(data as ProfileRow, currentSession.user.email);
    setSession({ user: profile });
    return { session: { user: profile }, error: null };
  },

  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
