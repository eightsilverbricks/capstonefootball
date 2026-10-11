import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { getEspnLogoUrl } from '@/data/nflData';
import { useCurrentWeekGames } from '@/hooks/useCurrentWeekGames';
import { useUserPicks } from '@/hooks/useUserPicks';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { buildRailItems, RailItem } from '@/lib/rail';
import { weekShortLabel } from '@/lib/currentWeek';

const ADVANCE_MS = 5000;
const PAGE = 4;

function RailRow({ team, score, item }: { team: string; score?: number | null; item: RailItem }) {
  const lost = item.status === 'final' && item.winner !== null && item.winner !== team;
  return (
    <div className={`rail-row${lost ? ' lost' : ''}`}>
      <img src={getEspnLogoUrl(team)} alt="" width={16} height={16} loading="lazy" />
      <b>{team}</b>
      {item.status === 'final' && <span className="s">{score}</span>}
    </div>
  );
}

/** "The Rail": every game this week, upcoming first, advancing one game every few seconds. */
export default function ScoreRail() {
  const { week, games } = useCurrentWeekGames();
  const { picks } = useUserPicks();
  const reduced = useReducedMotion();
  const items = useMemo(() => buildRailItems(games, picks), [games, picks]);
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const maxIndex = () => {
    const track = trackRef.current;
    const first = track?.querySelector('.rail-game');
    if (!track || !first) return 0;
    return Math.max(0, items.length - Math.floor(track.clientWidth / first.getBoundingClientRect().width));
  };
  const go = (n: number) => setIndex(Math.min(maxIndex(), Math.max(0, n)));

  useEffect(() => {
    if (reduced || paused || items.length === 0) return undefined;
    const id = window.setInterval(() => setIndex((i) => (i >= maxIndex() ? 0 : i + 1)), ADVANCE_MS);
    return () => window.clearInterval(id);
    // maxIndex reads layout at tick time; items length is the only real input.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced, paused, items.length]);

  if (items.length === 0) return null;
  const step = trackRef.current?.querySelector('.rail-game')?.getBoundingClientRect().width ?? 152;

  return (
    <div className="rail" aria-label="This week's games">
      <div className="rail-inner">
        <div className="rail-label">The Rail<small>{weekShortLabel(week)} scores</small></div>
        <div className="rail-track" ref={trackRef} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
          <div className="rail-strip" style={{ transform: `translateX(${-index * step}px)` }}>
            {items.map((item) => {
              const g = item.game;
              return (
                <Link key={item.key} className="rail-game" to={`/game/${g.season}/${g.week}/${g.away_team}/${g.home_team}`}>
                  <span className="rail-status">{item.statusLabel}</span>
                  <RailRow team={g.away_team} score={g.away_score} item={item} />
                  <RailRow team={g.home_team} score={g.home_score} item={item} />
                  <span className={`rail-pick${item.pickResult ? ` ${item.pickResult}` : ''}`}>{item.pickLabel}</span>
                </Link>
              );
            })}
          </div>
        </div>
        <div className="rail-arrows">
          <button type="button" aria-label="Previous games" onClick={() => go(index - PAGE)}>‹</button>
          <button type="button" aria-label="More games" onClick={() => go(index + PAGE)}>›</button>
        </div>
      </div>
    </div>
  );
}
