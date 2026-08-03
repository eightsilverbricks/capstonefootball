import React from 'react';

interface SectionIntroProps {
  /** Small gold kicker — the running voice that ties the bands together. */
  kicker: string;
  heading: string;
  /** Optional one-line lede under the heading. */
  lede?: string;
  id: string;
  align?: 'left' | 'center';
  className?: string;
}

/**
 * The landing page's connective tissue. Every band opens the same way — gold
 * kicker, display heading, optional lede — so the page reads as one publication
 * with a running voice instead of a stack of unrelated marketing cards.
 */
const SectionIntro: React.FC<SectionIntroProps> = ({
  kicker,
  heading,
  lede,
  id,
  align = 'left',
  className = '',
}) => (
  <div className={`${align === 'center' ? 'text-center mx-auto max-w-2xl' : 'max-w-2xl'} ${className}`}>
    <p className="text-[11px] uppercase tracking-[0.24em] mb-3" style={{ color: 'var(--accent-gold)' }}>
      {kicker}
    </p>
    <h2
      id={id}
      className="font-bold leading-[1.05] tracking-tight"
      style={{
        fontFamily: 'var(--font-display)',
        fontSize: 'clamp(1.6rem, 3.8vw, 2.6rem)',
        color: 'var(--text-primary)',
      }}
    >
      {heading}
    </h2>
    {lede && (
      <p className="mt-3 text-base leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        {lede}
      </p>
    )}
  </div>
);

export default SectionIntro;
