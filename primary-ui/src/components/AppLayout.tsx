import React, { useEffect, useMemo, useState } from 'react';
import Header from './Header';
import HeroSection from './HeroSection';
import WeekStrip from './WeekStrip';
import GameCard from './GameCard';
import ModelAccuracy from './ModelAccuracy';
import Footer from './Footer';
import { usePredictions } from '@/hooks/usePredictions';
import { ConfidenceFilter, getConfidenceScore } from '@/types/prediction';
import { AlertCircle, Filter, RefreshCw } from 'lucide-react';

const DEFAULT_WEEK = 22;

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

  // Featured game: Super Bowl game if on week 22, else highest confidence of selected week
  const featuredGame = useMemo(() => {
    if (weekGames.length === 0) return predictions.length > 0
      ? [...predictions].sort((a, b) => getConfidenceScore(b) - getConfidenceScore(a))[0]
      : null;
    return [...weekGames].sort((a, b) => getConfidenceScore(b) - getConfidenceScore(a))[0];
  }, [weekGames, predictions]);

  // Filtered + sorted games for the grid (exclude featured to avoid duplication when there's only 1 game)
  const gridGames = useMemo(() => {
    let games = weekGames;

    if (filterConfidence !== 'all') {
      games = games.filter((g) => (g.confidence_label ?? '').toLowerCase() === filterConfidence);
    }

    // Sort by confidence desc
    games = [...games].sort((a, b) => getConfidenceScore(b) - getConfidenceScore(a));

    // If only 1 game this week, grid is empty (featured takes care of it)
    if (weekGames.length <= 1) return [];

    return games;
  }, [weekGames, filterConfidence]);

  const handleWeekChange = (week: number) => {
    setSelectedWeek(week);
    setFilterConfidence('all');
  };

  return (
    <div className="min-h-screen" style={{ background: '#0a0a12', color: '#f5f0e8' }}>
      <Header />

      {/* ── Hero ── */}
      <HeroSection
        featuredGame={featuredGame ?? null}
        totalGames={predictions.length}
      />

      {/* ── Week navigation ── */}
      {availableWeeks.length > 0 && (
        <WeekStrip
          availableWeeks={availableWeeks}
          selectedWeek={selectedWeek}
          onChange={handleWeekChange}
        />
      )}

      {/* ── Matchups grid ── */}
      <section id="matchups" className="py-10 px-4">
        <div className="max-w-7xl mx-auto">

          {/* Section header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-semibold text-white">
                {selectedWeek >= 19
                  ? (['Wild Card', 'Divisional Round', 'Conference Championship', 'Super Bowl'][selectedWeek - 19])
                  : `Week ${selectedWeek} Matchups`}
              </h2>
              <p className="text-sm text-white/30 mt-0.5">
                {weekGames.length === 1
                  ? 'Showing the full Clark Report above'
                  : `${weekGames.length} games · click any card to read the Clark Report`}
              </p>
            </div>

            {/* Confidence filter — only if >1 game */}
            {weekGames.length > 1 && (
              <div className="flex items-center gap-1 bg-white/[0.04] rounded-lg p-1 border border-white/8">
                {(['all', 'high', 'medium', 'low'] as ConfidenceFilter[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilterConfidence(f)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all capitalize ${
                      filterConfidence === f
                        ? 'bg-white text-[#0a0a12]'
                        : 'text-white/40 hover:text-white'
                    }`}
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
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {gridGames.map((game) => (
                <GameCard
                  key={`${game.season}-${game.week}-${game.away_team}-${game.home_team}`}
                  game={game}
                />
              ))}
            </div>
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

      {/* ── Learn section ── */}
      <section id="learn" className="py-12 px-4 border-t border-white/8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-2">New to football?</h2>
            <p className="text-sm text-white/40">Every stat the model uses, explained without jargon.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {GLOSSARY_ITEMS.map((item) => (
              <div key={item.term} className="rounded-lg border border-white/8 bg-white/[0.03] p-4">
                <h3 className="text-sm font-semibold text-white mb-1">{item.term}</h3>
                <p className="text-sm text-white/50 leading-relaxed mb-2">{item.plain}</p>
                <p className="text-xs text-white/25 leading-relaxed italic">{item.model_use}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Model section ── */}
      <section className="py-12 px-4 border-t border-white/8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-2">How the model works</h2>
            <p className="text-sm text-white/40">What it uses, what it doesn't, and how accurate it is.</p>
          </div>
          <ModelAccuracy />
        </div>
      </section>

      <Footer />
    </div>
  );
};

// ─── Glossary items ────────────────────────────────────────────────────────────
const GLOSSARY_ITEMS = [
  {
    term: "EPA per play",
    plain: "Expected Points Added measures how much a play helps a team score. A run that gains 5 yards on 3rd-and-2 adds more value than the same run on 3rd-and-15.",
    model_use: "The model uses EPA per play as the primary efficiency signal — teams with consistent EPA create more scoring opportunities.",
  },
  {
    term: "Success rate",
    plain: 'The percentage of plays where the offense "stays on schedule" — gaining enough yards to make the next down manageable.',
    model_use: "High success rate teams are more reliable on offense. They do not depend on big plays to move the chains.",
  },
  {
    term: "The spread",
    plain: "The point handicap Vegas assigns to level the betting field. A -6.5 team needs to win by 7+ points for bettors to win.",
    model_use: "Vegas spreads encode a lot of real-world information. The model uses them as a calibration signal, not the whole story.",
  },
  {
    term: "Recent form (last 3)",
    plain: "How a team has performed in their last 3 games, not the whole season. Reflects current momentum and any recent injuries or scheme changes.",
    model_use: "Recent form can detect when a team is trending up or down in ways that season averages miss.",
  },
  {
    term: "Win probability",
    plain: "The model's estimate of how likely each team is to win. 70% does not mean certain — it means the model sees meaningful but not overwhelming evidence.",
    model_use: "Probabilities are derived from logistic regression. A 60/40 game is genuinely close and often comes down to execution.",
  },
  {
    term: "QB efficiency",
    plain: "How much value a quarterback creates per play — accounting for completions, yards, touchdowns, and avoiding turnovers.",
    model_use: "QB efficiency is the single most predictive football stat in the model. Good QBs make offenses work regardless of the opponent.",
  },
  {
    term: "Rest differential",
    plain: "The difference in days of rest between the two teams. A team on a short week (3 days) vs. a rested team (10 days) is at a measurable disadvantage.",
    model_use: "Rest matters most in close matchups. The model treats it as a context signal, not a dominant factor.",
  },
  {
    term: "Sack / pressure rate",
    plain: "How often a team's pass rush disrupts the opposing QB, or how well the offensive line protects their QB.",
    model_use: "Pressure limits deep passing and creates negative plays. The model looks at the matchup between one team's rush and the other's protection.",
  },
];

export default AppLayout;
