import React from 'react';
import { PickHighlight } from '@/lib/seasonHistory';
import { getTeamColors } from '@/data/nflData';
import { signed, stakeColor, pct } from '@/lib/format';

interface PickHighlightCardProps {
  highlight: PickHighlight;
}

/** One resolved pick worth remembering — a strongest call or a biggest miss. */
const PickHighlightCard: React.FC<PickHighlightCardProps> = ({ highlight }) => {
  const colors = getTeamColors(highlight.yourTeam);
  return (
    <div
      className="rounded p-4 flex items-center gap-4"
      style={{ background: 'var(--surface)', border: '1px solid var(--border-subtle)' }}
    >
      <div className="w-1 self-stretch rounded-full" style={{ background: colors.primary }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
            {highlight.yourTeam}
          </span>
          <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            {highlight.shortLabel} · {pct(highlight.confidence)} conviction
          </span>
        </div>
        <p className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>
          {highlight.matchup}
        </p>
        <span
          className="inline-block mt-1 text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded"
          style={{
            color: highlight.correct ? 'var(--stake-positive)' : 'var(--stake-negative)',
            background: highlight.correct ? 'var(--stake-positive-dim)' : 'var(--stake-negative-dim)',
          }}
        >
          {highlight.tag}
        </span>
      </div>
      <span
        className="text-xl font-bold tabular-nums shrink-0"
        style={{ color: stakeColor(highlight.net), fontFamily: 'var(--font-mono)' }}
      >
        {signed(highlight.net)}
      </span>
    </div>
  );
};

export default PickHighlightCard;
