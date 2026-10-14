import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchRecentBigPlays, subscribeBigPlays, type LivePlay } from '@/data/liveRepository';
import { getEspnLogoUrl } from '@/data/nflData';
import { liveClock, type LiveAware } from '@/lib/live';

const MAX_PLAYS = 6;

function gameUrl(key: string): string {
  const [season, week, away, home] = key.split('_');
  return `/game/${season}/${Number(week)}/${away}/${home}`;
}

/** Games in progress, then the latest big plays from around the league. */
export default function LiveNow({ games }: { games: LiveAware[] }) {
  const live = games.filter((g) => g.live?.status === 'in');
  const [plays, setPlays] = useState<LivePlay[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetchRecentBigPlays(MAX_PLAYS).then((p) => { if (!cancelled) setPlays(p); }).catch(() => {});
    const unsubscribe = subscribeBigPlays((p) => setPlays((prev) => [p, ...prev.filter((x) => x.play_id !== p.play_id)].slice(0, MAX_PLAYS)));
    return () => { cancelled = true; unsubscribe(); };
  }, []);

  if (!live.length && !plays.length) return null;
  return (
    <>
      {live.length > 0 && (
        <section>
          <h2 className="hm-h2"><span><span className="live-dot" />Live now</span></h2>
          {live.map((g) => (
            <Link key={g.game_id} className="hm-live" to={`/game/${g.season}/${g.week}/${g.away_team}/${g.home_team}`}>
              <span><img src={getEspnLogoUrl(g.away_team)} alt="" width={18} height={18} />{g.away_team} <b>{g.live!.away_score}</b></span>
              <span><img src={getEspnLogoUrl(g.home_team)} alt="" width={18} height={18} />{g.home_team} <b>{g.live!.home_score}</b></span>
              <small>{liveClock(g.live!)}</small>
            </Link>
          ))}
        </section>
      )}
      {plays.length > 0 && (
        <section>
          <h2 className="hm-h2">Big plays</h2>
          {plays.map((p) => (
            <Link key={`${p.game_key}${p.play_id}`} className="hm-bigplay" to={gameUrl(p.game_key)}>
              <b>{p.note ?? p.text}</b>
              <small>{p.game_key.split('_').slice(2).join(' @ ')} · Q{p.quarter} {p.clock}</small>
            </Link>
          ))}
        </section>
      )}
    </>
  );
}
