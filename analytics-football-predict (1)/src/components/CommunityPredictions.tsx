import React, { useState, useEffect } from 'react';
import { Game, Comment } from '@/data/nflData';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { MessageCircle, ThumbsUp, Send, Trophy, Users, TrendingUp, Lock, Loader2 } from 'lucide-react';

interface CommunityPredictionsProps {
  game: Game;
  onOpenAuth: () => void;
}

const CommunityPredictions: React.FC<CommunityPredictionsProps> = ({
  game,
  onOpenAuth,
}) => {
  const { user, profile, refreshStats } = useAuth();
  const [userPick, setUserPick] = useState<'home' | 'away' | null>(null);
  const [confidence, setConfidence] = useState(75);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<Comment[]>(game.comments);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [existingPrediction, setExistingPrediction] = useState<any>(null);

  // Check for existing prediction when user is logged in
  useEffect(() => {
    if (user) {
      checkExistingPrediction();
    } else {
      setExistingPrediction(null);
      setHasSubmitted(false);
    }
  }, [user, game.id]);

  const checkExistingPrediction = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('user_predictions')
      .select('*')
      .eq('user_id', user.id)
      .eq('game_id', game.id)
      .single();

    if (data && !error) {
      setExistingPrediction(data);
      setUserPick(data.pick);
      setConfidence(data.confidence);
      setHasSubmitted(true);
    }
  };

  const handleSubmitPrediction = async () => {
    if (!user) {
      onOpenAuth();
      return;
    }

    if (!userPick) return;

    setLoading(true);

    try {
      // Save prediction to database
      const { error } = await supabase
        .from('user_predictions')
        .upsert({
          user_id: user.id,
          game_id: game.id,
          week: game.week,
          season: 2024,
          pick: userPick,
          confidence,
          result: 'pending',
          home_team: game.homeTeam.city,
          away_team: game.awayTeam.city,
        }, {
          onConflict: 'user_id,game_id,season'
        });

      if (error) throw error;

      // Update user stats
      const { data: currentStats } = await supabase
        .from('user_stats')
        .select('total_predictions')
        .eq('user_id', user.id)
        .single();

      if (currentStats && !existingPrediction) {
        await supabase
          .from('user_stats')
          .update({ 
            total_predictions: currentStats.total_predictions + 1,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id);
      }

      setHasSubmitted(true);
      setExistingPrediction({ pick: userPick, confidence });
      refreshStats();
    } catch (error) {
      console.error('Error saving prediction:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = () => {
    if (commentText.trim() && userPick) {
      const newComment: Comment = {
        id: Date.now().toString(),
        user: profile?.username || 'Anonymous',
        avatar: '',
        text: commentText,
        timestamp: 'Just now',
        likes: 0,
        prediction: userPick,
      };
      setComments([newComment, ...comments]);
      setCommentText('');
    }
  };

  const handleLikeComment = (commentId: string) => {
    setComments(comments.map(c => 
      c.id === commentId ? { ...c, likes: c.likes + 1 } : c
    ));
  };

  // Calculate community consensus
  const homePicks = comments.filter(c => c.prediction === 'home').length;
  const awayPicks = comments.filter(c => c.prediction === 'away').length;
  const totalPicks = homePicks + awayPicks;
  const homeConsensus = totalPicks > 0 ? (homePicks / totalPicks) * 100 : 50;

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-b border-slate-700">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Users className="w-5 h-5 text-purple-400" />
          Community Predictions
        </h3>
        <p className="text-sm text-slate-400 mt-1">Make your pick and see what others think</p>
      </div>

      {/* Make Your Pick */}
      <div className="p-4 border-b border-slate-700">
        <h4 className="text-sm font-semibold text-slate-400 mb-3">YOUR PREDICTION</h4>
        
        {/* Sign In Prompt */}
        {!user && (
          <div className="mb-4 p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
            <p className="text-sm text-cyan-400 flex items-center gap-2">
              <Lock className="w-4 h-4" />
              <span>Sign in to save your predictions and track your accuracy!</span>
            </p>
          </div>
        )}
        
        <div className="flex gap-3 mb-4">
          {/* Away Team Pick */}
          <button
            onClick={() => !hasSubmitted && setUserPick('away')}
            disabled={hasSubmitted}
            className={`flex-1 p-3 rounded-lg border-2 transition-all ${
              userPick === 'away'
                ? 'border-cyan-400 bg-cyan-400/10'
                : 'border-slate-600 hover:border-slate-500'
            } ${hasSubmitted ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div
              className="w-10 h-10 rounded-lg mx-auto mb-2 flex items-center justify-center font-bold text-white"
              style={{ backgroundColor: game.awayTeam.primaryColor }}
            >
              {game.awayTeam.abbreviation}
            </div>
            <p className="text-white font-medium text-sm">{game.awayTeam.city}</p>
            <p className="text-xs text-slate-400">{game.awayTeam.record}</p>
          </button>

          {/* Home Team Pick */}
          <button
            onClick={() => !hasSubmitted && setUserPick('home')}
            disabled={hasSubmitted}
            className={`flex-1 p-3 rounded-lg border-2 transition-all ${
              userPick === 'home'
                ? 'border-cyan-400 bg-cyan-400/10'
                : 'border-slate-600 hover:border-slate-500'
            } ${hasSubmitted ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div
              className="w-10 h-10 rounded-lg mx-auto mb-2 flex items-center justify-center font-bold text-white"
              style={{ backgroundColor: game.homeTeam.primaryColor }}
            >
              {game.homeTeam.abbreviation}
            </div>
            <p className="text-white font-medium text-sm">{game.homeTeam.city}</p>
            <p className="text-xs text-slate-400">{game.homeTeam.record}</p>
          </button>
        </div>

        {/* Confidence Slider */}
        {userPick && !hasSubmitted && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-400">Confidence Level</span>
              <span className="text-sm font-semibold text-cyan-400">{confidence}%</span>
            </div>
            <input
              type="range"
              min="50"
              max="100"
              value={confidence}
              onChange={(e) => setConfidence(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>Toss-up</span>
              <span>Lock</span>
            </div>
          </div>
        )}

        {/* Submit Button */}
        {userPick && !hasSubmitted && (
          <button
            onClick={handleSubmitPrediction}
            disabled={loading}
            className="w-full py-2 bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-semibold rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Trophy className="w-4 h-4" />
                {user ? 'Lock In Prediction' : 'Sign In to Save Pick'}
              </>
            )}
          </button>
        )}

        {/* Submitted Confirmation */}
        {hasSubmitted && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 text-center">
            <Trophy className="w-6 h-6 text-emerald-400 mx-auto mb-1" />
            <p className="text-emerald-400 font-semibold">Prediction Locked!</p>
            <p className="text-sm text-slate-400">
              You picked {userPick === 'home' ? game.homeTeam.city : game.awayTeam.city} with {confidence}% confidence
            </p>
          </div>
        )}
      </div>

      {/* Community Consensus */}
      <div className="p-4 border-b border-slate-700">
        <h4 className="text-sm font-semibold text-slate-400 mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          COMMUNITY CONSENSUS
        </h4>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium" style={{ color: game.awayTeam.primaryColor }}>
            {(100 - homeConsensus).toFixed(0)}%
          </span>
          <div className="flex-1 h-3 bg-slate-700 rounded-full overflow-hidden flex">
            <div
              className="h-full transition-all duration-500"
              style={{ width: `${100 - homeConsensus}%`, backgroundColor: game.awayTeam.primaryColor }}
            />
            <div
              className="h-full transition-all duration-500"
              style={{ width: `${homeConsensus}%`, backgroundColor: game.homeTeam.primaryColor }}
            />
          </div>
          <span className="text-sm font-medium" style={{ color: game.homeTeam.primaryColor }}>
            {homeConsensus.toFixed(0)}%
          </span>
        </div>
        <p className="text-xs text-slate-500 text-center mt-2">{totalPicks} predictions</p>
      </div>

      {/* Comments Section */}
      <div className="p-4">
        <h4 className="text-sm font-semibold text-slate-400 mb-3 flex items-center gap-2">
          <MessageCircle className="w-4 h-4" />
          DISCUSSION ({comments.length})
        </h4>

        {/* Add Comment */}
        {userPick && (
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Share your thoughts..."
              className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-400 focus:outline-none focus:border-cyan-400"
              onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
            />
            <button
              onClick={handleAddComment}
              disabled={!commentText.trim()}
              className="px-3 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Comments List */}
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {comments.length === 0 ? (
            <p className="text-center text-slate-500 py-4">No comments yet. Be the first!</p>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="bg-slate-700/50 rounded-lg p-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                      {comment.user.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{comment.user}</p>
                      <p className="text-xs text-slate-400">{comment.timestamp}</p>
                    </div>
                  </div>
                  <div
                    className="px-2 py-0.5 rounded text-xs font-medium"
                    style={{
                      backgroundColor: comment.prediction === 'home' 
                        ? `${game.homeTeam.primaryColor}30` 
                        : `${game.awayTeam.primaryColor}30`,
                      color: comment.prediction === 'home' 
                        ? game.homeTeam.primaryColor 
                        : game.awayTeam.primaryColor,
                    }}
                  >
                    {comment.prediction === 'home' ? game.homeTeam.abbreviation : game.awayTeam.abbreviation}
                  </div>
                </div>
                <p className="text-sm text-slate-300 mt-2">{comment.text}</p>
                <button
                  onClick={() => handleLikeComment(comment.id)}
                  className="flex items-center gap-1 mt-2 text-xs text-slate-400 hover:text-cyan-400 transition-colors"
                >
                  <ThumbsUp className="w-3 h-3" />
                  {comment.likes}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default CommunityPredictions;
