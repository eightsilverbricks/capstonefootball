import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import BobbleheadRow from '@/components/brand/BobbleheadRow';
import { openAuthDialog } from '@/hooks/useAuthDialog';

interface LandingHeroProps {
  /** Total games in the shipped dataset — shown as live proof, not a claim. */
  gamesAnalyzed: number;
}

/**
 * The first thing anyone sees: who we are, what this is, and one button.
 * The three of us are the hero image — no stock photography, no gradient blob.
 */
const LandingHero: React.FC<LandingHeroProps> = ({ gamesAnalyzed }) => (
  <section
    className="field-texture stadium-bloom relative overflow-hidden"
    aria-labelledby="landing-hero-heading"
  >
    <div className="max-w-5xl mx-auto px-4 pt-14 pb-10 sm:pt-20 flex flex-col items-center text-center">
      <span
        className="rise-in inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] px-3 py-1.5 rounded-full mb-6"
        style={{
          color: 'var(--accent-gold)',
          background: 'var(--accent-gold-dim)',
          border: '1px solid rgba(200,169,110,0.25)',
        }}
      >
        <Sparkles className="w-3 h-3" aria-hidden="true" />
        {gamesAnalyzed > 0 ? `${gamesAnalyzed} games broken down` : 'Football, explained'}
      </span>

      <h1
        id="landing-hero-heading"
        className="rise-in font-bold leading-[0.9] tracking-tight max-w-3xl"
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(2.75rem, 8vw, 6rem)',
          color: 'var(--text-primary)',
          '--rise-delay': '80ms',
        } as React.CSSProperties}
      >
        Learn football{' '}
        <em className="not-italic" style={{ color: 'var(--accent-gold)' }}>
          alongside us
        </em>
        .
      </h1>

      <p
        className="rise-in mt-6 max-w-xl text-base sm:text-lg leading-relaxed"
        style={{ color: 'var(--text-secondary)', '--rise-delay': '160ms' } as React.CSSProperties}
      >
        We're three fans who got tired of stats that explain nothing. The Clark Report takes every
        matchup apart in plain English — then you go make your picks and see how you stack up.
      </p>

      <div
        className="rise-in flex flex-col sm:flex-row items-center gap-3 mt-8"
        style={{ '--rise-delay': '240ms' } as React.CSSProperties}
      >
        <button
          type="button"
          onClick={() => openAuthDialog('signup')}
          className="inline-flex items-center gap-2 px-6 py-3.5 rounded-lg text-sm font-semibold uppercase tracking-wide transition-transform duration-150 hover:-translate-y-0.5"
          style={{ background: 'var(--accent-gold)', color: '#111' }}
        >
          Create your free account
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </button>
        <Link
          to="/games"
          className="inline-flex items-center gap-2 px-6 py-3.5 rounded-lg text-sm font-semibold uppercase tracking-wide no-underline transition-colors"
          style={{
            color: 'var(--text-secondary)',
            border: '1px solid var(--border-default)',
          }}
        >
          Look around first
        </Link>
      </div>

      <p className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
        No card, no odds, no risk — just bragging rights.
      </p>

      {/* The three of us, on a shelf */}
      <div className="mt-10 sm:mt-14 w-full">
        <BobbleheadRow size={124} />
      </div>
    </div>
  </section>
);

export default LandingHero;
