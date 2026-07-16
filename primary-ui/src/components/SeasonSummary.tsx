import React from 'react';
import { Link } from 'react-router-dom';
import { usePredictions } from '@/hooks/usePredictions';
import { useUserPicks } from '@/hooks/useUserPicks';
import { computeSeasonSummary } from '@/lib/seasonSummary';

/** Signed integer with an explicit + on positives, colored by stake semantics. */
function signed(n: number): string {
  const r = Math.round(n);
  return r > 0 ? `+${r}` : `${r}`;
}

function stakeColor(n: number): string {
  if (n > 0) return 'var(--stake-positive)';
  if (n < 0) return 'var(--stake-negative)';
  return 'var(--text-secondary)';
}

interface CellProps {
  label: string;
  value: string;
  color?: string;
  className?: string;
}

const Cell: React.FC<CellProps> = ({ label, value, color, className }) => (
  <div className={`flex flex-col items-end leading-none ${className ?? ''}`}>
    <span className="text-[9px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
      {label}
    </span>
    <span
      className="text-sm font-semibold tabular-nums"
      style={{ color: color ?? 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}
    >
      {value}
    </span>
  </div>
);

/**
 * Compact, persistent season standing shown in the header once the user has
 * locked at least one pick. Season score, record, Clark Differential, and
 * current streak — all derived live from the picks store via scoring.ts.
 * The full visual history lands on the My Season page (Phase 9).
 */
const SeasonSummary: React.FC = () => {
  const { predictions } = usePredictions();
  const { picks } = useUserPicks();

  const summary = computeSeasonSummary(picks, predictions);
  if (summary.picksMade === 0) return null;

  const { seasonScore, wins, losses, clarkDifferential, streak, resolvedCount } = summary;

  return (
    <Link
      to="/my-season"
      className="hidden md:flex items-center gap-3 pl-3 pr-1 no-underline rounded transition-opacity hover:opacity-80"
      style={{ borderLeft: '1px solid var(--border-subtle)' }}
      aria-label="Your season standing — open My Season"
    >
      {resolvedCount > 0 ? (
        <>
          <Cell label="Season" value={signed(seasonScore)} color={stakeColor(seasonScore)} />
          <Cell label="Record" value={`${wins}–${losses}`} />
          <Cell
            label="vs Clark"
            value={signed(clarkDifferential)}
            color={stakeColor(clarkDifferential)}
            className="hidden lg:flex"
          />
          {streak && streak.count > 0 && (
            <Cell
              label="Streak"
              value={`${streak.type}${streak.count}`}
              color={streak.type === 'W' ? 'var(--stake-positive)' : 'var(--stake-negative)'}
              className="hidden lg:flex"
            />
          )}
        </>
      ) : (
        <Cell
          label="Pending"
          value={`${summary.picksMade} pick${summary.picksMade === 1 ? '' : 's'}`}
          color="var(--accent-gold)"
        />
      )}
    </Link>
  );
};

export default SeasonSummary;
