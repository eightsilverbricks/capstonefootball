import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import FoundersPortrait from '@/components/brand/FoundersPortrait';
import { openAuthDialog } from '@/hooks/useAuthDialog';

/** Hardcoded on purpose — this is a hype date, not derived from the shipped
 * dataset (which stays pinned to the 2024 demo season). Bump it by hand each
 * offseason. */

/**
 * An editorial split rather than a centered stack: the words on one side, the
 * three of us on the other. That pairing is the whole pitch — "alongside us"
 * only lands if you can see who "us" is while you read it.
 *
 * Deliberately no stat badge up top. Leading a page that's positioned against
 * raw-numbers sites with a raw number undercuts the entire argument; the proof
 * belongs further down, after the reader knows why they'd want it.
 */
const LandingHero: React.FC = () => (
  <section
    className="field-texture stadium-bloom relative overflow-hidden"
    aria-labelledby="landing-hero-heading"
  >
    <div className="max-w-6xl mx-auto px-4 pt-12 pb-12 sm:pt-16">
      <div className="grid gap-10 lg:gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] items-center">

        {/* ── Copy ── */}
        <div className="text-center lg:text-left">
          <h1
            id="landing-hero-heading"
            className="rise-in font-bold leading-[0.92] tracking-tight"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2.6rem, 6.5vw, 4.75rem)',
              color: 'var(--text-primary)',
              '--rise-delay': '70ms',
            } as React.CSSProperties}
          >
            NFL predictions, explained in plain English.
          </h1>

          <p
            className="rise-in mt-5 text-base sm:text-lg leading-relaxed mx-auto lg:mx-0 max-w-lg"
            style={{ color: 'var(--text-secondary)', '--rise-delay': '140ms' } as React.CSSProperties}
          >
            Every game gets a Clark Report: who Clark picks, why, and how the other team
            could win. Then make your own picks and track your record.
          </p>

          <div
            className="rise-in flex flex-col sm:flex-row items-stretch sm:items-center justify-center lg:justify-start gap-3 mt-8"
            style={{ '--rise-delay': '210ms' } as React.CSSProperties}
          >
            <button
              type="button"
              onClick={() => openAuthDialog('signup')}
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg text-sm font-semibold uppercase tracking-wide transition-transform duration-150 hover:-translate-y-0.5"
              style={{ background: 'var(--accent-gold)', color: '#111' }}
            >
              Create your free account
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
            <Link
              to="/games"
              className="shine-cta group inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg text-sm font-semibold uppercase tracking-wide no-underline transition-transform duration-150 hover:-translate-y-0.5"
              style={{
                color: 'var(--accent-gold)',
                background: 'var(--accent-gold-dim)',
                border: '1.5px solid var(--accent-gold)',
                boxShadow: '0 8px 24px -10px rgba(200,169,110,0.55)',
              }}
            >
              <span className="relative z-[2]">See this week's games</span>
              <ArrowRight
                className="relative z-[2] w-4 h-4 transition-transform duration-200 group-hover:translate-x-1"
                aria-hidden="true"
              />
            </Link>
          </div>

          <p className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
            Free. No betting.
          </p>
        </div>

        {/* ── The three of us ── */}
        <div
          className="rise-in relative w-full max-w-md lg:max-w-none mx-auto"
          style={{ '--rise-delay': '280ms' } as React.CSSProperties}
        >
          <FoundersPortrait />
        </div>
      </div>
    </div>
  </section>
);

export default LandingHero;
