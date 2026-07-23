import React, { useEffect, useMemo, useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import WeekStrip from '@/components/WeekStrip';
import GameCard from '@/components/GameCard';
import StatStrip from '@/components/StatStrip';
import RecordPreview from '@/components/RecordPreview';
import { usePredictions } from '@/hooks/usePredictions';
import { ConfidenceFilter, getConfidenceScore } from '@/types/prediction';
import { gameKey } from '@/lib/threeWaySignal';
import { resolveCurrentWeek, weekTitle } from '@/lib/currentWeek';
import { AlertCircle, Filter, RefreshCw } from 'lucide-react';

/**
 * The Games page — the full interactive slate. Week switcher (WeekStrip),
 * confidence filter, the GameCard grid, and a compact record bar. This is the
 * game-list machinery that used to live on the homepage; the homepage is now a
 * dashboard and links here.
 */
const GamesView: React.FC = () => {
  const { predictions, loading, error, reload } = usePredictions();
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [filterConfidence, setFilterConfidence] = useState<ConfidenceFilter>('all');

  const availableWeeks = useMemo(
    () => [...new Set(predictions.map((g) => g.week))].sort((a, b) => a - b),
    [predictions],
  );

  // Initialise / repair the selected week from the data (default = current week).
  useEffect(() => {
    if (availableWeeks.length === 0) return;
    if (selectedWeek === null || !availableWeeks.includes(selectedWeek)) {
      setSelectedWeek(resolveCurrentWeek(availableWeeks));
    }
  }, [availableWeeks, selectedWeek]);

  const activeWeek = selectedWeek ?? resolveCurrentWeek(availableWeeks);

  const weekGames = useMemo(
    () => predictions.filter((g) => g.week === activeWeek),
    [predictions, activeWeek],
  );

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

  const highCount = weekGames.filter((g) => g.confidence_label === 'High').length;
  const mediumCount = weekGames.filter((g) => g.confidence_label === 'Medium').length;
  const lowCount = weekGames.filter((g) => g.confidence_label === 'Low').length;

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--text-primary)' }}>
      <Header />

      {/* Week navigation — the primary action on this page */}
      {availableWeeks.length > 0 && (
        <div className="sticky top-[57px] z-30">
          <WeekStrip
            availableWeeks={availableWeeks}
            selectedWeek={activeWeek}
            onChange={handleWeekChange}
          />
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 pt-8 pb-16">

        {/* Masthead + record bar */}
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <span className="text-[11px] uppercase tracking-[0.24em]" style={{ color: 'var(--text-muted)' }}>
              Season 2024 · the slate
            </span>
            <h1
              className="font-bold leading-[0.92] tracking-tight"
              style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 5vw, 4rem)', color: 'var(--text-primary)' }}
            >
              {weekTitle(activeWeek)}
            </h1>
          </div>
          <RecordPreview variant="compact" />
        </div>

        {/* Confidence stat strip */}
        {weekGames.length > 1 && (
          <div className="mb-8">
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

        {/* Filter row */}
        <div
          className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3 mb-6 pb-4"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}
        >
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
                    borderBottom: filterConfidence === f ? '1px solid var(--accent-gold)' : '1px solid transparent',
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
                <p className="text-white/30 text-xs mb-4">Make sure the prediction API is running, then try again.</p>
                <button onClick={reload} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm rounded-lg transition-colors">
                  Retry
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Grid */}
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
            <button onClick={() => setFilterConfidence('all')} className="text-xs text-white/50 hover:text-white underline">
              Show all
            </button>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default GamesView;
