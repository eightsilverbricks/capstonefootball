import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { games } from '@/data/nflData';
import { X, Trophy, Target, TrendingUp, Calendar, CheckCircle, XCircle, Clock, Award, BarChart3, Flame } from 'lucide-react';

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

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, profile, stats, refreshStats } = useAuth();
  const [predictions, setPredictions] = useState<UserPrediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'correct' | 'incorrect'>('all');

  useEffect(() => {
    if (isOpen && user) {
      fetchPredictions();
    }
  }, [isOpen, user]);

  const fetchPredictions = async () => {
    if (!user) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('user_predictions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching predictions:', error);
    } else {
      setPredictions(data || []);
    }
    setLoading(false);
  };

  const filteredPredictions = predictions.filter(p => {
    if (activeTab === 'all') return true;
    if (activeTab === 'pending') return p.result === 'pending' || p.result === null;
    return p.result === activeTab;
  });

  const accuracy = stats && stats.total_predictions > 0
    ? ((stats.correct_predictions / stats.total_predictions) * 100).toFixed(1)
    : '0.0';

  const getGameDetails = (gameId: string) => {
    return games.find(g => g.id === gameId);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative min-h-screen flex items-start justify-center p-4 pt-8">
        <div className="relative w-full max-w-4xl bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 overflow-hidden">
          {/* Header */}
          <div className="relative p-6 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border-b border-slate-700">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center text-white text-2xl font-bold">
                {profile?.username.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">{profile?.username}</h2>
                <p className="text-slate-400">Member since {new Date(profile?.created_at || '').toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-6 border-b border-slate-700">
            <div className="bg-slate-800/50 rounded-xl p-4 text-center">
              <Target className="w-6 h-6 text-cyan-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">{stats?.total_predictions || 0}</div>
              <p className="text-xs text-slate-400">Total Picks</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4 text-center">
              <CheckCircle className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-emerald-400">{stats?.correct_predictions || 0}</div>
              <p className="text-xs text-slate-400">Correct</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4 text-center">
              <XCircle className="w-6 h-6 text-red-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-red-400">{stats?.incorrect_predictions || 0}</div>
              <p className="text-xs text-slate-400">Incorrect</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4 text-center">
              <BarChart3 className="w-6 h-6 text-purple-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-purple-400">{accuracy}%</div>
              <p className="text-xs text-slate-400">Accuracy</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4 text-center">
              <Flame className="w-6 h-6 text-orange-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-orange-400">{stats?.current_streak || 0}</div>
              <p className="text-xs text-slate-400">Current Streak</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-slate-700">
            {[
              { id: 'all', label: 'All Picks', count: predictions.length },
              { id: 'pending', label: 'Pending', count: predictions.filter(p => p.result === 'pending' || p.result === null).length },
              { id: 'correct', label: 'Correct', count: predictions.filter(p => p.result === 'correct').length },
              { id: 'incorrect', label: 'Incorrect', count: predictions.filter(p => p.result === 'incorrect').length },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-400/5'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>

          {/* Predictions List */}
          <div className="p-6 max-h-96 overflow-y-auto">
            {loading ? (
              <div className="text-center py-12">
                <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-slate-400">Loading predictions...</p>
              </div>
            ) : filteredPredictions.length === 0 ? (
              <div className="text-center py-12">
                <Target className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">No Predictions Yet</h3>
                <p className="text-slate-400">
                  {activeTab === 'all' 
                    ? 'Click on a game to make your first prediction!'
                    : `No ${activeTab} predictions found.`}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredPredictions.map((prediction) => {
                  const game = getGameDetails(prediction.game_id);
                  const pickedTeam = prediction.pick === 'home' ? prediction.home_team : prediction.away_team;
                  
                  return (
                    <div
                      key={prediction.id}
                      className={`p-4 rounded-xl border ${
                        prediction.result === 'correct' ? 'bg-emerald-500/10 border-emerald-500/30' :
                        prediction.result === 'incorrect' ? 'bg-red-500/10 border-red-500/30' :
                        'bg-slate-800/50 border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {/* Result Icon */}
                          {prediction.result === 'correct' && <CheckCircle className="w-6 h-6 text-emerald-400" />}
                          {prediction.result === 'incorrect' && <XCircle className="w-6 h-6 text-red-400" />}
                          {(prediction.result === 'pending' || prediction.result === null) && <Clock className="w-6 h-6 text-yellow-400" />}

                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-white">{pickedTeam}</span>
                              <span className="text-slate-500">vs</span>
                              <span className="text-slate-400">
                                {prediction.pick === 'home' ? prediction.away_team : prediction.home_team}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                Week {prediction.week}
                              </span>
                              <span>{prediction.confidence}% confidence</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          {prediction.result === 'correct' && (
                            <span className="text-emerald-400 font-semibold">+20 pts</span>
                          )}
                          {prediction.result === 'incorrect' && (
                            <span className="text-red-400 font-semibold">0 pts</span>
                          )}
                          {(prediction.result === 'pending' || prediction.result === null) && (
                            <span className="text-yellow-400 text-sm">Pending</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 bg-slate-800/50 border-t border-slate-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Award className="w-4 h-4 text-yellow-400" />
                <span>Total Points: <strong className="text-white">{stats?.total_points || 0}</strong></span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <TrendingUp className="w-4 h-4 text-cyan-400" />
                <span>Best Streak: <strong className="text-white">{stats?.best_streak || 0}</strong></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfileModal;
