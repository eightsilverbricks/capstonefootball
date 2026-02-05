import React, { useState, useRef } from 'react';
import { games, Game } from '@/data/nflData';
import { useAuth } from '@/contexts/AuthContext';
import Header from './Header';
import HeroSection from './HeroSection';
import GameCard from './GameCard';
import GameDetailModal from './GameDetailModal';
import ModelAccuracy from './ModelAccuracy';
import VideoSection from './VideoSection';
import Leaderboard from './Leaderboard';
import UserPredictionTracker from './UserPredictionTracker';
import AuthModal from './AuthModal';
import UserProfileModal from './UserProfileModal';
import Footer from './Footer';
import { Filter, Grid, List, Trophy, TrendingUp, Calendar, Users } from 'lucide-react';

const AppLayout: React.FC = () => {
  const { user } = useAuth();
  const [currentWeek, setCurrentWeek] = useState(16);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterConfidence, setFilterConfidence] = useState<'all' | 'high' | 'medium'>('all');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const gamesRef = useRef<HTMLDivElement>(null);

  const scrollToGames = () => {
    gamesRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const filteredGames = games.filter((game) => {
    if (filterConfidence === 'all') return true;
    const maxProb = Math.max(game.homeWinProbability, game.awayWinProbability);
    if (filterConfidence === 'high') return maxProb >= 65;
    if (filterConfidence === 'medium') return maxProb >= 55 && maxProb < 65;
    return true;
  });

  const highConfidenceCount = games.filter(g => Math.max(g.homeWinProbability, g.awayWinProbability) >= 65).length;
  const avgConfidence = (games.reduce((sum, g) => sum + Math.max(g.homeWinProbability, g.awayWinProbability), 0) / games.length).toFixed(1);

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <Header 
        currentWeek={currentWeek} 
        onWeekChange={setCurrentWeek}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onOpenProfile={() => setIsProfileModalOpen(true)}
      />

      {/* Hero Section */}
      <HeroSection onScrollToGames={scrollToGames} />

      {/* Games Section */}
      <section ref={gamesRef} id="games" className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
            <div>
              <div className="flex items-center gap-2 text-cyan-400 text-sm font-medium mb-2">
                <Calendar className="w-4 h-4" />
                Week {currentWeek} • December 2024
              </div>
              <h2 className="text-3xl font-bold text-white">This Week's Predictions</h2>
              <p className="text-slate-400 mt-1">
                {games.length} games • {highConfidenceCount} high-confidence picks • {avgConfidence}% avg confidence
              </p>
            </div>

            {/* Filters & View Toggle */}
            <div className="flex items-center gap-3">
              {/* Confidence Filter */}
              <div className="flex items-center gap-2 bg-slate-800 rounded-lg p-1">
                <button
                  onClick={() => setFilterConfidence('all')}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                    filterConfidence === 'all'
                      ? 'bg-cyan-500 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilterConfidence('high')}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                    filterConfidence === 'high'
                      ? 'bg-cyan-500 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  High Confidence
                </button>
                <button
                  onClick={() => setFilterConfidence('medium')}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                    filterConfidence === 'medium'
                      ? 'bg-cyan-500 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Toss-ups
                </button>
              </div>

              {/* View Toggle */}
              <div className="flex items-center bg-slate-800 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-slate-700 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'list'
                      ? 'bg-slate-700 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Games Grid */}
          <div className={`grid gap-6 ${
            viewMode === 'grid'
              ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
              : 'grid-cols-1 lg:grid-cols-2'
          }`}>
            {filteredGames.map((game) => (
              <GameCard
                key={game.id}
                game={game}
                onClick={() => setSelectedGame(game)}
                isSelected={selectedGame?.id === game.id}
              />
            ))}
          </div>

          {/* No Results */}
          {filteredGames.length === 0 && (
            <div className="text-center py-12">
              <Filter className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No games match your filter</h3>
              <p className="text-slate-400">Try adjusting your confidence filter</p>
              <button
                onClick={() => setFilterConfidence('all')}
                className="mt-4 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors"
              >
                Show All Games
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Model & Videos Section */}
      <section id="model" className="py-16 px-4 bg-slate-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-2 text-emerald-400 text-sm font-medium mb-2">
              <TrendingUp className="w-4 h-4" />
              Model Performance
            </div>
            <h2 className="text-3xl font-bold text-white">Track Record & Analysis</h2>
            <p className="text-slate-400 mt-2 max-w-2xl mx-auto">
              Our model has been tested against thousands of NFL games. See how we stack up against Vegas and other predictors.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            <ModelAccuracy />
            <div id="videos">
              <VideoSection />
            </div>
          </div>
        </div>
      </section>

      {/* Community Section */}
      <section id="community" className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-2 text-yellow-400 text-sm font-medium mb-2">
              <Users className="w-4 h-4" />
              Community
            </div>
            <h2 className="text-3xl font-bold text-white">Join the Competition</h2>
            <p className="text-slate-400 mt-2 max-w-2xl mx-auto">
              Make your own predictions, compete with other fans, and see how you stack up against our AI model.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            <Leaderboard />
            <UserPredictionTracker />
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 px-4 bg-slate-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-2 text-purple-400 text-sm font-medium mb-2">
              <Trophy className="w-4 h-4" />
              Methodology
            </div>
            <h2 className="text-3xl font-bold text-white">How Our Model Works</h2>
            <p className="text-slate-400 mt-2 max-w-2xl mx-auto">
              Inspired by the "13 Keys to the White House," our model uses measurable indicators to predict NFL game outcomes.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Step 1 */}
            <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
              <div className="w-12 h-12 bg-cyan-500/20 rounded-xl flex items-center justify-center text-cyan-400 font-bold text-xl mb-4">
                1
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Data Collection</h3>
              <p className="text-slate-400">
                We gather comprehensive data including player stats, team performance, weather conditions, injuries, and historical matchups from the past 5+ seasons.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
              <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center text-purple-400 font-bold text-xl mb-4">
                2
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Factor Analysis</h3>
              <p className="text-slate-400">
                Each game is evaluated across 13 key factors, weighted by historical significance. QB play, turnovers, and red zone efficiency are the strongest predictors.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
              <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400 font-bold text-xl mb-4">
                3
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">AI Prediction</h3>
              <p className="text-slate-400">
                Our machine learning model combines all factors to generate win probabilities and narrative explanations for each prediction.
              </p>
            </div>
          </div>

          {/* Strategies Section */}
          <div className="mt-12 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 rounded-2xl p-8 border border-slate-700">
            <h3 className="text-xl font-semibold text-white mb-4">Strategies from Successful Predictors</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-cyan-400 font-medium mb-2">What the Data Shows</h4>
                <ul className="space-y-2 text-slate-300 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 mt-1">•</span>
                    Teams that win the turnover battle win 78% of games
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 mt-1">•</span>
                    Home teams with winning records cover 58% of spreads
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 mt-1">•</span>
                    QBs with 100+ passer rating win 71% of games
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 mt-1">•</span>
                    Teams converting 45%+ on 3rd down win 68% of games
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="text-purple-400 font-medium mb-2">Key Insights</h4>
                <ul className="space-y-2 text-slate-300 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 mt-1">•</span>
                    Recent form (last 3 games) is more predictive than season averages
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 mt-1">•</span>
                    Weather impacts passing games more than rushing
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 mt-1">•</span>
                    Divisional games are harder to predict (more variance)
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 mt-1">•</span>
                    Prime time games favor experienced QBs
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />

      {/* Game Detail Modal */}
      {selectedGame && (
        <GameDetailModal
          game={selectedGame}
          onClose={() => setSelectedGame(null)}
          onOpenAuth={() => setIsAuthModalOpen(true)}
        />
      )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      {/* User Profile Modal */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </div>
  );
};

export default AppLayout;
