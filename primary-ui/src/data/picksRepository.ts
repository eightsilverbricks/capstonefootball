// ─── picksRepository — where a user's picks actually live ─────────────────────
// Picks are the source of every statistic in the app, so this is the one place
// that reads or writes them. Two backends behind one interface:
//
//   Supabase  — real accounts, real cross-device persistence (the live path)
//   local     — device-only localStorage, used when Supabase isn't configured
//
// Reads are async; the store in useUserPicks keeps a synchronous cache on top so
// components can render without awaiting.

import { isSupabaseConfigured, supabase } from '@/auth/supabaseClient';

export interface UserPick {
  team: string;
  confidence: number; // 0.5–1.0 (slider space)
  fanTeam?: string | null;
}

export type PickMap = Record<string, UserPick>;

const LOCAL_PREFIX = 'clark-index:picks:v1:';

function localKey(userId: string): string {
  return `${LOCAL_PREFIX}${userId}`;
}

function readLocal(userId: string): PickMap {
  try {
    const raw = window.localStorage.getItem(localKey(userId));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed as PickMap;
  } catch {
    return {};
  }
}

function writeLocal(userId: string, picks: PickMap): void {
  try {
    window.localStorage.setItem(localKey(userId), JSON.stringify(picks));
  } catch {
    // Storage full or unavailable — the in-memory cache still works this session.
  }
}

interface PickRow {
  game_key: string;
  team: string;
  confidence: number;
  fan_team: string | null;
}

/** Every pick this user has made. Empty on any failure — never throws at render. */
export async function loadPicks(userId: string): Promise<PickMap> {
  if (!isSupabaseConfigured || !supabase) return readLocal(userId);

  const { data, error } = await supabase
    .from('picks')
    .select('game_key, team, confidence, fan_team')
    .eq('user_id', userId);

  if (error || !data) return {};

  return (data as PickRow[]).reduce<PickMap>((acc, row) => {
    acc[row.game_key] = {
      team: row.team,
      // numeric(4,3) comes back as a string from PostgREST.
      confidence: Number(row.confidence),
      fanTeam: row.fan_team,
    };
    return acc;
  }, {});
}

/**
 * Persist one pick. Callers update their local cache optimistically and don't
 * await this — a failed write logs and leaves the cache ahead of the server,
 * which self-corrects on the next load.
 */
export async function savePick(
  userId: string,
  gameKey: string,
  pick: UserPick,
  allPicks: PickMap,
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    writeLocal(userId, allPicks);
    return;
  }

  const { error } = await supabase.from('picks').upsert(
    {
      user_id: userId,
      game_key: gameKey,
      team: pick.team,
      confidence: pick.confidence,
      fan_team: pick.fanTeam ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,game_key' },
  );

  if (error) console.error('[picks] save failed', error.message);
}

/** Remove a pick entirely, returning the game to its unpicked state. */
export async function deletePick(
  userId: string,
  gameKey: string,
  allPicks: PickMap,
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    writeLocal(userId, allPicks);
    return;
  }

  const { error } = await supabase
    .from('picks')
    .delete()
    .eq('user_id', userId)
    .eq('game_key', gameKey);

  if (error) console.error('[picks] delete failed', error.message);
}
