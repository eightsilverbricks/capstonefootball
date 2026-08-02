import React from 'react';
import { FOUNDERS } from '@/data/founders';
import { getTeamColors } from '@/data/nflData';

interface FoundersPortraitProps {
  /** Name / team / fan-line labels anchored under each of us. Off for small decorative uses. */
  showLabels?: boolean;
  /** The slow zoom breathing effect. Off for small decorative uses. */
  animate?: boolean;
  className?: string;
}

/**
 * The three of us, as one photo — replaces the individual drawn bobblehead
 * figures with the actual commissioned group shot (public/founders/group.jpg),
 * given a slow Ken-Burns zoom for a little life. Name labels are absolutely
 * positioned under each of our faces using photoXPercent from founders.ts,
 * since it's a single flat image rather than three separate cutouts.
 */
const FoundersPortrait: React.FC<FoundersPortraitProps> = ({
  showLabels = true,
  animate = true,
  className = '',
}) => (
  <div className={`w-full ${className}`}>
    <div
      className="relative w-full overflow-hidden rounded-2xl"
      style={{ aspectRatio: '3 / 2', border: '1px solid var(--border-default)', background: '#000' }}
    >
      <img
        src="/founders/group.jpg"
        alt="Takuo Yamamoto, Nicholas Chan, and Zane Wolf, the founders of The Clark Index, in their team jerseys"
        width={1200}
        height={800}
        className={`absolute inset-0 w-full h-full object-cover ${animate ? 'photo-zoom' : ''}`}
        loading="eager"
        fetchPriority="high"
      />
    </div>

    {showLabels && (
      <div className="relative w-full mt-4" style={{ height: '4.75rem' }} aria-hidden="true">
        {FOUNDERS.map((founder) => {
          const colors = getTeamColors(founder.team);
          return (
            <div
              key={founder.id}
              className="absolute top-0 flex flex-col items-center text-center px-1"
              style={{ left: `${founder.photoXPercent}%`, transform: 'translateX(-50%)', width: '34%' }}
            >
              <p
                className="font-bold leading-tight"
                style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', color: 'var(--text-primary)' }}
              >
                {founder.name}
              </p>
              <p
                className="text-[10px] uppercase tracking-[0.16em] mt-1"
                style={{ color: colors.secondary }}
              >
                {founder.teamName} · {founder.role}
              </p>
              <p
                className="hidden sm:block text-xs mt-1 leading-snug"
                style={{ color: 'var(--text-muted)' }}
              >
                {founder.line}
              </p>
            </div>
          );
        })}
      </div>
    )}

    {/* Screen readers get the real names via one readable list, since the
        positioned labels above are decorative (aria-hidden) and would
        otherwise read as three disconnected fragments. */}
    {showLabels && (
      <p className="sr-only">
        {FOUNDERS.map((f) => `${f.name}, ${f.teamName} fan, ${f.role}`).join('. ')}
      </p>
    )}
  </div>
);

export default FoundersPortrait;
