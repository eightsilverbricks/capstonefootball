import React, { useState, useEffect } from 'react';
import { games } from '@/data/nflData';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Target, CheckCircle, XCircle, Clock, TrendingUp, Award, ChevronRight, User, Loader2 } from 'lucide-react';

interface UserPrediction {
  id: string;
  game_id: string;
  week: number;
  pick: 'home' | 'away';
  confidence: number;
  result: 'correct' | 'incorrect' | 'pending' | null;
  home_team: string;
  away_team: string;
  created_at: string;
}

const UserPredictionTracker: React.FC = () => {
  const { user, stats } = useAuth();
  const [predictions, setPredictions] = useState<UserPrediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAllPicks, setShowAllPicks] = useState(false);

  useEffect(() => {
    if (user) {
      fetchPredictions();
    } else {
      setPredictions([]);
      setLoading(false);
    }
  }, [user]);

  const fetchPredictions = async () => {
    if (!user) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('user_predictions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching predictions:', error);
    } else {
      setPredictions(data || []);
    }
    setLoading(false);
  };

  // Calculate stats from fetched predictions
  const correctPicks = predictions.filter(p => p.result === 'correct').length;
  const incorrectPicks = predictions.filter(p => p.result === 'incorrect').length;
  const pendingPicks = predictions.filter(p => p.result === 'pending' || p.result === null).length;
  const totalDecided = correctPicks + incorrectPicks;
  const accuracy = totalDecided > 0 ? ((correctPicks / totalDecided) * 100).toFixed(1) : '0.0';

  // Get game details for each pick
  const getGameForPick = (gameId: string) => {
    return games.find(g => g.id === gameId);
  };

  const displayedPicks = showAllPicks ? predictions : predictions.slice(0, 3);

  // Not logged in state
  if (!user) {
    return (
      <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
        <div className="p-4 bg-gradient-to-r from-cyan-500/10 to-emerald-500/10 border-b border-slate-700">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Target className="w-5 h-5 text-cyan-400" />
            Your Predictions
          </h3>
          <p className="text-sm text-slate-400 mt-1">Track your picks against the model</p>
        </div>

        <div className="p-8 text-center">
          <User className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h4 className="text-lg font-semibold text-white mb-2">Sign In to Track Predictions</h4>
          <p className="text-slate-400 text-sm mb-4">
            Create an account to save your predictions, track your accuracy, and compete on the leaderboard.
          </p>
          <div className="flex items-center justify-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <CheckCircle className="w-3 h-3 text-emerald-400" />
              Save picks
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle className="w-3 h-3 text-emerald-400" />
              Track accuracy
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle className="w-3 h-3 text-emerald-400" />
              Compete
            </span>
          </div>
        </div>

        <div className="p-4 bg-slate-900/50 border-t border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-purple-400" />
              <span className="text-sm text-slate-400">Model Accuracy:</span>
              <span className="text-sm font-semibold text-purple-400">69.6%</span>
            </div>
            <span className="text-sm text-slate-500">Can you beat it?</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-cyan-500/10 to-emerald-500/10 border-b border-slate-700">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Target className="w-5 h-5 text-cyan-400" />
          Your Predictions
        </h3>
        <p className="text-sm text-slate-400 mt-1">Track your picks against the model</p>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-4 gap-3 p-4 border-b border-slate-700">
        <div className="text-center">
          <div className="text-2xl font-bold text-emerald-400">{stats?.correct_predictions || correctPicks}</div>
          <p className="text-xs text-slate-400">Correct</p>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-red-400">{stats?.incorrect_predictions || incorrectPicks}</div>
          <p className="text-xs text-slate-400">Incorrect</p>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-yellow-400">{pendingPicks}</div>
          <p className="text-xs text-slate-400">Pending</p>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-cyan-400">
            {stats && stats.total_predictions > 0 
              ? ((stats.correct_predictions / stats.total_predictions) * 100).toFixed(1)
              : accuracy}%
          </div>
          <p className="text-xs text-slate-400">Accuracy</p>
        </div>
      </div>

      {/* Picks List */}
      <div className="p-4">
        {loading ? (
          <div className="text-center py-8">
            <Loader2 className="w-8 h-8 text-cyan-400 mx-auto mb-3 animate-spin" />
            <p className="text-slate-400">Loading predictions...</p>
          </div>
        ) : predictions.length === 0 ? (
          <div className="text-center py-8">
            <Target className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h4 className="text-white font-medium mb-1">No Predictions Yet</h4>
            <p className="text-sm text-slate-400">
              Click on a game to make your prediction
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayedPicks.map((prediction) => {
              const game = getGameForPick(prediction.game_id);
              const pickedTeam = prediction.pick === 'home' ? prediction.home_team : prediction.away_team;
              const opposingTeam = prediction.pick === 'home' ? prediction.away_team : prediction.home_team;
              const modelPick = game ? (game.homeWinProbability > game.awayWinProbability ? 'home' : 'away') : null;
              const agreesWithModel = modelPick ? prediction.pick === modelPick : false;

              return (
                <div
                  key={prediction.id}
                  className={`p-3 rounded-lg border ${
                    prediction.result === 'correct' ? 'bg-emerald-500/10 border-emerald-500/30' :
                    prediction.result === 'incorrect' ? 'bg-red-500/10 border-red-500/30' :
                    'bg-slate-700/50 border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {/* Result Icon */}
                      {prediction.result === 'correct' && <CheckCircle className="w-5 h-5 text-emerald-400" />}
                      {prediction.result === 'incorrect' && <XCircle className="w-5 h-5 text-red-400" />}
                      {(prediction.result === 'pending' || prediction.result === null) && <Clock className="w-5 h-5 text-yellow-400" />}

                      {/* Teams */}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium">{pickedTeam}</span>
                          <span className="text-slate-500">vs</span>
                          <span className="text-slate-400">{opposingTeam}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-slate-400">
                            {prediction.confidence}% confidence
                          </span>
                          {game && (
                            agreesWithModel ? (
                              <span className="text-xs text-emerald-400 flex items-center gap-1">
                                <TrendingUp className="w-3 h-3" />
                                Agrees with model
                              </span>
                            ) : (
                              <span className="text-xs text-orange-400">
                                Against model
                              </span>
                            )
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Game Time */}
                    <div className="text-right">
                      <p className="text-xs text-slate-400">Week {prediction.week}</p>
                      {(prediction.result === 'pending' || prediction.result === null) && (
                        <p className="text-xs text-yellow-400 mt-1">Pending</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Show More */}
        {predictions.length > 3 && (
          <button
            onClick={() => setShowAllPicks(!showAllPicks)}
            className="w-full mt-3 py-2 text-center text-cyan-400 hover:text-cyan-300 transition-colors text-sm font-medium flex items-center justify-center gap-1"
          >
            {showAllPicks ? 'Show Less' : `Show All ${predictions.length} Picks`}
            <ChevronRight className={`w-4 h-4 transition-transform ${showAllPicks ? 'rotate-90' : ''}`} />
          </button>
        )}
      </div>

      {/* Comparison with Model */}
      <div className="p-4 bg-slate-900/50 border-t border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-purple-400" />
            <span className="text-sm text-slate-400">Model Accuracy:</span>
            <span className="text-sm font-semibold text-purple-400">69.6%</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">Your Accuracy:</span>
            <span className={`text-sm font-semibold ${
              stats && stats.total_predictions > 0 && (stats.correct_predictions / stats.total_predictions) * 100 > 69.6 
                ? 'text-emerald-400' 
                : 'text-cyan-400'
            }`}>
              {stats && stats.total_predictions > 0 
                ? ((stats.correct_predictions / stats.total_predictions) * 100).toFixed(1)
                : accuracy}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserPredictionTracker;
