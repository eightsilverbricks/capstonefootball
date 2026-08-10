// ─── SlateSection — one viewing window of the week ───────────────────────────
// The rule-and-label header that turns a flat grid into a readable sequence:
// Thursday night, the 1 o'clock games, the 4 o'clock games, Sunday night.
// Primetime windows are marked in gold because a single standalone game is a
// genuinely different thing from a thirteen-game slate.

import React from 'react';
import GameCard from '@/components/GameCard';
import { SlateGroup } from '@/lib/slate';
import { gameKey } from '@/lib/threeWaySignal';

interface SlateSectionProps {
  group: SlateGroup;
}

const SlateSection: React.FC<SlateSectionProps> = ({ group }) => {
  const { window, kickoff, games } = group;
  const headingId = `slate-${window.id}`;
  const accent = window.primetime ? 'var(--accent-gold)' : 'var(--text-secondary)';

  return (
    <section aria-labelledby={headingId} className="mb-10">
      <div className="flex items-baseline gap-4 mb-4">
        <h2
          id={headingId}
          className="shrink-0 font-bold uppercase tracking-[0.18em] text-xs"
          style={{ fontFamily: 'var(--font-display)', color: accent }}
        >
          {window.label}
        </h2>

        {kickoff && (
          <span
            className="shrink-0 text-[10px] uppercase tracking-widest tabular-nums"
            style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}
          >
            {kickoff}
          </span>
        )}

        {/* Hairline rule fills the gap — the editorial device that gives the
            page rhythm instead of an unbroken run of cards. */}
        <span
          aria-hidden="true"
          className="flex-1 h-px"
          style={{ background: window.primetime ? 'var(--border-emphasis)' : 'var(--border-subtle)' }}
        />

        <span
          className="shrink-0 text-[10px] uppercase tracking-widest tabular-nums"
          style={{ color: 'var(--text-muted)' }}
        >
          {games.length} {games.length === 1 ? 'game' : 'games'}
        </span>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {games.map((game) => (
          <GameCard key={gameKey(game)} game={game} />
        ))}
      </div>
    </section>
  );
};

export default SlateSection;
