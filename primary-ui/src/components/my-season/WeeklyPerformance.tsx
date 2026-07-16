import React from 'react';
import { WeekRow } from '@/lib/seasonHistory';
import { signed } from '@/lib/format';

interface WeeklyPerformanceProps {
  weeks: WeekRow[];
  totals: { yourNet: number; clarkNet: number; vegasNet: number };
}

const LEGEND: { key: 'yourNet' | 'clarkNet' | 'vegasNet'; label: string; color: string }[] = [
  { key: 'yourNet', label: 'You', color: 'var(--text-primary)' },
  { key: 'clarkNet', label: 'Clark', color: 'var(--accent-gold)' },
  { key: 'vegasNet', label: 'Vegas', color: 'var(--text-tertiary)' },
];

/**
 * Weekly net-credit bars on a shared zero baseline — green above, red below —
 * with the season's cumulative You / Clark / Vegas totals called out above.
 * The screenshot-worthy centerpiece of My Season.
 */
const WeeklyPerformance: React.FC<WeeklyPerformanceProps> = ({ weeks, totals }) => {
  const maxAbs = Math.max(1, ...weeks.map((w) => Math.abs(w.yourNet)));

  return (
    <div className="rounded p-6" style={{ background: 'var(--surface)', border: '1px solid var(--border-subtle)' }}>
      <div className="flex items-baseline justify-between mb-5 flex-wrap gap-3">
        <h2 className="text-xs uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
          Weekly net · You vs the field
        </h2>
        <div className="flex items-center gap-4">
          {LEGEND.map(({ key, label, color }) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: color }} />
              <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                {label}
              </span>
              <span
                className="text-xs font-semibold tabular-nums"
                style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}
              >
                {signed(totals[key])}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-stretch gap-1 h-44">
        {weeks.map((w) => {
          const h = Math.round((Math.abs(w.yourNet) / maxAbs) * 100);
          const up = w.yourNet >= 0;
          return (
            <div key={w.week} className="flex-1 flex flex-col items-center min-w-0" title={`${w.weekLabel}: ${signed(w.yourNet)} · ${w.wins}–${w.losses}`}>
              <div className="flex-1 w-full flex items-end justify-center">
                {up && w.yourNet !== 0 && (
                  <div className="w-2/3 rounded-t" style={{ height: `${h}%`, background: 'var(--stake-positive)', minHeight: 2 }} />
                )}
              </div>
              <div className="w-full h-px" style={{ background: 'var(--border-default)' }} />
              <div className="flex-1 w-full flex items-start justify-center">
                {!up && (
                  <div className="w-2/3 rounded-b" style={{ height: `${h}%`, background: 'var(--stake-negative)', minHeight: 2 }} />
                )}
              </div>
              <span className="text-[9px] mt-1.5 tracking-wider" style={{ color: 'var(--text-muted)' }}>
                {w.shortLabel}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WeeklyPerformance;
