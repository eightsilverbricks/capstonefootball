import React, { useEffect, useMemo, useState } from 'react';
import Header from './Header';
import WeekStrip from './WeekStrip';
import GameCard from './GameCard';
import SignalCard from './SignalCard';
import StoryModules from './StoryModules';
import StatStrip from './StatStrip';
import Footer from './Footer';
import { usePredictions } from '@/hooks/usePredictions';
import { ConfidenceFilter, getConfidenceScore } from '@/types/prediction';
import { computeSignal, gameKey } from '@/lib/threeWaySignal';
import { computeStoryModules } from '@/lib/storyModules';
import { AlertCircle, Filter, RefreshCw } from 'lucide-react';

const DEFAULT_WEEK = 1;

const AppLayout: React.FC = () => {
  const { predictions, loading, error, reload } = usePredictions();
  const [selectedWeek, setSelectedWeek] = useState<number>(DEFAULT_WEEK);
  const [filterConfidence, setFilterConfidence] = useState<ConfidenceFilter>('all');

  // Available weeks for the week strip
  const availableWeeks = useMemo(() => {
    const weeks = [...new Set(predictions.map((g) => g.week))].sort((a, b) => a - b);
    return weeks;
  }, [predictions]);

  // Sync: if the default week isn't in the data, fall back to the last available week
  useEffect(() => {
    if (availableWeeks.length > 0 && !availableWeeks.includes(selectedWeek)) {
      setSelectedWeek(availableWeeks[availableWeeks.length - 1]);
    }
  }, [availableWeeks]);

  // Games for the selected week
  const weekGames = useMemo(() => {
    return predictions.filter((g) => g.week === selectedWeek);
  }, [predictions, selectedWeek]);

  // Filtered + sorted games for the grid
  const gridGames = useMemo(() => {
    let games = weekGames;
    if (filterConfidence !== 'all') {
      games = games.filter((g) => (g.confidence_label ?? '').toLowerCase() === filterConfidence);
    }
    return [...games].sort((a, b) => getConfidenceScore(b) - getConfidenceScore(a));
  }, [weekGames, filterConfidence]);

  const handleWeekChange = (week: number) => {
    setSelectedWeek(week);
    setFilterConfidence('all');
  };

  const sectionTitle = selectedWeek >= 19
    ? (['WILD CARD', 'DIVISIONAL', 'CONFERENCE', 'SUPER BOWL'][selectedWeek - 19])
    : `WEEK ${selectedWeek}`;

  const highCount   = weekGames.filter(g => g.confidence_label === 'High').length;
  const mediumCount = weekGames.filter(g => g.confidence_label === 'Medium').length;
  const lowCount    = weekGames.filter(g => g.confidence_label === 'Low').length;

  const signal = useMemo(() => computeSignal(weekGames), [weekGames]);

  const storyModules = useMemo(
    () => computeStoryModules(weekGames, signal ? gameKey(signal.game) : undefined),
    [weekGames, signal],
  );
  const hasStories = storyModules.length > 0;

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--text-primary)' }}>
      <Header />

      {/* ── Week navigation — pinned right under the header; picking a week is ── */}
      {/* the primary action, so it shouldn't require scrolling past the hero. ── */}
      {availableWeeks.length > 0 && (
        <div className="sticky top-[57px] z-30">
          <WeekStrip
            availableWeeks={availableWeeks}
            selectedWeek={selectedWeek}
            onChange={handleWeekChange}
          />
        </div>
      )}

      {/* ── Top band: The Signal + week masthead (left), story modules (right). ── */}
      {/* Left column stacks the disagreement above the week title + stat strip so ── */}
      {/* it balances the taller story column instead of leaving a dead void. ── */}
      <section className="px-4 pt-8 pb-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 items-start">
          <div className={`flex flex-col gap-8 ${hasStories ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
            {signal && <SignalCard signal={signal} />}

            <div>
              <div className="flex items-end justify-between gap-6 mb-2">
                <span className="text-[11px] uppercase tracking-[0.24em]" style={{ color: 'var(--text-muted)' }}>
                  The 2024 slate · model lens
                </span>
                <span className="text-[11px] uppercase tracking-[0.24em] hidden md:inline" style={{ color: 'var(--text-muted)' }}>
                  {predictions.length} games analyzed
                </span>
              </div>

              <h1
                className="font-bold leading-[0.92] tracking-tight"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(2.5rem, 6vw, 5.5rem)',
                  color: 'var(--text-primary)',
                }}
              >
                {sectionTitle}
              </h1>

              {/* One game doesn't need a 4-cell breakdown — the headline already says it all. */}
              {weekGames.length > 1 && (
                <div className="mt-6">
                  <StatStrip
                    items={[
                      { label: 'Games', value: String(weekGames.length) },
                      { label: 'High conf.', value: String(highCount), color: 'var(--accent-gold)' },
                      { label: 'Medium conf.', value: String(mediumCount) },
                      { label: 'Low conf.', value: String(lowCount) },
                    ]}
                  />
                </div>
              )}
            </div>
          </div>

          {hasStories && (
            <div className="lg:col-span-1">
              <StoryModules modules={storyModules} />
            </div>
          )}
        </div>
      </section>

      <section id="matchups" className="py-10 px-4">
        <div className="max-w-7xl mx-auto">

          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3 mb-6 pb-4"
            style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <p className="text-xs uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              {weekGames.length === 1 ? 'One game on the slate' : `${weekGames.length} matchups · ranked by confidence`}
            </p>

            {weekGames.length > 1 && (
              <div className="flex items-center gap-4 text-[11px] uppercase tracking-widest">
                {(['all', 'high', 'medium', 'low'] as ConfidenceFilter[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilterConfidence(f)}
                    className="transition-colors"
                    style={{
                      color: filterConfidence === f ? 'var(--text-primary)' : 'var(--text-muted)',
                      borderBottom: filterConfidence === f
                        ? '1px solid var(--accent-gold)'
                        : '1px solid transparent',
                      paddingBottom: '2px',
                    }}
                  >
                    {f}
                  </button>
                ))}
              </div>
            )}
          </div>

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
                  <p className="text-white/30 text-xs mb-4">
                    Make sure the prediction API is running, then try again.
                  </p>
                  <button
                    onClick={reload}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm rounded-lg transition-colors"
                  >
                    Retry
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Grid — only shown when week has >1 game */}
          {!loading && !error && gridGames.length > 0 && (
            <>
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {gridGames.map((game) => (
                  <GameCard key={gameKey(game)} game={game} />
                ))}
              </div>
              <p className="mt-6 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                † Fan sentiment shown here is illustrative — real community picks are coming.
              </p>
            </>
          )}

          {/* Empty filter state */}
          {!loading && !error && weekGames.length > 1 && gridGames.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Filter className="w-10 h-10 text-white/15" />
              <p className="text-sm text-white/40">No {filterConfidence} confidence games this week</p>
              <button
                onClick={() => setFilterConfidence('all')}
                className="text-xs text-white/50 hover:text-white underline"
              >
                Show all
              </button>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default AppLayout;
