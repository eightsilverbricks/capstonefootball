// ─── Rosters — starters, stats and position ranks (export_rosters.py) ────────
// Republished with the predictions every ~10 minutes to the `data` branch;
// the bundled /rosters.json is the fallback.

import { useEffect, useState } from 'react';

export interface Starter { id: string; name: string; pos: string; slot: number }
export interface PlayerInfo {
  name: string;
  team: string;
  pos: string;
  side: 'offense' | 'defense';
  group: string;
  espn_id: string | null;
  headshot: string | null;
  games: number;
  rank: string | null;
  season: string | null;
  last5: { week: number; opp: string; line: string | null }[];
  injury: { status: string } | null;
}
export interface Rosters {
  season: number;
  updated: string;
  teams: Record<string, { offense: Starter[]; defense: Starter[] }>;
  players: Record<string, PlayerInfo>;
}

const LIVE_URL = 'https://raw.githubusercontent.com/eightsilverbricks/capstonefootball/data/rosters.json';
let cached: Promise<Rosters> | null = null;

async function get(url: string): Promise<Rosters> {
  const r = await fetch(url, { cache: 'no-cache' });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

export function loadRosters(): Promise<Rosters> {
  cached ??= get(LIVE_URL).catch(() => get('/rosters.json')).catch((e) => { cached = null; throw e; });
  return cached;
}

export function useRosters(): { rosters: Rosters | null; error: string } {
  const [rosters, setRosters] = useState<Rosters | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let alive = true;
    loadRosters().then((r) => { if (alive) setRosters(r); }).catch((e) => { if (alive) setError(String(e)); });
    return () => { alive = false; };
  }, []);
  return { rosters, error };
}

/** Find a starter by name and team (for linking key players and injuries). */
export function findPlayerId(rosters: Rosters, team: string, name: string): string | null {
  const want = name.toLowerCase().replace(/[^a-z]/g, '');
  const hit = Object.entries(rosters.players).find(([, p]) => p.team === team && p.name.toLowerCase().replace(/[^a-z]/g, '') === want);
  return hit?.[0] ?? null;
}
