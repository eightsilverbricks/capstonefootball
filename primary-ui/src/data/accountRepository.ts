// ─── Account settings that live only in the database ─────────────────────────
import { isSupabaseConfigured, supabase } from '@/auth/supabaseClient';

export async function getHiddenFromLeaderboards(userId: string): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  const { data } = await supabase.from('profiles').select('hide_from_leaderboards').eq('id', userId).maybeSingle();
  return Boolean(data?.hide_from_leaderboards);
}

export async function setHiddenFromLeaderboards(userId: string, hidden: boolean): Promise<string | null> {
  if (!isSupabaseConfigured || !supabase) return 'Accounts are not available right now.';
  const { error } = await supabase.from('profiles').update({ hide_from_leaderboards: hidden }).eq('id', userId);
  return error ? error.message : null;
}

/** Permanently deletes the signed-in account and everything attached to it. */
export async function deleteMyAccount(): Promise<string | null> {
  if (!isSupabaseConfigured || !supabase) return 'Accounts are not available right now.';
  const { error } = await supabase.rpc('delete_my_account');
  return error ? error.message : null;
}
