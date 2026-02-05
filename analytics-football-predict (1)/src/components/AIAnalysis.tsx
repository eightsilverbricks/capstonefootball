import React from 'react';
import { Game } from '@/data/nflData';
import { Brain, Zap, AlertTriangle, TrendingUp, Award } from 'lucide-react';

interface AIAnalysisProps {
  game: Game;
}

const AIAnalysis: React.FC<AIAnalysisProps> = ({ game }) => {
  const predictedWinner = game.homeWinProbability > game.awayWinProbability ? 'home' : 'away';
  const winnerTeam = predictedWinner === 'home' ? game.homeTeam : game.awayTeam;
  const loserTeam = predictedWinner === 'home' ? game.awayTeam : game.homeTeam;
  const winProbability = predictedWinner === 'home' ? game.homeWinProbability : game.awayWinProbability;

  // Get key players for narrative
  const winnerPlayer = predictedWinner === 'home' ? game.keyPlayers.home[0] : game.keyPlayers.away[0];
  const loserPlayer = predictedWinner === 'home' ? game.keyPlayers.away[0] : game.keyPlayers.home[0];

  return (
    <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-xl border border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-500/20 rounded-lg">
            <Brain className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">AI Prediction Analysis</h3>
            <p className="text-sm text-slate-400">Powered by historical data & advanced analytics</p>
          </div>
        </div>
      </div>

      {/* Prediction Summary */}
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center font-bold text-white text-lg shadow-lg"
              style={{ backgroundColor: winnerTeam.primaryColor }}
            >
              {winnerTeam.abbreviation}
            </div>
            <div>
              <p className="text-sm text-slate-400">Predicted Winner</p>
              <p className="text-xl font-bold text-white">{winnerTeam.city} {winnerTeam.name}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-emerald-400">{winProbability}%</div>
            <p className="text-sm text-slate-400">Win Probability</p>
          </div>
        </div>

        {/* Confidence Meter */}
        <div className="bg-slate-700/50 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-400">Model Confidence</span>
            <span className={`text-sm font-semibold ${
              winProbability >= 70 ? 'text-emerald-400' :
              winProbability >= 55 ? 'text-yellow-400' :
              'text-orange-400'
            }`}>
              {winProbability >= 70 ? 'High' : winProbability >= 55 ? 'Moderate' : 'Low'}
            </span>
          </div>
          <div className="h-2 bg-slate-600 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-1000 ${
                winProbability >= 70 ? 'bg-emerald-400' :
                winProbability >= 55 ? 'bg-yellow-400' :
                'bg-orange-400'
              }`}
              style={{ width: `${winProbability}%` }}
            />
          </div>
        </div>
      </div>

      {/* Key Players Spotlight */}
      <div className="p-4 border-b border-slate-700">
        <h4 className="text-sm font-semibold text-slate-400 mb-3 flex items-center gap-2">
          <Award className="w-4 h-4" />
          KEY MATCHUP
        </h4>
        <div className="flex items-center gap-4">
          {/* Winner's Key Player */}
          {winnerPlayer && (
            <div className="flex-1 text-center">
              <div className="relative inline-block">
                <img
                  src={winnerPlayer.image}
                  alt={winnerPlayer.name}
                  className="w-16 h-16 rounded-full object-cover border-3 mx-auto"
                  style={{ borderColor: winnerTeam.primaryColor }}
                />
                <div className="absolute -top-1 -right-1 bg-emerald-500 rounded-full p-1">
                  <TrendingUp className="w-3 h-3 text-white" />
                </div>
              </div>
              <p className="text-sm font-semibold text-white mt-2">{winnerPlayer.name}</p>
              <p className="text-xs text-slate-400">{winnerPlayer.position} • {winnerTeam.abbreviation}</p>
              <p className={`text-xs mt-1 ${
                winnerPlayer.recentForm === 'hot' ? 'text-orange-400' :
                winnerPlayer.recentForm === 'cold' ? 'text-blue-400' :
                'text-slate-400'
              }`}>
                {winnerPlayer.recentForm === 'hot' ? 'On Fire' : 
                 winnerPlayer.recentForm === 'cold' ? 'Struggling' : 'Steady'}
              </p>
            </div>
          )}

          <div className="text-slate-500 font-bold">VS</div>

          {/* Loser's Key Player */}
          {loserPlayer && (
            <div className="flex-1 text-center">
              <div className="relative inline-block">
                <img
                  src={loserPlayer.image}
                  alt={loserPlayer.name}
                  className="w-16 h-16 rounded-full object-cover border-3 mx-auto opacity-75"
                  style={{ borderColor: loserTeam.primaryColor }}
                />
                {loserPlayer.recentForm === 'cold' && (
                  <div className="absolute -top-1 -right-1 bg-red-500 rounded-full p-1">
                    <AlertTriangle className="w-3 h-3 text-white" />
                  </div>
                )}
              </div>
              <p className="text-sm font-semibold text-white mt-2">{loserPlayer.name}</p>
              <p className="text-xs text-slate-400">{loserPlayer.position} • {loserTeam.abbreviation}</p>
              <p className={`text-xs mt-1 ${
                loserPlayer.recentForm === 'hot' ? 'text-orange-400' :
                loserPlayer.recentForm === 'cold' ? 'text-blue-400' :
                'text-slate-400'
              }`}>
                {loserPlayer.recentForm === 'hot' ? 'On Fire' : 
                 loserPlayer.recentForm === 'cold' ? 'Struggling' : 'Steady'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* AI Narrative */}
      <div className="p-4">
        <h4 className="text-sm font-semibold text-cyan-400 mb-3 flex items-center gap-2">
          <Zap className="w-4 h-4" />
          AI BREAKDOWN
        </h4>
        <div className="bg-slate-700/30 rounded-lg p-4 border-l-4 border-cyan-400">
          <p className="text-slate-300 leading-relaxed text-sm">
            {game.aiNarrative}
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="bg-slate-700/30 rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-white">{game.spread > 0 ? '+' : ''}{game.spread}</p>
            <p className="text-xs text-slate-400">Spread</p>
          </div>
          <div className="bg-slate-700/30 rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-white">{game.overUnder}</p>
            <p className="text-xs text-slate-400">Over/Under</p>
          </div>
          <div className="bg-slate-700/30 rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-white">{game.temperature}°F</p>
            <p className="text-xs text-slate-400">{game.weather}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAnalysis;
