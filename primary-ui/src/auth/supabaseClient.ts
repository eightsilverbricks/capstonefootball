// ─── Supabase client ──────────────────────────────────────────────────────────
// The single browser client. Both the anon key and the URL are public by
// design — every table is protected by row level security (see
// supabase/schema.sql), which is what actually keeps one account out of
// another's data. Never put the service_role key in this app.

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * True once both env vars are set. Everything auth- and picks-related routes
 * through this: configured means real accounts, unconfigured means the local
 * development fallback. There is no half-configured state.
 */
export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, anonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

/** Narrowing helper so call sites don't repeat the null check. */
export function requireSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
    );
  }
  return supabase;
}
