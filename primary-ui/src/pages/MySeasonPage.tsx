import React from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import WeeklyPerformance from '@/components/my-season/WeeklyPerformance';
import ShareableWeekCard from '@/components/my-season/ShareableWeekCard';
import PickHighlightCard from '@/components/my-season/PickHighlightCard';
import FanbaseStandings from '@/components/my-season/FanbaseStandings';
import StatStrip from '@/components/StatStrip';
import { usePredictions } from '@/hooks/usePredictions';
import { useUserPicks } from '@/hooks/useUserPicks';
import { useFanIdentity } from '@/hooks/useFanIdentity';
import { useFanSentiment } from '@/hooks/useFanSentiment';
import { useAuth } from '@/hooks/useAuth';
import { openAuthDialog } from '@/hooks/useAuthDialog';
import { computeSeasonSummary } from '@/lib/seasonSummary';
import { computeSeasonHistory } from '@/lib/seasonHistory';
import { computeFanbaseStandings, gameKey } from '@/lib/threeWaySignal';
import { signed, stakeColor, pct } from '@/lib/format';

const MySeasonPage: React.FC = () => {
  const { predictions } = usePredictions();
  const { picks } = useUserPicks();
  const { team: fanTeam } = useFanIdentity();
  const { isSignedIn } = useAuth();

  // Only the user's own picked games need a community read here; the fanbase
  // standings come from the season-wide totals the same hook loads.
  const pickedKeys = React.useMemo(() => Object.keys(picks), [picks]);
  const { sentiment, fanbases: fanbaseTotals, status: sentimentStatus } = useFanSentiment(pickedKeys);

  const summary = computeSeasonSummary(picks, predictions);
  const history = React.useMemo(
    () => computeSeasonHistory(picks, predictions, sentiment),
    [picks, predictions, sentiment],
  );
  const fanbases = React.useMemo(
    () => computeFanbaseStandings(predictions, fanbaseTotals),
    [predictions, fanbaseTotals],
  );
  // Lets PickHighlightCard build a full share card (B4) from just the highlight's key.
  const gameByKey = React.useMemo(
    () => new Map(predictions.map((g) => [gameKey(g), g])),
    [predictions],
  );

  const latestWeek = history.weeks.length > 0 ? history.weeks[history.weeks.length - 1] : null;
  const latestBestCall =
    latestWeek != null
      ? history.strongestCalls.find((c) => c.week === latestWeek.week) ?? null
      : null;

  const hasPicks = summary.picksMade > 0;
  const hasResolved = summary.resolvedCount > 0;

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--text-primary)' }}>
      <Header />

      {/* Hero */}
      <section className="px-4 pt-10 pb-6">
        <div className="max-w-7xl mx-auto">
          <span className="text-[11px] uppercase tracking-[0.24em]" style={{ color: 'var(--text-muted)' }}>
            Your record against Clark, Vegas & the crowd
          </span>
          <h1
            className="font-bold leading-[0.92] tracking-tight mt-1"
            style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(3rem,10vw,7rem)', color: 'var(--text-primary)' }}
          >
            MY SEASON
          </h1>
        </div>
      </section>

      {!isSignedIn ? (
        // The season belongs to an account — without one there's nothing to show,
        // so say that plainly instead of rendering an empty scoreboard.
        <section className="px-4 py-24">
          <div className="max-w-xl mx-auto text-center flex flex-col items-center gap-4">
            <p className="text-lg" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-secondary)' }}>
              Your season lives in your account.
            </p>
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
              Create a free one and every pick you make from here on is tracked, scored, and stacked
              up against Clark.
            </p>
            <button
              type="button"
              onClick={() => openAuthDialog('signup')}
              className="mt-2 px-5 py-2.5 rounded text-sm font-semibold uppercase tracking-wide"
              style={{ background: 'var(--accent-gold)', color: '#111' }}
            >
              Create your free account
            </button>
            <Link to="/games" className="text-xs no-underline" style={{ color: 'var(--text-tertiary)' }}>
              Or browse this week's games first →
            </Link>
          </div>
        </section>
      ) : !hasPicks ? (
        <section className="px-4 py-24">
          <div className="max-w-xl mx-auto text-center flex flex-col items-center gap-4">
            <p className="text-lg" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-secondary)' }}>
              You haven't staked a single call yet.
            </p>
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
              Head to the games, drag your conviction on a matchup, and your season starts building here.
            </p>
            <Link
              to="/games"
              className="mt-2 px-5 py-2.5 rounded text-sm font-semibold uppercase tracking-wide no-underline"
              style={{ background: 'var(--accent-gold)', color: '#111' }}
            >
              Make your first pick
            </Link>
          </div>
        </section>
      ) : (
        <div className="max-w-7xl mx-auto px-4 pb-16 flex flex-col gap-10">
          {/* Headline KPIs */}
          <StatStrip
            items={[
              { label: 'Season score', value: signed(summary.seasonScore), color: stakeColor(summary.seasonScore) },
              { label: 'Record', value: `${summary.wins}–${summary.losses}` },
              { label: 'vs Clark', value: signed(summary.clarkDifferential), color: stakeColor(summary.clarkDifferential) },
              {
                label: 'Current streak',
                value: summary.streak ? `${summary.streak.type}${summary.streak.count}` : '—',
                color: summary.streak ? (summary.streak.type === 'W' ? 'var(--stake-positive)' : 'var(--stake-negative)') : undefined,
              },
            ]}
          />

          {!hasResolved ? (
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
              {summary.picksMade} pick{summary.picksMade === 1 ? '' : 's'} in — results will resolve here as games finish.
            </p>
          ) : (
            <>
              {/* Weekly performance + shareable recap */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <WeeklyPerformance weeks={history.weeks} totals={history.totals} />
                </div>
                {latestWeek && <ShareableWeekCard week={latestWeek} bestCall={latestBestCall} />}
              </div>

              {/* Strongest calls / biggest misses */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-3">
                  <h2 className="text-xs uppercase tracking-widest" style={{ color: 'var(--stake-positive)' }}>
                    Strongest calls
                  </h2>
                  {history.strongestCalls.length > 0 ? (
                    history.strongestCalls.map((c) => (
                      <PickHighlightCard
                        key={c.key}
                        highlight={c}
                        game={gameByKey.get(c.key)}
                        clarkDifferential={summary.clarkDifferential}
                        streak={summary.streak}
                      />
                    ))
                  ) : (
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No wins yet.</p>
                  )}
                </div>
                <div className="flex flex-col gap-3">
                  <h2 className="text-xs uppercase tracking-widest" style={{ color: 'var(--stake-negative)' }}>
                    Biggest misses
                  </h2>
                  {history.biggestMisses.length > 0 ? (
                    history.biggestMisses.map((c) => (
                      <PickHighlightCard
                        key={c.key}
                        highlight={c}
                        game={gameByKey.get(c.key)}
                        clarkDifferential={summary.clarkDifferential}
                        streak={summary.streak}
                      />
                    ))
                  ) : (
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No misses — flawless so far.</p>
                  )}
                </div>
              </div>

              {/* Tendencies */}
              <div>
                <h2 className="text-xs uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>
                  How you pick
                </h2>
                <StatStrip
                  items={[
                    { label: 'Avg conviction', value: pct(history.tendencies.avgConviction) },
                    { label: 'Side with Clark', value: pct(history.tendencies.withClarkPct) },
                    { label: 'Fade Vegas', value: pct(history.tendencies.fadeVegasPct) },
                    // Hidden until the community has picked something you also
                    // picked — 0% would read as a fact rather than as no data.
                    ...(history.tendencies.crowdComparableCount > 0
                      ? [{ label: 'Side with fans', value: pct(history.tendencies.withFansPct) }]
                      : []),
                    { label: 'Longest win streak', value: String(history.longestWinStreak), color: 'var(--accent-gold)' },
                  ]}
                />
              </div>

              {/* Fanbase standings */}
              <FanbaseStandings standings={fanbases} userTeam={fanTeam} status={sentimentStatus} />
            </>
          )}
        </div>
      )}

      <Footer />
    </div>
  );
};

export default MySeasonPage;
