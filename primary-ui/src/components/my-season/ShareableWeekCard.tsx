import React from 'react';
import { WeekRow, PickHighlight } from '@/lib/seasonHistory';
import { signed, stakeColor } from '@/lib/format';

interface ShareableWeekCardProps {
  week: WeekRow;
  bestCall: PickHighlight | null;
}

/**
 * A compact, self-contained week recap built to be screenshotted and shared:
 * big net number, record, margin vs Clark, best call, and the wordmark.
 */
const ShareableWeekCard: React.FC<ShareableWeekCardProps> = ({ week, bestCall }) => {
  const vsClark = week.yourNet - week.clarkNet;
  return (
    <figure
      className="rounded-lg p-6 flex flex-col gap-5"
      style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-emphasis)' }}
    >
      <div className="flex items-baseline justify-between">
        <span className="text-xs uppercase tracking-[0.24em]" style={{ color: 'var(--accent-gold)' }}>
          {week.weekLabel} · recap
        </span>
        <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
          {week.wins}–{week.losses}
        </span>
      </div>

      <div className="flex items-end gap-4">
        <span
          className="font-bold leading-none tabular-nums"
          style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(3rem,10vw,4.5rem)', color: stakeColor(week.yourNet) }}
        >
          {signed(week.yourNet)}
        </span>
        <div className="pb-2 flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            net credits
          </span>
          <span className="text-sm font-semibold tabular-nums" style={{ color: stakeColor(vsClark), fontFamily: 'var(--font-mono)' }}>
            {signed(vsClark)} vs Clark
          </span>
        </div>
      </div>

      {bestCall && (
        <div className="rounded p-3" style={{ background: 'var(--surface)', border: '1px solid var(--border-subtle)' }}>
          <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            Best call
          </span>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            <b style={{ color: 'var(--text-primary)' }}>{bestCall.yourTeam}</b> — {bestCall.tag}{' '}
            <span className="tabular-nums" style={{ color: 'var(--stake-positive)', fontFamily: 'var(--font-mono)' }}>
              {signed(bestCall.net)}
            </span>
          </p>
        </div>
      )}

      <div className="flex items-baseline gap-2 pt-1" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        <span className="font-bold tracking-tight text-sm mt-3" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
          Clark
        </span>
        <span className="text-sm mt-3 italic" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-tertiary)' }}>
          Index
        </span>
      </div>
    </figure>
  );
};

export default ShareableWeekCard;
