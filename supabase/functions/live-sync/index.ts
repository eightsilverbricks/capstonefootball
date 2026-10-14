// ─── live-sync Edge Function ──────────────────────────────────────────────────
// Invoked every 15 seconds by Supabase Cron (migration 20261014010000). The
// cron job sends a bearer token generated inside the database and kept in
// Vault; check_live_sync_token() verifies it with the service role, so no
// secret has to be copied anywhere. Optional secrets
// (`npx supabase secrets set ...`):
//   GEMINI_API_KEY    optional — free-tier AI notes on big plays
//   GEMINI_MODEL      optional — defaults to gemini-2.5-flash-lite
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by the platform.
//
// Deploy without JWT verification (the bearer secret is the gate):
//   npx supabase functions deploy live-sync --no-verify-jwt

import { createClient } from 'jsr:@supabase/supabase-js@2';
import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import { runSync } from './sync.ts';
import type { Store } from './sync.ts';
import { aiNote } from './ai.ts';

function supabaseStore(db: SupabaseClient): Store {
  const fail = (what: string, error: { message: string } | null) => {
    if (error) throw new Error(`${what}: ${error.message}`);
  };
  return {
    async getNextCheckAt() {
      const { data, error } = await db.from('live_sync_state').select('next_check_at').eq('id', 1).maybeSingle();
      fail('read sync state', error);
      return data?.next_check_at ?? null;
    },
    async setNextCheckAt(iso) {
      const { error } = await db.from('live_sync_state').upsert({ id: 1, next_check_at: iso, updated_at: new Date().toISOString() });
      fail('write sync state', error);
    },
    async knownPlayIds(gameKey) {
      const { data, error } = await db.from('live_plays').select('play_id').eq('game_key', gameKey);
      fail('read plays', error);
      return new Set((data ?? []).map((r: { play_id: string }) => r.play_id));
    },
    async hasResult(gameKey) {
      const { data, error } = await db.from('results').select('game_key').eq('game_key', gameKey).maybeSingle();
      fail('read result', error);
      return data != null;
    },
    async upsertGame(row) {
      const { error } = await db.from('live_games').upsert({ ...row, updated_at: new Date().toISOString() });
      fail('write game', error);
    },
    async insertPlays(rows) {
      const { error } = await db.from('live_plays').upsert(rows, { onConflict: 'game_key,play_id', ignoreDuplicates: true });
      fail('write plays', error);
    },
    async upsertResult(row) {
      const { error } = await db.from('results').upsert({ ...row, final_at: new Date().toISOString() });
      fail('write result', error);
    },
  };
}

async function fetchJson(url: string) {
  const res = await fetch(url, { headers: { 'User-Agent': 'clarkindex/1.0' } });
  if (!res.ok) throw new Error(`ESPN ${res.status} for ${url}`);
  return res.json();
}

async function authorized(db: SupabaseClient, req: Request): Promise<boolean> {
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer /, '');
  if (!token) return false;
  const { data, error } = await db.rpc('check_live_sync_token', { token });
  return !error && data === true;
}

Deno.serve(async (req) => {
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  if (!(await authorized(db, req))) {
    return new Response('Unauthorized', { status: 401 });
  }
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  const model = Deno.env.get('GEMINI_MODEL') ?? undefined;

  try {
    const report = await runSync({
      now: new Date(),
      fetchJson,
      store: supabaseStore(db),
      aiNote: apiKey ? (p, ctx, template) => aiNote(p, ctx, template, { apiKey, model }) : undefined,
    });
    return Response.json(report);
  } catch (err) {
    console.error('live-sync failed', err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
});
