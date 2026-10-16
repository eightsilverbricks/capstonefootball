import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getEspnLogoUrl } from '@/data/nflData';
import { useCurrentWeekGames } from '@/hooks/useCurrentWeekGames';
import { weekStats } from '@/lib/rail';
import { usePredictions } from '@/hooks/usePredictions';
import { useUserPicks } from '@/hooks/useUserPicks';
import { useAuth } from '@/hooks/useAuth';
import { gameKey } from '@/lib/threeWaySignal';
import { weeklyStreak } from '@/lib/weeklyStreak';

/** Scrolling strip of week facts under the rail. Doubled so the scroll loops seamlessly. */
export default function CommunityBar() {
  const { games, week } = useCurrentWeekGames();
  const { predictions } = usePredictions();
  const { picks } = useUserPicks();
  const { isSignedIn } = useAuth();
  const stats = useMemo(() => weekStats(games, { showClark: isSignedIn }), [games, isSignedIn]);
  const streak = useMemo(() => {
    const weeks = new Set(predictions.filter((g) => picks[gameKey(g)]).map((g) => g.week));
    return weeklyStreak(weeks, week);
  }, [predictions, picks, week]);
  if (stats.length === 0) return null;

  const row = (hidden: boolean) =>
    stats.map((s) => (
      <span key={`${s.id}${hidden ? '-dup' : ''}`} aria-hidden={hidden || undefined}>
        {s.team && <img src={getEspnLogoUrl(s.team)} alt="" width={15} height={15} />}
        {s.label}: <b>{s.value}</b>
      </span>
    ));

  return (
    <div className="community" aria-label="This week at a glance">
      {isSignedIn && streak.weeks > 0 && (
        <Link to="/games" className={`community-streak${streak.atRisk ? ' risk' : ''}`}>
          🔥 Streak: <b>{streak.weeks} week{streak.weeks === 1 ? '' : 's'}</b>
          {streak.atRisk ? ' · at risk, make a pick' : streak.freezeReady ? ' · freeze ready' : ''}
        </Link>
      )}
      <div className="community-inner">
        <div className="community-strip">{row(false)}{row(true)}</div>
      </div>
    </div>
  );
}
