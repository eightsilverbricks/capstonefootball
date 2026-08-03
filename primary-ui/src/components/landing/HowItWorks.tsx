import React from 'react';
import { BookOpen, Eye, Flame, Trophy } from 'lucide-react';
import SectionIntro from './SectionIntro';
import { openAuthDialog } from '@/hooks/useAuthDialog';

interface HowItWorksProps {
  /** Opens the sample Clark Report pop-up. Hidden when no game is loaded yet. */
  onPeek: () => void;
  canPeek: boolean;
}

/**
 * Three steps, deliberately unequal: step one is the product, so it gets a
 * double-width panel and the only interactive proof on the page. Steps two and
 * three are the loop that keeps people coming back.
 */
const HowItWorks: React.FC<HowItWorksProps> = ({ onPeek, canPeek }) => (
  <section aria-labelledby="how-it-works-heading" className="max-w-5xl mx-auto px-4">
    <div
      className="flex flex-wrap items-end justify-between gap-4 mb-6 pb-4"
      style={{ borderBottom: '1px solid var(--border-subtle)' }}
    >
      <SectionIntro id="how-it-works-heading" kicker="How it works" heading="Read it. Call it. Live with it." />
      <span className="text-[11px] uppercase tracking-[0.2em] pb-1" style={{ color: 'var(--text-muted)' }}>
        Three steps
      </span>
    </div>

    <div className="grid gap-3 md:grid-cols-2">
      {/* Step 1 — the product itself, given the most room */}
      <article
        className="md:row-span-2 rounded-xl p-6 flex flex-col justify-between rise-in"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border-subtle)',
          borderTop: '2px solid var(--accent-gold)',
        }}
      >
        <div>
          <div className="flex items-center gap-2.5 mb-4">
            <span
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--accent-gold-dim)', color: 'var(--accent-gold)' }}
            >
              <BookOpen className="w-[18px] h-[18px]" aria-hidden="true" />
            </span>
            <span className="text-[10px] uppercase tracking-[0.22em]" style={{ color: 'var(--text-muted)' }}>
              Step one
            </span>
          </div>

          <h3
            className="font-bold leading-tight mb-3"
            style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', color: 'var(--text-primary)' }}
          >
            Read the matchup, not the spread
          </h3>
          <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>
            Every game gets a Clark Report: who Clark likes and by how much, the three or four
            things actually driving it, what the market thinks, the weather, the quarterback play —
            and, honestly, how the whole read falls apart. No jargon, no black box. If you've never
            heard of EPA, you'll still follow every word.
          </p>
        </div>

        {canPeek && (
          <button
            type="button"
            onClick={onPeek}
            className="lift-card inline-flex items-center justify-center gap-2 w-full rounded-lg px-4 py-3 text-sm font-semibold"
            style={{
              background: 'var(--surface-raised)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-primary)',
            }}
          >
            <Eye className="w-4 h-4" style={{ color: 'var(--accent-gold)' }} aria-hidden="true" />
            Peek inside a real report
          </button>
        )}
      </article>

      {/* Step 2 */}
      <article
        className="rounded-xl p-6 rise-in"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border-subtle)',
          '--rise-delay': '90ms',
        } as React.CSSProperties}
      >
        <div className="flex items-center gap-2.5 mb-4">
          <span
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(74,222,128,0.12)', color: 'var(--status-decisive)' }}
          >
            <Flame className="w-[18px] h-[18px]" aria-hidden="true" />
          </span>
          <span className="text-[10px] uppercase tracking-[0.22em]" style={{ color: 'var(--text-muted)' }}>
            Step two
          </span>
        </div>
        <h3
          className="font-bold leading-tight mb-2"
          style={{ fontFamily: 'var(--font-display)', fontSize: '1.35rem', color: 'var(--text-primary)' }}
        >
          Pick a side — and say how sure you are
        </h3>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          Back a team, then slide your conviction from 50% to 100%. Sure things are worth up to 50
          credits. Hedge at 50% and you take no position at all. That second choice is where the
          skill lives.
        </p>
      </article>

      {/* Step 3 */}
      <article
        className="rounded-xl p-6 rise-in"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border-subtle)',
          '--rise-delay': '180ms',
        } as React.CSSProperties}
      >
        <div className="flex items-center gap-2.5 mb-4">
          <span
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ background: 'var(--accent-gold-dim)', color: 'var(--accent-gold)' }}
          >
            <Trophy className="w-[18px] h-[18px]" aria-hidden="true" />
          </span>
          <span className="text-[10px] uppercase tracking-[0.22em]" style={{ color: 'var(--text-muted)' }}>
            Step three
          </span>
        </div>
        <h3
          className="font-bold leading-tight mb-2"
          style={{ fontFamily: 'var(--font-display)', fontSize: '1.35rem', color: 'var(--text-primary)' }}
        >
          Beat the model. Then beat your friends.
        </h3>
        <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>
          Your record, your streak, and your score against Clark on the exact same games — so you
          always know whether you're actually good or just riding the favorites.
        </p>
        <button
          type="button"
          onClick={() => openAuthDialog('signup')}
          className="text-sm font-semibold underline underline-offset-4"
          style={{ color: 'var(--accent-gold)' }}
        >
          Start your season →
        </button>
      </article>
    </div>
  </section>
);

export default HowItWorks;
