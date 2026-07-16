import React from 'react';
import { ApiPrediction } from '@/types/prediction';
import { getTeamColors } from '@/data/nflData';
import {
  getVegasPick,
  getFanPick,
  getFanSentimentSeries,
  getFanbaseSplit,
  getMatchupTakeaway,
} from '@/lib/threeWaySignal';
import { pct } from '@/lib/format';

interface BeliefTrackerProps {
  game: ApiPrediction;
}

/** Provisional fan-sentiment sparkline as a small SVG area+line. */
const Sparkline: React.FC<{ points: { label: string; pct: number }[]; color: string }> = ({ points, color }) => {
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
 * The game page's belief panel: the central takeaway, the user's locked pick +
 * a PROVISIONAL fan-sentiment curve, and the two fanbase splits. The user's own
 * pick + points now live in the "Your call" panel above. Sits above View Evidence.
 */
const BeliefTracker: React.FC<BeliefTrackerProps> = ({ game }) => {
  const vegas = getVegasPick(game);
  const fan = getFanPick(game);
  const takeaway = getMatchupTakeaway(game, vegas, fan);
  const series = getFanSentimentSeries(game);
  const split = getFanbaseSplit(game);
  const fanColors = getTeamColors(series.team);
  const homeColors = getTeamColors(split.homeTeam);
  const awayColors = getTeamColors(split.awayTeam);

  return (
    <div className="rounded-lg p-5 mb-4 flex flex-col gap-5" style={{ background: 'var(--surface)', border: '1px solid var(--border-default)' }}>
      {/* Central takeaway */}
      <p className="text-lg leading-snug" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
        {takeaway}
      </p>

      {/* Fan sentiment over time (provisional) */}
      <div>
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            Fan support · {series.team} — through the week
          </span>
          <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }} title="Illustrative — real community picks are coming">
            provisional †
          </span>
        </div>
        <Sparkline points={series.points} color={fanColors.primary} />
        <div className="flex justify-between mt-0.5">
          {series.points.map((p) => (
            <span key={p.label} className="text-[8px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              {p.label}
            </span>
          ))}
        </div>
      </div>

      {/* Fanbase splits (provisional) */}
      <div className="grid grid-cols-2 gap-4">
        <SplitBar team={split.awayTeam} value={split.awayBacksAway} color={awayColors.primary} />
        <SplitBar team={split.homeTeam} value={split.homeBacksHome} color={homeColors.primary} />
      </div>
    </div>
  );
};

const SplitBar: React.FC<{ team: string; value: number; color: string }> = ({ team, value, color }) => (
  <div>
    <div className="flex items-baseline justify-between mb-1">
      <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>{team} fans</span>
      <span className="text-xs tabular-nums" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{pct(value)}</span>
    </div>
    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-raised)' }}>
      <div className="h-full rounded-full" style={{ width: `${Math.round(value * 100)}%`, background: color }} />
    </div>
    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>back their own team</span>
  </div>
);

export default BeliefTracker;
