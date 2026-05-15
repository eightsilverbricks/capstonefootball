import React, { useEffect, useMemo, useRef, useState } from 'react';
import Header from './Header';
import HeroSection from './HeroSection';
import GameCard from './GameCard';
import GameDetailModal from './GameDetailModal';
import ModelAccuracy from './ModelAccuracy';
import Footer from './Footer';
import {
  ApiPrediction,
  ConfidenceFilter,
  SortMode,
  getConfidenceLevel,
  getConfidenceScore,
} from '@/types/prediction';
import { AlertCircle, Calendar, Filter, ListFilter, RefreshCw, Trophy } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

const AppLayout: React.FC = () => {
  const [predictions, setPredictions] = useState<ApiPrediction[]>([]);
  const [selectedGame, setSelectedGame] = useState<ApiPrediction | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>('confidence');
  const [filterConfidence, setFilterConfidence] = useState<ConfidenceFilter>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const gamesRef = useRef<HTMLDivElement>(null);

  const loadPredictions = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/predictions`);
      if (!response.ok) {
        throw new Error(`Prediction API returned ${response.status}`);
      }

      const data = (await response.json()) as ApiPrediction[];
      setPredictions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load predictions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPredictions();
  }, []);

  const latestSeason = predictions.length > 0
    ? Math.max(...predictions.map((game) => game.season))
    : undefined;

  const filteredPredictions = useMemo(() => {
    const filtered = predictions.filter((game) => {
      if (filterConfidence === 'all') {
        return true;
      }
      return getConfidenceLevel(game).toLowerCase() === filterConfidence;
    });

    return filtered.sort((a, b) => {
      if (sortMode === 'week') {
        if (a.week !== b.week) {
          return a.week - b.week;
        }
        return a.home_team.localeCompare(b.home_team);
      }

      return getConfidenceScore(b) - getConfidenceScore(a);
    });
  }, [predictions, filterConfidence, sortMode]);

  const highConfidenceCount = predictions.filter((game) => getConfidenceLevel(game) === 'High').length;
  const avgConfidence = predictions.length > 0
    ? predictions.reduce((sum, game) => sum + getConfidenceScore(game) * 200, 0) / predictions.length
    : 0;

  const scrollToGames = () => {
    gamesRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-950">
      <Header />

      <HeroSection
        onScrollToGames={scrollToGames}
        predictionCount={predictions.length}
        latestSeason={latestSeason}
      />

      <section ref={gamesRef} id="games" className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-8">
            <div>
              <div className="flex items-center gap-2 text-cyan-400 text-sm font-medium mb-2">
                <Calendar className="w-4 h-4" />
                {latestSeason ? `${latestSeason} model output` : 'Model output'}
              </div>
              <h2 className="text-3xl font-bold text-white">Actual Predictions</h2>
              <p className="text-slate-400 mt-1">
                {predictions.length} games from the FastAPI model endpoint
                {predictions.length > 0 && ` • ${highConfidenceCount} high-confidence picks • ${avgConfidence.toFixed(1)}% avg confidence`}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-2 bg-slate-900 rounded-lg p-1 border border-slate-700">
                {(['all', 'high', 'medium', 'low'] as ConfidenceFilter[]).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setFilterConfidence(filter)}
                    className={`px-3 py-1.5 text-sm rounded-md transition-colors capitalize ${
                      filterConfidence === filter
                        ? 'bg-cyan-500 text-white'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>

              <label className="flex items-center gap-2 text-sm text-slate-300">
                <ListFilter className="w-4 h-4 text-slate-500" />
                <select
                  value={sortMode}
                  onChange={(event) => setSortMode(event.target.value as SortMode)}
                  className="bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-white"
                >
                  <option value="confidence">Highest confidence</option>
                  <option value="week">Week</option>
                </select>
              </label>
            </div>
          </div>

          {loading && (
            <div className="rounded-lg border border-slate-700 bg-slate-900 p-8 text-center">
              <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-3" />
              <p className="text-slate-300">Loading predictions from the model API...</p>
            </div>
          )}

          {!loading && error && (
            <div className="rounded-lg border border-red-800 bg-red-950/30 p-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
                <div>
                  <h3 className="text-white font-semibold">Prediction API is unavailable</h3>
                  <p className="text-red-200 mt-1">{error}</p>
                  <p className="text-slate-400 mt-2 text-sm">
                    Start the backend with `cd nfl-prediction && .venv/bin/uvicorn src.api:app --reload`.
                  </p>
                  <button
                    onClick={loadPredictions}
                    className="mt-4 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                  >
                    Retry
                  </button>
                </div>
              </div>
            </div>
          )}

          {!loading && !error && (
            <>
              <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredPredictions.map((game) => (
                  <GameCard
                    key={`${game.season}-${game.week}-${game.away_team}-${game.home_team}`}
                    game={game}
                    onClick={() => setSelectedGame(game)}
                    isSelected={selectedGame === game}
                  />
                ))}
              </div>

              {filteredPredictions.length === 0 && (
                <div className="text-center py-12">
                  <Filter className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">No predictions match that filter</h3>
                  <button
                    onClick={() => setFilterConfidence('all')}
                    className="mt-4 px-4 py-2 bg-cyan-500 text-white rounded-md hover:bg-cyan-600 transition-colors"
                  >
                    Show all predictions
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      <section id="model" className="py-16 px-4 bg-slate-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-2 text-emerald-400 text-sm font-medium mb-2">
              <Trophy className="w-4 h-4" />
              Model Performance
            </div>
            <h2 className="text-3xl font-bold text-white">What We Actually Trained</h2>
            <p className="text-slate-400 mt-2 max-w-2xl mx-auto">
              The app uses the trained logistic regression model from `nfl-prediction/models/logreg_model.joblib`.
            </p>
          </div>

          <ModelAccuracy />
        </div>
      </section>

      <section id="methodology" className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-2 text-purple-400 text-sm font-medium mb-2">
              <Trophy className="w-4 h-4" />
              Methodology
            </div>
            <h2 className="text-3xl font-bold text-white">How The Model Works</h2>
            <p className="text-slate-400 mt-2 max-w-2xl mx-auto">
              The old “13 Keys” framing is kept as a readable explanation, but the underlying model uses 28 numeric features from the training table.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-slate-900 rounded-lg p-6 border border-slate-700">
              <div className="w-12 h-12 bg-cyan-500/20 rounded-lg flex items-center justify-center text-cyan-400 font-bold text-xl mb-4">
                1
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Build Team Features</h3>
              <p className="text-slate-400">
                Play-by-play and schedule data are converted into team-game rows with EPA, success rate, turnovers, QB efficiency, sacks, rest, and market lines.
              </p>
            </div>

            <div className="bg-slate-900 rounded-lg p-6 border border-slate-700">
              <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center text-purple-400 font-bold text-xl mb-4">
                2
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Create Matchups</h3>
              <p className="text-slate-400">
                Home and away team rows are merged into one game row, then converted into differential and matchup features that compare each side directly.
              </p>
            </div>

            <div className="bg-slate-900 rounded-lg p-6 border border-slate-700">
              <div className="w-12 h-12 bg-emerald-500/20 rounded-lg flex items-center justify-center text-emerald-400 font-bold text-xl mb-4">
                3
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Score With Logistic Regression</h3>
              <p className="text-slate-400">
                A standard-scaled logistic regression model estimates the home win probability, then the UI derives away probability, predicted winner, and confidence.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />

      {selectedGame && (
        <GameDetailModal
          game={selectedGame}
          onClose={() => setSelectedGame(null)}
        />
      )}
    </div>
  );
};

export default AppLayout;
