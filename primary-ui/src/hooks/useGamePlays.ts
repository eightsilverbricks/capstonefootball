import { useEffect, useState } from 'react';
import { fetchPlays, subscribePlays, type LivePlay } from '@/data/liveRepository';

/** Every stored play for a game, oldest first, with new ones pushed live. */
export function useGamePlays(gameKey: string, enabled = true): { plays: LivePlay[]; loading: boolean } {
  const [plays, setPlays] = useState<LivePlay[]>([]);
  const [loading, setLoading] = useState(enabled);

  useEffect(() => {
    if (!enabled) { setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    fetchPlays(gameKey)
      .then((rows) => { if (!cancelled) setPlays(rows); })
      .catch(() => { /* the tab shows its empty state */ })
      .finally(() => { if (!cancelled) setLoading(false); });
    const unsubscribe = subscribePlays(gameKey, (p) => {
      setPlays((prev) => (prev.some((x) => x.play_id === p.play_id) ? prev : [...prev, p].sort((a, b) => a.seq - b.seq)));
    });
    return () => { cancelled = true; unsubscribe(); };
  }, [gameKey, enabled]);

  return { plays, loading };
}
