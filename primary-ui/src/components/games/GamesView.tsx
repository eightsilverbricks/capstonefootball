import React, { useEffect, useMemo, useState } from 'react';
import PreSeasonNotice from '@/components/PreSeasonNotice';
import Header from '@/components/Header';
import { useSeasonMode } from '@/context/SeasonModeContext';
import Footer from '@/components/Footer';
import WeekStrip from '@/components/WeekStrip';
import RecordPreview from '@/components/RecordPreview';
import SlateSection from '@/components/games/SlateSection';
import { usePredictions } from '@/hooks/usePredictions';
import { groupBySlate } from '@/lib/slate';
import { resolveCurrentWeek, weekTitle } from '@/lib/currentWeek';
import { AlertCircle, RefreshCw } from 'lucide-react';

/**
 * The Games page — the week laid out the way it's actually watched.
 *
 * Two ideas drive the structure. Games are grouped into their kickoff windows
 * (Thursday night, the 1 o'clock slate, Sunday night, Monday night) because
 * that's the order fans experience a week in, and it makes any single game
 * findable by when it's on rather than by scanning a ranked list. And the
 * week's most consequential matchup is pulled out as a lead card at display
 * scale, so the page opens with a point of view instead of row one of sixteen.
 *
 * Both the lead and the grouping are derived in lib/slate.ts — this component
 * only composes them.
 */
const GamesView: React.FC = () => {
  const { predictions, loading, error, reload } = usePredictions();
  // Demo seasons are finished, so they open on week 1 rather than the calendar.
  const { config: seasonConfig } = useSeasonMode();
  const isDemo = seasonConfig.isDemo;
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);

  const availableWeeks = useMemo(
    () => [...new Set(predictions.map((g) => g.week))].sort((a, b) => a - b),
    [predictions],
  );

  // Initialise / repair the selected week from the data (default = current week).
  useEffect(() => {
    if (availableWeeks.length === 0) return;
    if (selectedWeek === null || !availableWeeks.includes(selectedWeek)) {
      setSelectedWeek(resolveCurrentWeek(availableWeeks, { isDemo }));
    }
  }, [availableWeeks, selectedWeek]);

  const activeWeek = selectedWeek ?? resolveCurrentWeek(availableWeeks, { isDemo });

  const weekGames = useMemo(
    () => predictions.filter((g) => g.week === activeWeek),
    [predictions, activeWeek],
  );

  const slate = useMemo(() => groupBySlate(weekGames), [weekGames]);

  const handleWeekChange = (week: number) => setSelectedWeek(week);

  const hasResults = weekGames.length > 0;

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
        <div className="mb-5"><PreSeasonNotice /></div>
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <h1
            className="font-bold leading-[0.92] tracking-tight"
            style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 5vw, 4rem)', color: 'var(--text-primary)' }}
          >
            {weekTitle(activeWeek)}
          </h1>
          <RecordPreview variant="compact" />
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

        {/* The week */}
        {!loading && !error && hasResults && (
          <>
            {slate.map((group) => (
              <SlateSection key={group.window.id} group={group} />
            ))}
          </>
        )}

      </main>

      <Footer />
    </div>
  );
};

export default GamesView;
