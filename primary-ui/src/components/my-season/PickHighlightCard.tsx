import React, { useState } from 'react';
import { PickHighlight } from '@/lib/seasonHistory';
import { Streak } from '@/lib/seasonSummary';
import { ApiPrediction } from '@/types/prediction';
import { getTeamColors } from '@/data/nflData';
import { getVegasPick, getFanPick } from '@/lib/threeWaySignal';
import { signed, stakeColor, pct } from '@/lib/format';
import PickShareCard from '@/components/game-report/PickShareCard';
import { Share2 } from 'lucide-react';

interface PickHighlightCardProps {
  highlight: PickHighlight;
  /** The full game row this highlight came from — enables the share card (B4). */
  game?: ApiPrediction;
  clarkDifferential?: number | null;
  streak?: Streak | null;
}

/** One resolved pick worth remembering — a strongest call or a biggest miss. */
const PickHighlightCard: React.FC<PickHighlightCardProps> = ({ highlight, game, clarkDifferential, streak }) => {
  const [shareOpen, setShareOpen] = useState(false);
  const colors = getTeamColors(highlight.yourTeam);

  return (
    <div className="flex flex-col gap-2">
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
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <span
            className="text-xl font-bold tabular-nums"
            style={{ color: stakeColor(highlight.net), fontFamily: 'var(--font-mono)' }}
          >
            {signed(highlight.net)}
          </span>
          {game && (
            <button
              type="button"
              onClick={() => setShareOpen((open) => !open)}
              className="flex items-center gap-1 text-[10px] uppercase tracking-widest"
              style={{ color: 'var(--accent-gold)' }}
              aria-expanded={shareOpen}
            >
              <Share2 className="w-3 h-3" aria-hidden="true" />
              {shareOpen ? 'Hide' : 'Share'}
            </button>
          )}
        </div>
      </div>

      {game && shareOpen && (
        <PickShareCard
          game={game}
          pick={{ team: highlight.yourTeam, confidence: highlight.confidence }}
          vegas={getVegasPick(game)}
          fan={getFanPick(game)}
          resolvedNet={highlight.net}
          clarkDifferential={clarkDifferential}
          streak={streak}
        />
      )}
    </div>
  );
};

export default PickHighlightCard;
