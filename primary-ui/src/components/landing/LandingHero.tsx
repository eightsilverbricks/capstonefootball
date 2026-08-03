import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import FoundersPortrait from '@/components/brand/FoundersPortrait';
import { openAuthDialog } from '@/hooks/useAuthDialog';

/** Hardcoded on purpose — this is a hype date, not derived from the shipped
 * dataset (which stays pinned to the 2024 demo season). Bump it by hand each
 * offseason. */
const UPCOMING_SEASON = 2026;

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
          <p
            className="rise-in text-[11px] uppercase tracking-[0.24em] mb-5"
            style={{ color: 'var(--accent-gold)' }}
          >
            Not another wall of stats
          </p>

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
            Learn football{' '}
            <em className="not-italic" style={{ color: 'var(--accent-gold)' }}>
              alongside us
            </em>
            .
          </h1>

          <p
            className="rise-in mt-5 text-base sm:text-lg leading-relaxed mx-auto lg:mx-0 max-w-lg"
            style={{ color: 'var(--text-secondary)', '--rise-delay': '140ms' } as React.CSSProperties}
          >
            Anybody can hand you a win probability. We're three fans who'd rather tell you where it
            came from — every matchup taken apart in plain English, then you go make your picks.
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
            No card, no odds, no risk — just bragging rights.
          </p>
        </div>

        {/* ── The three of us, with the season tag pinned to the frame ── */}
        <div
          className="rise-in relative w-full max-w-md lg:max-w-none mx-auto"
          style={{ '--rise-delay': '280ms' } as React.CSSProperties}
        >
          <FoundersPortrait />
          <div
            className="stadium-sign absolute -top-3 right-2 sm:right-4 px-3.5 py-1.5 z-10"
            aria-hidden="true"
          >
            <p className="leading-tight text-center whitespace-nowrap">
              <span className="block text-[8px] font-semibold uppercase tracking-[0.18em] opacity-80">
                Get ready for the
              </span>
              <span
                className="block font-bold uppercase tracking-wide"
                style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem' }}
              >
                {UPCOMING_SEASON} Season
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  </section>
);

export default LandingHero;
