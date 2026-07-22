import React from 'react';

interface StadiumSceneProps {
  /** Open-air grandstand silhouette when true; enclosed roof glyph when false. */
  isOutdoor: boolean;
  /** Home team's primary color — the only tint this scene uses. */
  accentColor: string;
  opacity?: number;
}

/**
 * Stylized SVG stadium/field illustration — no bundled stadium photos exist in
 * this project (see CLARK_REPORT_AND_VIRALITY_PLAN.md, C0/C6), so this is an
 * intentionally simple, honest illustration rather than a claim of a specific
 * real venue. Flat fills/strokes only — no gradients, per the design system.
 * Purely decorative: aria-hidden, no motion.
 */
const StadiumScene: React.FC<StadiumSceneProps> = ({ isOutdoor, accentColor, opacity = 0.16 }) => (
  <svg
    className="absolute inset-0 w-full h-full"
    viewBox="0 0 400 160"
    preserveAspectRatio="xMidYMid slice"
    aria-hidden="true"
    style={{ opacity }}
  >
    {isOutdoor ? (
      <>
        {/* Grandstand tiers — three concentric arcs suggesting a bowl */}
        <path d="M -20 70 Q 200 -10 420 70" fill="none" stroke={accentColor} strokeWidth="10" />
        <path d="M -20 88 Q 200 14 420 88" fill="none" stroke={accentColor} strokeWidth="8" />
        <path d="M -20 104 Q 200 36 420 104" fill="none" stroke={accentColor} strokeWidth="6" />
        {/* Field strip with yard-line ticks */}
        <rect x="0" y="126" width="400" height="34" fill={accentColor} opacity="0.5" />
        {Array.from({ length: 9 }).map((_, i) => (
          <line
            key={i}
            x1={20 + i * 45}
            y1={126}
            x2={20 + i * 45}
            y2={160}
            stroke={accentColor}
            strokeWidth="1.5"
            opacity="0.6"
          />
        ))}
      </>
    ) : (
      <>
        {/* Enclosed roof glyph — a simple dome arc, no field visible */}
        <path
          d="M -20 110 Q 200 10 420 110"
          fill="none"
          stroke={accentColor}
          strokeWidth="12"
        />
        <path
          d="M -20 110 Q 200 40 420 110"
          fill="none"
          stroke={accentColor}
          strokeWidth="4"
          opacity="0.7"
        />
        <rect x="0" y="126" width="400" height="34" fill={accentColor} opacity="0.35" />
      </>
    )}
  </svg>
);

export default StadiumScene;
