import React from 'react';
import { getTeamColors } from '@/data/nflData';

export interface CompareRow {
  label: string;
  team: string;
  pct: number; // 0–1
  /** How many real picks this row rests on. Rendered as a superscript so a
   * 100% share off two picks can't be mistaken for a settled consensus. */
  sampleSize?: number;
}

interface ThreeWayCompareProps {
  rows: CompareRow[];
  size?: 'compact' | 'large';
  /** Actual winner abbr. When set, each row is marked correct (✓) or not (✗). */
  winner?: string | null;
}

const ThreeWayCompare: React.FC<ThreeWayCompareProps> = ({ rows, size = 'compact', winner }) => {
  const barHeight = size === 'large' ? 'h-2' : 'h-1.5';
  const labelSize = size === 'large' ? 'text-xs' : 'text-[10px]';
  const pctSize = size === 'large' ? 'text-sm' : 'text-xs';

  return (
    <div className="flex flex-col gap-2" role="group" aria-label="Clark, Vegas, and fan comparison">
      {rows.map((row) => {
        const colors = getTeamColors(row.team);
        const pct = Math.round(row.pct * 100);
        const correct = winner ? row.team === winner : null;
        return (
          <div key={row.label} className="flex items-center gap-3">
            <span
              className={`uppercase tracking-widest shrink-0 w-16 ${labelSize} flex items-center gap-1`}
              style={{ color: 'var(--text-muted)' }}
            >
              {correct != null && (
                <span
                  className="text-[10px]"
                  style={{ color: correct ? 'var(--stake-positive)' : 'var(--stake-negative)' }}
                  aria-label={correct ? 'correct' : 'incorrect'}
                >
                  {correct ? '✓' : '✗'}
                </span>
              )}
              {row.label}
              {row.sampleSize != null && (
                <sup
                  className="ml-0.5 tabular-nums"
                  style={{ color: 'var(--text-muted)' }}
                  title={`${row.sampleSize} community pick${row.sampleSize === 1 ? '' : 's'}`}
                >
                  {row.sampleSize}
                </sup>
              )}
            </span>
            <div
              className={`flex-1 rounded-full overflow-hidden ${barHeight}`}
              style={{ background: 'var(--surface-raised)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${pct}%`, background: colors.primary }}
              />
            </div>
            <span
              className={`font-semibold tabular-nums shrink-0 w-20 text-right ${pctSize}`}
              style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}
            >
              {row.team} {pct}%
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default ThreeWayCompare;
