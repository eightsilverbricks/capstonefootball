import React from 'react';
import { Link } from 'react-router-dom';
import { usePredictions } from '@/hooks/usePredictions';
import { useUserPicks } from '@/hooks/useUserPicks';
import { computeSeasonSummary } from '@/lib/seasonSummary';
import { signed, stakeColor } from '@/lib/format';
import StatStrip, { StatStripItem } from './StatStrip';

interface RecordPreviewProps {
  /** 'full' → StatStrip block (home). 'compact' → slim inline row (games page). */
  variant?: 'full' | 'compact';
}

/**
 * A small preview of the user's predicting situation, derived live from the
 * picks store (never fabricated). Empty until the first pick, a pending count
 * before anything resolves, then the real record/score once games resolve. Full
 * detail lives on My Season, so the whole thing links there — matching the
 * existing header SeasonSummary behavior.
 */
const RecordPreview: React.FC<RecordPreviewProps> = ({ variant = 'full' }) => {
  const { predictions } = usePredictions();
  const { picks } = useUserPicks();
  const summary = computeSeasonSummary(picks, predictions);

  // ── No picks yet — an honest prompt, no zeroed-out fake stats ──
  if (summary.picksMade === 0) {
    return (
      <div
        className="rounded-lg px-5 py-4"
        style={{ background: 'var(--surface)', border: '1px solid var(--border-subtle)' }}
      >
        <p className="text-[11px] uppercase tracking-[0.2em] mb-1" style={{ color: 'var(--text-muted)' }}>
          Your season
        </p>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          You haven't made a pick yet — start with this week's games.
        </p>
      </div>
    );
  }

  const {
    resolvedCount, wins, losses, seasonScore, clarkDifferential, streak,
    picksMade, creditsPending,
  } = summary;

  // ── Picks locked but nothing resolved yet ──
  if (resolvedCount === 0) {
    return (
      <Link
        to="/my-season"
        className="block rounded-lg px-5 py-4 no-underline transition-opacity hover:opacity-80"
        style={{ background: 'var(--surface)', border: '1px solid var(--border-subtle)' }}
      >
        <p className="text-[11px] uppercase tracking-[0.2em] mb-1" style={{ color: 'var(--text-muted)' }}>
          Your season
        </p>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          <span className="font-semibold" style={{ color: 'var(--accent-gold)' }}>
            {picksMade} pick{picksMade === 1 ? '' : 's'}
          </span>{' '}
          in — {Math.round(creditsPending)} pts on the line, pending results.
        </p>
      </Link>
    );
  }

  const items: StatStripItem[] = [
    { label: 'Record', value: `${wins}–${losses}` },
    { label: 'Season', value: signed(seasonScore), color: stakeColor(seasonScore) },
    { label: 'vs Clark', value: signed(clarkDifferential), color: stakeColor(clarkDifferential) },
    ...(streak && streak.count > 0
      ? [{
          label: 'Streak',
          value: `${streak.type}${streak.count}`,
          color: streak.type === 'W' ? 'var(--stake-positive)' : 'var(--stake-negative)',
        }]
      : []),
  ];

  // ── Compact — slim inline cells for the games-page header bar ──
  if (variant === 'compact') {
    return (
      <Link
        to="/my-season"
        className="flex items-center gap-5 no-underline transition-opacity hover:opacity-80"
        aria-label="Your season standing — open My Season"
      >
        {items.map((it) => (
          <span key={it.label} className="flex flex-col leading-none">
            <span className="text-[9px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              {it.label}
            </span>
            <span
              className="text-sm font-semibold tabular-nums"
              style={{ color: it.color ?? 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}
            >
              {it.value}
            </span>
          </span>
        ))}
      </Link>
    );
  }

  // ── Full — the shared StatStrip treatment ──
  return (
    <Link
      to="/my-season"
      className="block no-underline transition-opacity hover:opacity-80"
      aria-label="Your season standing — open My Season"
    >
      <p className="text-[11px] uppercase tracking-[0.2em] mb-2" style={{ color: 'var(--text-muted)' }}>
        Your season
      </p>
      <StatStrip items={items} />
    </Link>
  );
};

export default RecordPreview;
