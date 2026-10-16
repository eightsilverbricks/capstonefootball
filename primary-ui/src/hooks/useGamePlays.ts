import { useEffect, useState } from 'react';
import { fetchPlays, subscribePlays, type LivePlay } from '@/data/liveRepository';

/** Re-read every play this often too, in case a Realtime message was missed. */
const RESYNC_MS = 30 * 1000;

/** Every play in a game, oldest first; new plays arrive by Realtime and a periodic catch-up. */
export function useGamePlays(gameKey: string, enabled = true, isLive = false): { plays: LivePlay[]; loading: boolean } {
  const [plays, setPlays] = useState<LivePlay[]>([]);
  const [loading, setLoading] = useState(enabled);

  useEffect(() => {
    if (!enabled) { setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    const load = () => fetchPlays(gameKey)
      .then((rows) => { if (!cancelled) setPlays(rows); })
      .catch(() => { /* the tab shows its empty state; the next catch-up retries */ })
      .finally(() => { if (!cancelled) setLoading(false); });

    load();
    const unsubscribe = subscribePlays(gameKey, (p) => {
      setPlays((prev) => (prev.some((x) => x.play_id === p.play_id) ? prev : [...prev, p].sort((a, b) => a.seq - b.seq)));
    });
    // Phones drop the socket when asleep: catch up when the page is seen again,
    // and every so often while the game is on.
    const onVisible = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', onVisible);
    const id = isLive ? window.setInterval(onVisible, RESYNC_MS) : undefined;
    return () => {
      cancelled = true;
      unsubscribe();
      document.removeEventListener('visibilitychange', onVisible);
      window.clearInterval(id);
    };
  }, [gameKey, enabled, isLive]);

  return { plays, loading };
}
