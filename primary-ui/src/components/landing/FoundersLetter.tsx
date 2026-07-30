import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import BobbleheadRow from '@/components/brand/BobbleheadRow';
import { FOUNDER_SIGNATURE } from '@/data/founders';

/**
 * The welcome note, in our own words. Set as an editorial letter — gold rule,
 * serif body, hand-signed — rather than another marketing card, because it's
 * the one place on the page where we're talking rather than selling.
 *
 * The signature block doubles as the About-page tease.
 */
const FoundersLetter: React.FC = () => (
  <section aria-labelledby="welcome-heading" className="max-w-3xl mx-auto px-4">
    <article
      className="relative rounded-2xl px-6 py-8 sm:px-12 sm:py-12"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border-subtle)',
        borderLeft: '3px solid var(--accent-gold)',
      }}
    >
      <h2
        id="welcome-heading"
        className="font-bold leading-tight mb-6"
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(1.75rem, 4vw, 2.75rem)',
          color: 'var(--text-primary)',
        }}
      >
        Welcome to The Clark Index!
      </h2>

      <div className="flex flex-col gap-5">
        <p
          className="text-base sm:text-lg leading-relaxed"
          style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-display)', fontWeight: 300 }}
        >
          Football is more than just numbers — it's about understanding the story behind them. The
          Clark Report makes advanced stats simple, transparent, and easy to follow, so you can dive
          deeper into every matchup and make smarter picks.
        </p>
        <p
          className="text-base sm:text-lg leading-relaxed"
          style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-display)', fontWeight: 300 }}
        >
          Start competing today in The Clark Competition, challenge your friends, and see how your
          football knowledge stacks up. No risk, just fun, strategy, and bragging rights.
        </p>
        <p
          className="text-base sm:text-lg leading-relaxed"
          style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)', fontWeight: 300 }}
        >
          Thank you for joining our community!
        </p>
      </div>

      {/* Signature — and the doorway to the About page */}
      <div
        className="mt-8 pt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-5"
        style={{ borderTop: '1px solid var(--border-subtle)' }}
      >
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <BobbleheadRow size={44} showCaptions={false} className="!gap-0.5 shrink-0 !w-auto" />
          <p
            className="italic text-lg leading-none"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--accent-gold)' }}
          >
            — {FOUNDER_SIGNATURE}
          </p>
        </div>

        <Link
          to="/about"
          className="inline-flex items-center gap-1.5 text-sm no-underline shrink-0 transition-colors hover:text-[var(--text-primary)]"
          style={{ color: 'var(--text-tertiary)' }}
        >
          Read our story
          <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
        </Link>
      </div>
    </article>
  </section>
);

export default FoundersLetter;
