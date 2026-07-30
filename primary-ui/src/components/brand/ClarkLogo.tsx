import React from 'react';

type LogoVariant = 'mark' | 'full' | 'stacked';

interface ClarkLogoProps {
  /** 'mark' = badge only · 'full' = badge + horizontal wordmark · 'stacked' = badge above wordmark. */
  variant?: LogoVariant;
  /** Badge edge length in px. The wordmark scales off it. */
  size?: number;
  className?: string;
}

const MARK_TITLE_ID = 'clark-logo-title';

/**
 * The Clark Index mark: three ascending bars (the index) topped by a football
 * (the sport). Drawn, not imported, so it stays crisp at every size, inherits
 * the gold token, and never depends on a binary asset being present.
 *
 * The same geometry is mirrored in public/logo.svg + public/favicon.svg — edit
 * both if the shape changes.
 */
export const ClarkMark: React.FC<{ size?: number; className?: string; titled?: boolean }> = ({
  size = 32,
  className = '',
  titled = true,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    className={className}
    role={titled ? 'img' : 'presentation'}
    aria-labelledby={titled ? MARK_TITLE_ID : undefined}
    aria-hidden={titled ? undefined : true}
    focusable="false"
  >
    {titled && <title id={MARK_TITLE_ID}>The Clark Index</title>}
    <rect x="1" y="1" width="46" height="46" rx="11" fill="var(--accent-gold)" />
    <rect
      x="1"
      y="1"
      width="46"
      height="46"
      rx="11"
      fill="none"
      stroke="rgba(0,0,0,0.22)"
      strokeWidth="1.5"
    />

    {/* The index — three ascending bars */}
    <g fill="#121212">
      <rect x="9" y="29" width="6" height="10" rx="2" />
      <rect x="18" y="23" width="6" height="16" rx="2" />
      <rect x="27" y="17" width="6" height="22" rx="2" />
    </g>

    {/* The football, cresting the tallest bar */}
    <g transform="rotate(-38 36 12)">
      <ellipse cx="36" cy="12" rx="8.4" ry="5.2" fill="#121212" />
      <path
        d="M31.4 12h9.2M34 9.8v4.4M36 9.4v5.2M38 9.8v4.4"
        stroke="var(--accent-gold)"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </g>
  </svg>
);

const ClarkLogo: React.FC<ClarkLogoProps> = ({ variant = 'full', size = 32, className = '' }) => {
  if (variant === 'mark') return <ClarkMark size={size} className={className} />;

  const wordSize = variant === 'stacked' ? size * 0.62 : size * 0.58;

  const wordmark = (
    <span className="flex items-baseline gap-1.5 leading-none whitespace-nowrap">
      <span
        className="font-bold tracking-tight"
        style={{ fontFamily: 'var(--font-display)', fontSize: wordSize, color: 'var(--text-primary)' }}
      >
        Clark
      </span>
      <span
        className="italic"
        style={{ fontFamily: 'var(--font-display)', fontSize: wordSize, color: 'var(--text-tertiary)' }}
      >
        Index
      </span>
    </span>
  );

  if (variant === 'stacked') {
    return (
      <span className={`inline-flex flex-col items-center gap-3 ${className}`}>
        <ClarkMark size={size} />
        {wordmark}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <ClarkMark size={size} />
      {wordmark}
    </span>
  );
};

export default ClarkLogo;
