import React from 'react';
import Bobblehead from './Bobblehead';
import { FOUNDERS } from '@/data/founders';
import { getTeamColors } from '@/data/nflData';

interface BobbleheadRowProps {
  /** Width of the outer two figures. The center figure gets 15% more. */
  size?: number;
  /** Show name / role / fan line under each figure. */
  showCaptions?: boolean;
  className?: string;
}

/**
 * The three of us on a shelf. The center figure is deliberately larger and
 * raised so the row has a focal point instead of reading as a uniform grid, and
 * each figure sits in a wash of its own team color.
 */
const BobbleheadRow: React.FC<BobbleheadRowProps> = ({
  size = 132,
  showCaptions = true,
  className = '',
}) => (
  // overflow-x-clip (not hidden — no scroll container, no effect on the vertical
  // axis) keeps the decorative team-color wash from widening the page when the
  // figures shrink on narrow screens.
  // max-w-full rather than w-full: as a block-level flex container the row
  // already fills its parent, but as a flex *item* (the letter's signature line)
  // it must size to its content instead of squeezing its neighbour out.
  <ul className={`flex items-end justify-center gap-2 sm:gap-6 list-none p-0 m-0 max-w-full overflow-x-clip ${className}`}>
    {FOUNDERS.map((founder, i) => {
      const isCenter = i === 1;
      const colors = getTeamColors(founder.team);

      return (
        <li
          key={founder.id}
          // flex-basis 0 + min-width 0 lets all three shrink together on narrow
          // screens; maxWidth keeps them from stretching past their drawn size.
          className="flex flex-col items-center rise-in min-w-0"
          style={{
            '--rise-delay': `${i * 110}ms`,
            flex: '1 1 0',
            maxWidth: isCenter ? Math.round(size * 1.15) : size,
          } as React.CSSProperties}
        >
          <div className="relative flex items-end justify-center w-full">
            {/* Team-color wash — decorative, sits behind the figure */}
            <span
              aria-hidden="true"
              className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full pointer-events-none"
              style={{
                width: '135%',
                aspectRatio: '1',
                background: `radial-gradient(circle, ${colors.primary}55 0%, ${colors.secondary}18 45%, transparent 70%)`,
              }}
            />
            <Bobblehead
              founder={founder}
              index={i}
              size={isCenter ? Math.round(size * 1.15) : size}
              className="relative"
            />
          </div>

          {showCaptions && (
            <div className="text-center mt-3 w-full px-1">
              <p
                className="font-bold leading-tight"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '0.95rem',
                  color: 'var(--text-primary)',
                }}
              >
                {founder.name}
              </p>
              <p
                className="text-[10px] uppercase tracking-[0.18em] mt-1"
                style={{ color: colors.secondary }}
              >
                {founder.teamName} · {founder.role}
              </p>
              <p className="text-xs mt-1.5 leading-snug" style={{ color: 'var(--text-muted)' }}>
                {founder.line}
              </p>
            </div>
          )}
        </li>
      );
    })}
  </ul>
);

export default BobbleheadRow;
