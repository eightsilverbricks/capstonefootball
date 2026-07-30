// ─── localAuthClient — the device-local stand-in for real auth ────────────────
// This is a MOCK. It exists so the whole signed-out → sign-up → signed-in
// product flow is real and testable today; the Supabase backend replaces it
// wholesale (see types.ts). Two things to be clear about:
//
//   1. There is NO server. Accounts live in this browser's localStorage and
//      nowhere else. Clearing site data deletes them.
//   2. Passwords are never stored in plaintext — each account keeps a random
//      salt plus a SHA-256 digest. That is *not* a real credential-security
//      posture (no KDF, no rate limiting, all client-side); it exists so this
//      file never normalizes writing a password down. Real security arrives
//      with Supabase.

import { v4 as uuidv4 } from 'uuid';
import {
  AuthClient,
  AuthError,
  AuthResult,
  ClarkProfile,
  ProfilePatch,
  SignInInput,
  SignUpInput,
} from './types';

const ACCOUNTS_KEY = 'clark-index:accounts:v1';
const SESSION_KEY = 'clark-index:session:v1';

export const MIN_PASSWORD_LENGTH = 8;
export const MAX_DISPLAY_NAME_LENGTH = 32;

interface StoredAccount {
  profile: ClarkProfile;
  salt: string;
  digest: string;
}

// ─── Storage adapter — falls back to memory when localStorage is unavailable ──
// (Safari private mode, embedded webviews, tests without jsdom storage.)
const memoryStore = new Map<string, string>();

function readRaw(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return memoryStore.get(key) ?? null;
  }
}

function writeRaw(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    memoryStore.set(key, value);
  }
}

function removeRaw(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    memoryStore.delete(key);
  }
}

function readAccounts(): StoredAccount[] {
  const raw = readRaw(ACCOUNTS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as StoredAccount[]) : [];
  } catch {
    // Corrupt store — start clean rather than trapping the user in an error.
    return [];
  }
}

function writeAccounts(accounts: StoredAccount[]): void {
  writeRaw(ACCOUNTS_KEY, JSON.stringify(accounts));
}

// ─── Password digest ──────────────────────────────────────────────────────────

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function randomSalt(): string {
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return toHex(bytes);
}

/**
 * Non-cryptographic fallback used only when SubtleCrypto is missing (non-secure
 * context, old webview). Keeps the mock working; offers no real protection.
 */
function weakDigest(input: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h2 = Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  return `weak:${((h2 >>> 0) * 4294967296 + (h1 >>> 0)).toString(16)}`;
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const material = `clark-index:${salt}:${password}`;
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(material));
    return toHex(new Uint8Array(buffer));
  }
  return weakDigest(material);
}

/** Constant-time-ish comparison. Cheap insurance; the real gate is server-side. */
function digestsMatch(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// ─── Validation ───────────────────────────────────────────────────────────────

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validateSignUp(input: SignUpInput, accounts: StoredAccount[]): AuthError | null {
  const displayName = input.displayName.trim();
  if (displayName.length < 2) {
    return { message: 'Give us a name to put on the leaderboard.', field: 'displayName' };
  }
  if (displayName.length > MAX_DISPLAY_NAME_LENGTH) {
    return { message: `Keep it under ${MAX_DISPLAY_NAME_LENGTH} characters.`, field: 'displayName' };
  }
  if (!EMAIL_PATTERN.test(input.email.trim())) {
    return { message: "That email doesn't look right.", field: 'email' };
  }
  if (accounts.some((a) => a.profile.email === normalizeEmail(input.email))) {
    return { message: 'An account already uses that email — sign in instead.', field: 'email' };
  }
  if (input.password.length < MIN_PASSWORD_LENGTH) {
    return {
      message: `Passwords need at least ${MIN_PASSWORD_LENGTH} characters.`,
      field: 'password',
    };
  }
  return null;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** '@Zane Wolf' → 'zanewolf', de-duplicated against existing handles. */
function deriveHandle(displayName: string, accounts: StoredAccount[]): string {
  const base = displayName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 16) || 'fan';
  const taken = new Set(accounts.map((a) => a.profile.handle));
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}${n}`)) n++;
  return `${base}${n}`;
}

// ─── Session store ────────────────────────────────────────────────────────────

const listeners = new Set<() => void>();

function hydrateSession(): ClarkProfile | null {
  const rawId = readRaw(SESSION_KEY);
  if (!rawId) return null;
  const account = readAccounts().find((a) => a.profile.id === rawId);
  return account ? account.profile : null;
}

// Cached so getSnapshot() returns a stable identity — required by
// useSyncExternalStore, which compares by reference on every render.
let currentUser: ClarkProfile | null = hydrateSession();
let currentSession = currentUser ? { user: currentUser } : null;

function setCurrentUser(user: ClarkProfile | null): void {
  currentUser = user;
  currentSession = user ? { user } : null;
  if (user) {
    writeRaw(SESSION_KEY, user.id);
  } else {
    removeRaw(SESSION_KEY);
  }
  listeners.forEach((l) => l());
}

// ─── Client ───────────────────────────────────────────────────────────────────

export const localAuthClient: AuthClient = {
  getSession() {
    return currentSession;
  },

  async signUp(input: SignUpInput): Promise<AuthResult> {
    const accounts = readAccounts();
    const invalid = validateSignUp(input, accounts);
    if (invalid) return { session: null, error: invalid };

    const displayName = input.displayName.trim();
    const salt = randomSalt();
    const profile: ClarkProfile = {
      id: uuidv4(),
      handle: deriveHandle(displayName, accounts),
      displayName,
      email: normalizeEmail(input.email),
      favoriteTeam: input.favoriteTeam,
      createdAt: new Date().toISOString(),
    };

    writeAccounts([...accounts, { profile, salt, digest: await hashPassword(input.password, salt) }]);
    setCurrentUser(profile);
    return { session: { user: profile }, error: null };
  },

  async signIn(input: SignInInput): Promise<AuthResult> {
    const account = readAccounts().find((a) => a.profile.email === normalizeEmail(input.email));
    // Same message for "no such email" and "wrong password" — don't confirm
    // which emails have accounts.
    const rejection: AuthError = { message: 'Email or password is incorrect.', field: 'password' };
    if (!account) return { session: null, error: rejection };

    const digest = await hashPassword(input.password, account.salt);
    if (!digestsMatch(digest, account.digest)) return { session: null, error: rejection };

    setCurrentUser(account.profile);
    return { session: { user: account.profile }, error: null };
  },

  async signOut() {
    setCurrentUser(null);
    return { error: null };
  },

  async updateProfile(patch: ProfilePatch): Promise<AuthResult> {
    if (!currentUser) {
      return { session: null, error: { message: 'You are not signed in.' } };
    }
    const accounts = readAccounts();
    const index = accounts.findIndex((a) => a.profile.id === currentUser!.id);
    if (index === -1) {
      return { session: null, error: { message: 'That account no longer exists on this device.' } };
    }

    const nextProfile: ClarkProfile = { ...accounts[index].profile, ...patch };
    writeAccounts(accounts.map((a, i) => (i === index ? { ...a, profile: nextProfile } : a)));
    setCurrentUser(nextProfile);
    return { session: { user: nextProfile }, error: null };
  },

  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

/** Test-only: wipe every account and the active session. */
export function __resetLocalAuthForTests(): void {
  removeRaw(ACCOUNTS_KEY);
  setCurrentUser(null);
}
