import React, { useMemo } from 'react';
import { ApiPrediction } from '@/types/prediction';
import { getTeamColors } from '@/data/nflData';
import {
  SentimentPoint,
  buildSentimentSeries,
  gameKey,
  getFanPick,
  getFanbaseSplit,
  getMatchupTakeaway,
  getVegasPick,
} from '@/lib/threeWaySignal';
import { useFanSentiment, useSentimentTimeline } from '@/hooks/useFanSentiment';
import { pct } from '@/lib/format';

interface BeliefTrackerProps {
  game: ApiPrediction;
}

/** Fan-sentiment curve as a small SVG area+line. */
const Sparkline: React.FC<{ points: SentimentPoint[]; color: string }> = ({ points, color }) => {
  const w = 100;
  const h = 32;
  const coords = points.map((p, i) => {
    const x = (i / (points.length - 1)) * w;
    const y = h - p.pct * h;
    return { x, y };
  });
  const line = coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
  const area = `0,${h} ${line} ${w},${h}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="w-full h-10" aria-hidden="true">
      <polygon points={area} fill={color} opacity={0.14} />
      <polyline points={line} fill="none" stroke={color} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
      <circle cx={coords[coords.length - 1].x} cy={coords[coords.length - 1].y} r={2} fill={color} />
    </svg>
  );
};

/**
 * The game page's belief panel: the central takeaway, how community support
 * built through the week, and how loyally each fanbase backed its own team.
 *
 * Every number here is the aggregate of real accounts' picks, so all of it can
 * be missing. A game nobody has picked shows the takeaway and an invitation to
 * be first — not a placeholder curve.
 */
const BeliefTracker: React.FC<BeliefTrackerProps> = ({ game }) => {
  const key = gameKey(game);
  const sentimentKeys = useMemo(() => [key], [key]);
  const { sentiment, fanbases, status } = useFanSentiment(sentimentKeys);
  const { days } = useSentimentTimeline(key);

  const vegas = getVegasPick(game);
  const fan = getFanPick(game, sentiment);
  const takeaway = getMatchupTakeaway(game, vegas, fan);
  const series = useMemo(() => buildSentimentSeries(game, days), [game, days]);
  const split = getFanbaseSplit(game, fanbases);

  const seriesColors = series ? getTeamColors(series.team) : null;

  return (
    <div className="rounded-lg p-5 mb-4 flex flex-col gap-5" style={{ background: 'var(--surface)', border: '1px solid var(--border-default)' }}>
      {/* Central takeaway */}
      <p className="text-lg leading-snug" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
        {takeaway}
      </p>

      {/* Where the community stands. The curve needs several picks across
          several days to mean anything; short of that we show the split alone. */}
      {series && seriesColors ? (
        <div>
          <div className="flex items-baseline justify-between mb-1">
            <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              Fan support · {series.team} — through the week
            </span>
            <span className="text-[10px] uppercase tracking-widest tabular-nums" style={{ color: 'var(--text-muted)' }}>
              {series.picks} picks
            </span>
          </div>
          <Sparkline points={series.points} color={seriesColors.primary} />
          <div className="flex justify-between mt-0.5">
            {series.points.map((p, i) => (
              <span key={`${p.label}-${i}`} className="text-[8px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                {p.label}
              </span>
            ))}
          </div>
        </div>
      ) : fan ? (
        <div>
          <div className="flex items-baseline justify-between mb-1">
            <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              Where the community stands
            </span>
            <span className="text-[10px] uppercase tracking-widest tabular-nums" style={{ color: 'var(--text-muted)' }}>
              {fan.picks} pick{fan.picks === 1 ? '' : 's'}
            </span>
          </div>
          <SplitBar
            team={fan.team}
            value={fan.prob}
            color={getTeamColors(fan.team).primary}
            caption="of picks so far"
          />
        </div>
      ) : (
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {status === 'loading'
            ? 'Loading community picks…'
            : 'No one has staked a call on this game yet. Yours would be the first.'}
        </p>
      )}

      {/* Fanbase splits — present only for fanbases that have actually picked. */}
      {split && (split.away || split.home) && (
        <div className="grid grid-cols-2 gap-4">
          {[split.away, split.home].map((side, i) =>
            side ? (
              <SplitBar
                key={side.team}
                team={`${side.team} fans`}
                value={side.backsOwn}
                color={getTeamColors(side.team).primary}
                caption={`back their own team · ${side.picks} pick${side.picks === 1 ? '' : 's'}`}
              />
            ) : (
              <div key={i} />
            ),
          )}
        </div>
      )}
    </div>
  );
};

const SplitBar: React.FC<{ team: string; value: number; color: string; caption: string }> = ({
  team,
  value,
  color,
  caption,
}) => (
  <div>
    <div className="flex items-baseline justify-between mb-1">
      <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>{team}</span>
      <span className="text-xs tabular-nums" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{pct(value)}</span>
    </div>
    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-raised)' }}>
      <div className="h-full rounded-full" style={{ width: `${Math.round(value * 100)}%`, background: color }} />
    </div>
    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{caption}</span>
  </div>
);

export default BeliefTracker;
