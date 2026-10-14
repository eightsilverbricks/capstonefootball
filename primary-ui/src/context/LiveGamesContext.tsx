import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { fetchLiveGames, subscribeLiveGames, type LiveGame } from '@/data/liveRepository';

/** Re-read everything this often too, in case a Realtime message was missed. */
const RESYNC_MS = 60 * 1000;

const LiveGamesContext = createContext<ReadonlyMap<string, LiveGame>>(new Map());

/** Every live_games row, kept current by Realtime. One subscription for the whole app. */
export function LiveGamesProvider({ children }: { children: ReactNode }) {
  const [games, setGames] = useState<ReadonlyMap<string, LiveGame>>(new Map());

  useEffect(() => {
    let cancelled = false;
    const load = () => fetchLiveGames()
      .then((rows) => { if (!cancelled) setGames(new Map(rows.map((r) => [r.game_key, r]))); })
      .catch(() => { /* live data is an enhancement; the feed still works without it */ });

    load();
    const unsubscribe = subscribeLiveGames((row) => {
      setGames((prev) => new Map(prev).set(row.game_key, row));
    });
    const id = window.setInterval(() => { if (document.visibilityState === 'visible') load(); }, RESYNC_MS);
    return () => { cancelled = true; unsubscribe(); window.clearInterval(id); };
  }, []);

  return <LiveGamesContext.Provider value={games}>{children}</LiveGamesContext.Provider>;
}

export function useLiveGames(): ReadonlyMap<string, LiveGame> {
  return useContext(LiveGamesContext);
}
