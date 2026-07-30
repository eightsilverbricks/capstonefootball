// ─── Auth contract ────────────────────────────────────────────────────────────
// Deliberately shaped like the slice of supabase-js we'll actually use, so
// swapping the local mock for a real backend is a one-file change
// (localAuthClient.ts → supabaseAuthClient.ts) plus the import in useAuth.ts.
// Nothing outside src/auth/ knows which implementation is live.

/** The account record the whole app reads. Mirrors the planned `profiles` row. */
export interface ClarkProfile {
  id: string;
  /** @handle, lowercase, unique per device store. Used on share cards + standings. */
  handle: string;
  displayName: string;
  email: string;
  /** NFL team abbreviation (e.g. 'BUF'), or null if they skipped it. */
  favoriteTeam: string | null;
  /** ISO timestamp — drives "member since" and the season-joined badge. */
  createdAt: string;
}

export interface AuthSession {
  user: ClarkProfile;
}

export interface AuthError {
  message: string;
  /** Field this error belongs to, when it maps to one input. */
  field?: 'email' | 'password' | 'displayName' | 'handle' | 'favoriteTeam';
}

export interface AuthResult {
  session: AuthSession | null;
  error: AuthError | null;
}

export interface SignUpInput {
  email: string;
  password: string;
  displayName: string;
  favoriteTeam: string | null;
}

export interface SignInInput {
  email: string;
  password: string;
}

export type ProfilePatch = Partial<Pick<ClarkProfile, 'displayName' | 'favoriteTeam' | 'handle'>>;

export interface AuthClient {
  /** Synchronous read of the hydrated session — safe to call during render. */
  getSession(): AuthSession | null;
  signUp(input: SignUpInput): Promise<AuthResult>;
  signIn(input: SignInInput): Promise<AuthResult>;
  signOut(): Promise<{ error: AuthError | null }>;
  updateProfile(patch: ProfilePatch): Promise<AuthResult>;
  /** Subscribe to session changes. Returns an unsubscribe function. */
  subscribe(listener: () => void): () => void;
}
