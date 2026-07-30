import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowRight, RefreshCw } from 'lucide-react';
import Header from './Header';
import Footer from './Footer';
import HomeHighlights from './HomeHighlights';
import HomeHero from './home/HomeHero';
import AccountPanel from './home/AccountPanel';
import FeaturedGame from './home/FeaturedGame';
import WeekPulseGrid from './home/WeekPulseGrid';
import StorylineRail from './home/StorylineRail';
import { usePredictions } from '@/hooks/usePredictions';
import { useAuth } from '@/hooks/useAuth';
import { openAuthDialog } from '@/hooks/useAuthDialog';
import { resolveCurrentWeek } from '@/lib/currentWeek';
import { computeModelRecord } from '@/lib/modelRecord';
import { selectWeekPulse } from '@/lib/weekPulse';
import { selectStorylines } from '@/lib/leagueStorylines';
import { gameKey } from '@/lib/threeWaySignal';
import { ApiPrediction, getConfidenceScore } from '@/types/prediction';

/** Section heading + optional right-hand meta, used for every band below. */
const SectionHead: React.FC<{ title: string; meta?: string; id: string }> = ({ title, meta, id }) => (
  <div
    className="flex flex-wrap items-baseline justify-between gap-3 mb-4 pb-3"
    style={{ borderBottom: '1px solid var(--border-subtle)' }}
  >
    <h2
      id={id}
      className="font-bold"
      style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.25rem, 2.5vw, 1.75rem)', color: 'var(--text-primary)' }}
    >
      {title}
    </h2>
    {meta && (
      <span className="text-[11px] uppercase tracking-[0.2em] tabular-nums" style={{ color: 'var(--text-muted)' }}>
        {meta}
      </span>
    )}
  </div>
);

/**
 * The signed-in home page: your situation up top, then the week's marquee game,
 * four quick reads, the storyline rail, and the rest of the board.
 *
 * Signed-out visitors never see this — pages/Index.tsx routes them to
 * LandingPage — but it degrades gracefully anyway (no account panel, a sign-up
 * prompt in its place) so /` stays useful if someone lands here mid-sign-out.
 */
const HomeDashboard: React.FC = () => {
  const { predictions, loading, error, reload } = usePredictions();
  const { user } = useAuth();

  const availableWeeks = useMemo(
    () => [...new Set(predictions.map((g) => g.week))].sort((a, b) => a - b),
    [predictions],
  );
  const currentWeek = resolveCurrentWeek(availableWeeks);
  const weekGames = useMemo(
    () => predictions.filter((g) => g.week === currentWeek),
    [predictions, currentWeek],
  );

  const record = useMemo(() => computeModelRecord(predictions), [predictions]);

  // Your team's game wins the featured slot; otherwise the week's clearest read.
  const featured = useMemo<{ game: ApiPrediction; isYourTeam: boolean } | null>(() => {
    if (weekGames.length === 0) return null;
    const yours = user?.favoriteTeam
      ? weekGames.find((g) => g.home_team === user.favoriteTeam || g.away_team === user.favoriteTeam)
      : undefined;
    if (yours) return { game: yours, isYourTeam: true };
    const marquee = [...weekGames].sort((a, b) => getConfidenceScore(b) - getConfidenceScore(a))[0];
    return { game: marquee, isYourTeam: false };
  }, [weekGames, user?.favoriteTeam]);

  // Everything below the marquee reads from the remaining games, so the featured
  // matchup never turns up again as a widget, a storyline, and a board row.
  const restOfBoard = useMemo(
    () => (featured ? weekGames.filter((g) => gameKey(g) !== gameKey(featured.game)) : weekGames),
    [weekGames, featured],
  );

  const pulse = useMemo(() => selectWeekPulse(restOfBoard), [restOfBoard]);
  const storylines = useMemo(() => selectStorylines(restOfBoard, 6), [restOfBoard]);

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--text-primary)' }}>
      <Header />

      <main className="max-w-5xl mx-auto px-4 pt-10 pb-16 flex flex-col gap-10">
        <HomeHero user={user} week={currentWeek} gamesThisWeek={weekGames.length} record={record} />

        {/* ── Your situation ── */}
        {user ? (
          <AccountPanel user={user} allGames={predictions} weekGames={weekGames} />
        ) : (
          <section
            className="rounded-xl px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            style={{ background: 'var(--surface)', border: '1px dashed var(--border-default)' }}
          >
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Create a free account to make picks, keep a record, and go head-to-head with Clark.
            </p>
            <button
              type="button"
              onClick={() => openAuthDialog('signup')}
              className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold uppercase tracking-wide"
              style={{ background: 'var(--accent-gold)', color: '#111' }}
            >
              Get started <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </section>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <RefreshCw className="w-8 h-8 animate-spin" style={{ color: 'var(--text-muted)' }} />
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading predictions…</p>
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

        {!loading && !error && featured && (
          <>
            {/* ── The marquee ── */}
            <section aria-labelledby="featured-heading">
              <SectionHead
                id="featured-heading"
                title={featured.isYourTeam ? 'Your team this week' : 'The one to watch'}
                meta={featured.game.week_label ?? `Week ${currentWeek}`}
              />
              <FeaturedGame game={featured.game} isYourTeam={featured.isYourTeam} />
            </section>

            {/* ── Quick reads ── */}
            {pulse.length > 0 && (
              <section aria-labelledby="pulse-heading">
                <SectionHead id="pulse-heading" title="The week at a glance" meta={`${pulse.length} reads`} />
                <WeekPulseGrid items={pulse} />
              </section>
            )}

            {/* ── Storylines ── */}
            {storylines.length > 0 && (
              <section aria-labelledby="storylines-heading">
                <SectionHead
                  id="storylines-heading"
                  title="Around the league"
                  meta="Model write-ups"
                />
                <StorylineRail storylines={storylines} />
              </section>
            )}

            {/* ── Rest of the board ── */}
            {restOfBoard.length > 0 && (
              <section aria-labelledby="board-heading">
                <SectionHead id="board-heading" title="Rest of the board" meta={`${restOfBoard.length} games`} />
                <HomeHighlights games={restOfBoard} limit={4} />
                <Link
                  to="/games"
                  className="inline-flex items-center gap-2 mt-5 px-5 py-3 rounded-lg text-sm font-semibold uppercase tracking-wide no-underline transition-transform duration-150 hover:-translate-y-0.5"
                  style={{ background: 'var(--accent-gold)', color: '#111' }}
                >
                  View all games <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </Link>
              </section>
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default HomeDashboard;
