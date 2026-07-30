import React, { useId, useState } from 'react';
import { Founder, HairStyle } from '@/data/founders';
import { getTeamColors } from '@/data/nflData';

interface BobbleheadProps {
  founder: Founder;
  /** Rendered width in px. Height follows the 120×176 viewBox ratio. */
  size?: number;
  /** Stagger index — offsets the bob so the three heads don't move in lockstep. */
  index?: number;
  className?: string;
}

// ─── Hair ─────────────────────────────────────────────────────────────────────
// Three silhouettes matching the three of us. Each sits on a head centered at
// (60, 60) with rx 40 / ry 38, so they all share the same crown line.

function Hair({ style, color }: { style: HairStyle; color: string }): JSX.Element {
  if (style === 'spiky') {
    return (
      <path
        d="M21 54c0-19 17-33 39-33s39 14 39 33c-3-6-7-9-7-9s-1 6-4 9c-1-8-6-14-6-14s-3 8-7 11c-1-9-7-15-7-15s-4 9-9 13c-2-9-8-14-8-14s-3 9-8 13c-3-7-9-11-9-11s-2 7-5 11c-3-4-5-9-5-9s-2 8-3 15z"
        fill={color}
      />
    );
  }

  if (style === 'curly') {
    return (
      <g fill={color}>
        <path d="M21 58c0-21 17-37 39-37s39 16 39 37c0-4-2-7-2-7-2-9-9-9-9-9-4-7-12-6-12-6-5-6-13-4-13-4-8-4-15 1-15 1-9-1-13 6-13 6-8 2-9 10-9 10s-4 3-5 9z" />
        <circle cx="26" cy="47" r="9" />
        <circle cx="39" cy="34" r="10" />
        <circle cx="55" cy="27" r="10.5" />
        <circle cx="72" cy="30" r="10" />
        <circle cx="86" cy="41" r="9.5" />
        <circle cx="94" cy="54" r="8" />
      </g>
    );
  }

  // 'straight' — smooth crown with a soft center-parted fringe
  return (
    <g fill={color}>
      <path d="M21 57c0-20 17-36 39-36s39 16 39 36c-1-5-3-9-3-9-6-11-19-13-19-13-6 4-14 5-14 5-11 1-18-4-18-4-11 3-17 12-17 12s-5 4-7 9z" />
      <path d="M60 21c14 0 25 8 29 19-8-6-19-8-19-8s-6 6-16 7c-11 1-19-3-19-3 4-9 14-15 25-15z" />
    </g>
  );
}

/**
 * A bobblehead of one of us — oversized head on a spring, in the right jersey,
 * on a nameplate base. Colors come from the real NFL palette so the figures read
 * as the actual teams.
 *
 * The head bobs on an idle loop and speeds up on hover; both are pure
 * `transform: rotate` on the compositor and both stop dead under
 * prefers-reduced-motion (see styles/landing.css).
 */
const Bobblehead: React.FC<BobbleheadProps> = ({ founder, size = 150, index = 0, className = '' }) => {
  const uid = useId().replace(/:/g, '');
  const [photoFailed, setPhotoFailed] = useState(false);
  const colors = getTeamColors(founder.team);
  const usePhoto = founder.photo === true && !photoFailed;

  const height = (size * 176) / 120;

  return (
    <svg
      // Intrinsic attributes reserve the right box before paint (no layout
      // shift); the CSS below lets the figure shrink on narrow screens rather
      // than pushing the row past the viewport.
      width={size}
      height={height}
      style={{ width: '100%', height: 'auto', maxWidth: size }}
      viewBox="0 0 120 176"
      className={`bobble-figure ${className}`}
      role="img"
      aria-label={`${founder.name} bobblehead in a ${founder.teamName} number ${founder.number} jersey`}
      focusable="false"
    >
      <defs>
        <clipPath id={`head-${uid}`}>
          <ellipse cx="60" cy="60" rx="40" ry="38" />
        </clipPath>
      </defs>

      {/* ── Base ── */}
      <ellipse cx="60" cy="168" rx="44" ry="7" fill="rgba(0,0,0,0.5)" />
      <rect x="19" y="148" width="82" height="20" rx="5" fill="#1a1a1d" />
      <rect
        x="19"
        y="148"
        width="82"
        height="20"
        rx="5"
        fill="none"
        stroke="var(--accent-gold)"
        strokeOpacity="0.5"
        strokeWidth="1.25"
      />
      <ellipse cx="60" cy="148" rx="41" ry="6" fill="#222226" />
      <text
        x="60"
        y="162"
        textAnchor="middle"
        fontFamily="var(--font-display)"
        fontSize="11"
        fontWeight="700"
        letterSpacing="1.6"
        fill="var(--accent-gold)"
      >
        {founder.firstName.toUpperCase()}
      </text>

      {/* ── Body: jersey ── */}
      <g>
        {/* sleeves */}
        <path d="M26 112c-4 5-6 13-6 22l14 3c1-9 3-16 6-21z" fill={colors.primary} />
        <path d="M94 112c4 5 6 13 6 22l-14 3c-1-9-3-16-6-21z" fill={colors.primary} />
        <path d="M20 130l14 3-1 8-14-3z" fill={colors.secondary} />
        <path d="M100 130l-14 3 1 8 14-3z" fill={colors.secondary} />

        {/* torso */}
        <path
          d="M60 100c-12 0-22 4-30 11-3 3-4 8-4 14v23c0 3 2 5 5 5h58c3 0 5-2 5-5v-23c0-6-1-11-4-14-8-7-18-11-30-11z"
          fill={colors.primary}
        />
        {/* shoulder stripes */}
        <path d="M33 108c-3 3-5 6-6 10l11 4c1-4 3-7 5-9z" fill={colors.secondary} opacity="0.9" />
        <path d="M87 108c3 3 5 6 6 10l-11 4c-1-4-3-7-5-9z" fill={colors.secondary} opacity="0.9" />
        {/* collar */}
        <path d="M49 101c3 6 6 9 11 9s8-3 11-9c-3-1-7-1-11-1s-8 0-11 1z" fill={colors.secondary} />
        {/* number */}
        <text
          x="60"
          y="138"
          textAnchor="middle"
          fontFamily="var(--font-display)"
          fontSize="30"
          fontWeight="800"
          fill="#ffffff"
          stroke={colors.secondary}
          strokeWidth="1.5"
          paintOrder="stroke"
        >
          {founder.number}
        </text>
      </g>

      {/* ── Spring ── */}
      <g stroke="#8b8b93" strokeWidth="2.5" fill="none" strokeLinecap="round">
        <path d="M53 100c14 0 14-4 0-4M53 96c14 0 14-4 0-4" />
      </g>

      {/* ── Head (the part that bobbles) ── */}
      <g className="bobble-head" style={{ animationDelay: `${index * 190}ms` }}>
        {/* ears */}
        <ellipse cx="20" cy="63" rx="6" ry="8" fill={founder.skin} />
        <ellipse cx="100" cy="63" rx="6" ry="8" fill={founder.skin} />

        <ellipse cx="60" cy="60" rx="40" ry="38" fill={founder.skin} />

        {usePhoto ? (
          <image
            href={`/founders/${founder.id}.png`}
            x="20"
            y="22"
            width="80"
            height="76"
            preserveAspectRatio="xMidYMid slice"
            clipPath={`url(#head-${uid})`}
            onError={() => setPhotoFailed(true)}
          />
        ) : (
          <>
            <Hair style={founder.hair} color={founder.hairColor} />

            {/* eyes */}
            <ellipse cx="46" cy="63" rx="7.5" ry="8.5" fill="#ffffff" />
            <ellipse cx="74" cy="63" rx="7.5" ry="8.5" fill="#ffffff" />
            <circle cx="47" cy="64" r="4.4" fill="#2a1d16" />
            <circle cx="75" cy="64" r="4.4" fill="#2a1d16" />
            <circle cx="48.6" cy="62" r="1.6" fill="#ffffff" />
            <circle cx="76.6" cy="62" r="1.6" fill="#ffffff" />

            {/* brows */}
            <path
              d="M38 51c4-3 11-3 15-1M67 50c4-2 11-2 15 1"
              stroke={founder.hairColor}
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
            />

            {/* cheeks */}
            <ellipse cx="37" cy="76" rx="6" ry="4" fill="#d97a63" opacity="0.28" />
            <ellipse cx="83" cy="76" rx="6" ry="4" fill="#d97a63" opacity="0.28" />

            {/* grin */}
            <path
              d="M46 79c4 6 9 9 14 9s10-3 14-9c-5 2-9 3-14 3s-9-1-14-3z"
              fill="#ffffff"
              stroke="#8c4638"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
          </>
        )}
      </g>
    </svg>
  );
};

export default Bobblehead;
