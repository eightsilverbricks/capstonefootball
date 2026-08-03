import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Lock } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import HomeHighlights from '@/components/HomeHighlights';
import LandingHero from '@/components/landing/LandingHero';
import WhyClark from '@/components/landing/WhyClark';
import FoundersLetter from '@/components/landing/FoundersLetter';
import HowItWorks from '@/components/landing/HowItWorks';
import ReelPanel from '@/components/landing/ReelPanel';
import ReportPeekDialog from '@/components/landing/ReportPeekDialog';
import SectionIntro from '@/components/landing/SectionIntro';
import { usePredictions } from '@/hooks/usePredictions';
import { openAuthDialog } from '@/hooks/useAuthDialog';
import { resolveCurrentWeek, weekTitle } from '@/lib/currentWeek';
import { computeModelRecord } from '@/lib/modelRecord';
import { getHeroFactor } from '@/lib/heroInsight';
import { getConfidenceScore } from '@/types/prediction';

/**
 * The signed-out front door. Everything a first-time visitor needs: who we are,
 * what the product does (with a real report they can open), the intro reel, a
 * live look at this week's board, and one account button repeated wherever the
 * decision naturally lands.
 *
 * Signed-in visitors get HomeDashboard instead — see pages/Index.tsx. This page
 * stays reachable at /welcome so the story is always linkable.
 */
const LandingPage: React.FC = () => {
  const { predictions, loading } = usePredictions();
  const [peekOpen, setPeekOpen] = useState(false);

  const record = useMemo(() => computeModelRecord(predictions), [predictions]);

  const availableWeeks = useMemo(
    () => [...new Set(predictions.map((g) => g.week))].sort((a, b) => a - b),
    [predictions],
  );
  const currentWeek = resolveCurrentWeek(availableWeeks);
  const weekGames = useMemo(
    () => predictions.filter((g) => g.week === currentWeek),
    [predictions, currentWeek],
  );

  // The showcase game fronts the whole pitch, so pick the strongest example in
  // the season rather than whatever happens to lead the current week.
  //
  // Week >= 4 matters: the "last 3" fields carry over from the prior season
  // early on, so a Week 1 game shows both teams at an identical, unexplained
  // 1-2 — confusing on a panel whose entire claim is that the numbers are real.
  // Requiring a factor headline guarantees the right-hand column has prose.
  const peekGame = useMemo(() => {
    const byConfidence = (a: typeof predictions[number], b: typeof predictions[number]) =>
      getConfidenceScore(b) - getConfidenceScore(a);

    // The right-hand column has to earn its place. Momentum just restates the
    // last-3 records already sitting in the left column, and Market Edge just
    // restates the spread — pick a game whose lead factor surfaces something
    // the stat sheet genuinely cannot show, like a pass-rush or efficiency edge.
    const ADDS_NEW_INFORMATION = new Set(['Defensive Edge', 'Recent Offense']);

    const strongExample = predictions
      .filter((g) => {
        if (g.week < 4) return false;
        const hero = getHeroFactor(g);
        return Boolean(hero?.headline) && ADDS_NEW_INFORMATION.has(hero!.name);
      })
      .sort(byConfidence)[0];

    return strongExample ?? [...weekGames].sort(byConfidence)[0] ?? null;
  }, [predictions, weekGames]);

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--text-primary)' }}>
      <Header />

      <main className="flex flex-col" style={{ gap: 'var(--space-section)', paddingBottom: 'var(--space-section)' }}>
        <LandingHero />

        {/* Prove the claim before asking anyone to care who we are. */}
        {!loading && peekGame && (
          <WhyClark game={peekGame} record={record} onPeek={() => setPeekOpen(true)} />
        )}

        <FoundersLetter />

        <HowItWorks onPeek={() => setPeekOpen(true)} canPeek={peekGame != null} />

        <ReelPanel />

        {/* ── A live look at the board ── */}
        {weekGames.length > 0 && (
          <section aria-labelledby="week-peek-heading" className="max-w-5xl mx-auto px-4 w-full">
            <div
              className="flex flex-wrap items-end justify-between gap-3 mb-6 pb-4"
              style={{ borderBottom: '1px solid var(--border-subtle)' }}
            >
              <SectionIntro
                id="week-peek-heading"
                kicker="Live right now"
                heading="Go read one yourself."
              />
              <span className="text-[11px] uppercase tracking-[0.2em] pb-1" style={{ color: 'var(--text-muted)' }}>
                {weekTitle(currentWeek)} · {weekGames.length} games
              </span>
            </div>

            <HomeHighlights games={weekGames} limit={4} />

            <div
              className="mt-4 rounded-xl px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              style={{ background: 'var(--surface)', border: '1px dashed var(--border-default)' }}
            >
              <p className="flex items-start gap-2.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
                <Lock className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--accent-gold)' }} aria-hidden="true" />
                Reading is free. Making picks, tracking your record, and going head-to-head with
                Clark needs an account.
              </p>
              <button
                type="button"
                onClick={() => openAuthDialog('signup')}
                className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold uppercase tracking-wide"
                style={{ background: 'var(--accent-gold)', color: '#111' }}
              >
                Get started
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </section>
        )}

        {/* ── Closing band ── */}
        <section className="max-w-5xl mx-auto px-4 w-full">
          <div
            className="field-texture rounded-2xl px-6 py-12 sm:px-12 sm:py-16 text-center"
            style={{ background: 'var(--surface)', border: '1px solid var(--border-default)' }}
          >
            <h2
              className="font-bold leading-tight mb-4 mx-auto max-w-2xl"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(1.9rem, 5vw, 3.25rem)',
                color: 'var(--text-primary)',
              }}
            >
              Your first pick is one click away.
            </h2>
            <p className="text-base mb-8 mx-auto max-w-lg" style={{ color: 'var(--text-secondary)' }}>
              Free forever, no card, no odds. Just you, the numbers, and whoever you can talk into
              playing against you.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => openAuthDialog('signup')}
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-lg text-sm font-semibold uppercase tracking-wide transition-transform duration-150 hover:-translate-y-0.5"
                style={{ background: 'var(--accent-gold)', color: '#111' }}
              >
                Create your free account
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
              <Link
                to="/about"
                className="inline-flex items-center px-7 py-3.5 rounded-lg text-sm font-semibold uppercase tracking-wide no-underline"
                style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}
              >
                Meet the team
              </Link>
            </div>
          </div>
        </section>
      </main>

      <ReportPeekDialog open={peekOpen} onOpenChange={setPeekOpen} game={peekGame} />

      <Footer />
    </div>
  );
};

export default LandingPage;
