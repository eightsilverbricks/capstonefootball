import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import RecordPreview from './RecordPreview';
import HomeHighlights from './HomeHighlights';
import { usePredictions } from '@/hooks/usePredictions';
import { resolveCurrentWeek, weekTitle } from '@/lib/currentWeek';
import { AlertCircle, ArrowRight, RefreshCw } from 'lucide-react';

/**
 * The homepage — a clean dashboard, not an inventory. Masthead for the current
 * week, a small "your situation" preview, a few highlighted top reads, and a
 * button through to the full Games page. The old news-style widgets (The Signal
 * + Story Modules) live on GamesView-adjacent code no longer, and the full
 * interactive game list moved to /games.
 */
const HomeDashboard: React.FC = () => {
  const { predictions, loading, error, reload } = usePredictions();

  const availableWeeks = useMemo(
    () => [...new Set(predictions.map((g) => g.week))].sort((a, b) => a - b),
    [predictions],
  );
  const currentWeek = resolveCurrentWeek(availableWeeks);
  const weekGames = useMemo(
    () => predictions.filter((g) => g.week === currentWeek),
    [predictions, currentWeek],
  );

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--text-primary)' }}>
      <Header />

      <main className="max-w-5xl mx-auto px-4 pt-10 pb-16 flex flex-col gap-10">

        {/* ── Masthead ── */}
        <section>
          <div className="flex items-end justify-between gap-6 mb-2">
            <span className="text-[11px] uppercase tracking-[0.24em]" style={{ color: 'var(--text-muted)' }}>
              Season 2024 · the model lens
            </span>
            {predictions.length > 0 && (
              <span className="text-[11px] uppercase tracking-[0.24em] hidden md:inline" style={{ color: 'var(--text-muted)' }}>
                {predictions.length} games analyzed
              </span>
            )}
          </div>
          <h1
            className="font-bold leading-[0.92] tracking-tight"
            style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.5rem, 6vw, 5.5rem)', color: 'var(--text-primary)' }}
          >
            {weekTitle(currentWeek)}
          </h1>
        </section>

        {/* ── Your situation ── */}
        <section aria-label="Your predicting situation">
          <RecordPreview variant="full" />
        </section>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <RefreshCw className="w-8 h-8 text-white/30 animate-spin" />
            <p className="text-sm text-white/40">Loading predictions…</p>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="rounded-xl border border-red-800/50 bg-red-950/20 p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
              <div>
                <h3 className="text-white font-semibold mb-1">Couldn't load predictions</h3>
                <p className="text-red-300/70 text-sm mb-3">{error}</p>
                <p className="text-white/30 text-xs mb-4">Make sure the prediction API is running, then try again.</p>
                <button onClick={reload} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm rounded-lg transition-colors">
                  Retry
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── This week's top reads + CTA ── */}
        {!loading && !error && weekGames.length > 0 && (
          <section aria-label="This week's top reads">
            <div className="flex items-baseline justify-between gap-4 mb-4 pb-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <h2 className="text-xs uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                This week's top reads
              </h2>
              <span className="text-xs uppercase tracking-widest tabular-nums" style={{ color: 'var(--text-muted)' }}>
                {weekGames.length} games
              </span>
            </div>

            <HomeHighlights games={weekGames} limit={4} />

            <Link
              to="/games"
              className="inline-flex items-center gap-2 mt-6 px-5 py-3 rounded-lg text-sm font-semibold uppercase tracking-wide no-underline transition-colors"
              style={{ background: 'var(--accent-gold)', color: '#111' }}
            >
              View all games <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default HomeDashboard;
