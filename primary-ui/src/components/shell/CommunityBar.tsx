import { useMemo } from 'react';
import { getEspnLogoUrl } from '@/data/nflData';
import { useCurrentWeekGames } from '@/hooks/useCurrentWeekGames';
import { weekStats } from '@/lib/rail';

/** Scrolling strip of week facts under the rail. Doubled so the scroll loops seamlessly. */
export default function CommunityBar() {
  const { games } = useCurrentWeekGames();
  const stats = useMemo(() => weekStats(games), [games]);
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
      <div className="community-inner">
        <div className="community-strip">{row(false)}{row(true)}</div>
      </div>
    </div>
  );
}
