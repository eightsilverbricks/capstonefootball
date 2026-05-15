import React from 'react';
import {
  ApiPrediction,
  getConfidenceLevel,
  getConfidencePercent,
  getPredictedProbability,
  toPercent,
} from '@/types/prediction';
import { BarChart3, ChevronRight, ShieldCheck } from 'lucide-react';

interface GameCardProps {
  game: ApiPrediction;
  onClick: () => void;
  isSelected?: boolean;
}

const GameCard: React.FC<GameCardProps> = ({ game, onClick, isSelected }) => {
  const confidenceLevel = getConfidenceLevel(game);
  const confidencePercent = getConfidencePercent(game);
  const predictedProbability = getPredictedProbability(game);
  const homePercent = Number(toPercent(game.home_win_prob));
  const awayPercent = Number(toPercent(game.away_win_prob));
  const predictedSide = game.predicted_winner === game.home_team ? 'home' : 'away';

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick();
        }
      }}
      className={`relative bg-slate-900 rounded-lg overflow-hidden cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl hover:shadow-cyan-500/10 border ${
        isSelected ? 'border-cyan-400 shadow-lg shadow-cyan-500/30' : 'border-slate-700/50'
      }`}
    >
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-cyan-400 bg-cyan-400/10 px-2 py-1 rounded-full">
            Week {game.week}
          </span>
          <div className="flex items-center gap-1 text-xs text-slate-400">
            <BarChart3 className="w-3.5 h-3.5" />
            <span>{game.season}</span>
          </div>
        </div>

        <div className="space-y-3">
          <div className={`flex items-center justify-between p-3 rounded-lg border ${
            predictedSide === 'away' ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-slate-800/60 border-slate-700'
          }`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-slate-700 flex items-center justify-center font-bold text-white text-sm">
                {game.away_team}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-white">{game.away_team}</p>
                <p className="text-xs text-slate-400">Away</p>
              </div>
            </div>
            <p className={`text-lg font-bold ${predictedSide === 'away' ? 'text-emerald-400' : 'text-slate-300'}`}>
              {toPercent(game.away_win_prob)}%
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-slate-700" />
            <span className="text-xs text-slate-500 font-medium">@</span>
            <div className="flex-1 h-px bg-slate-700" />
          </div>

          <div className={`flex items-center justify-between p-3 rounded-lg border ${
            predictedSide === 'home' ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-slate-800/60 border-slate-700'
          }`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-cyan-700 flex items-center justify-center font-bold text-white text-sm">
                {game.home_team}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-white">{game.home_team}</p>
                <p className="text-xs text-slate-400">Home</p>
              </div>
            </div>
            <p className={`text-lg font-bold ${predictedSide === 'home' ? 'text-emerald-400' : 'text-slate-300'}`}>
              {toPercent(game.home_win_prob)}%
            </p>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-400">Model confidence</span>
            <span className="text-sm font-semibold text-cyan-400">
              {confidenceLevel} ({confidencePercent.toFixed(1)}%)
            </span>
          </div>
          <div className="h-2.5 bg-slate-700 rounded-full overflow-hidden flex">
            <div
              className="h-full transition-all duration-500"
              style={{
                width: `${awayPercent}%`,
                backgroundColor: '#64748b',
              }}
            />
            <div
              className="h-full transition-all duration-500"
              style={{
                width: `${homePercent}%`,
                backgroundColor: '#06b6d4',
              }}
            />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold">
            <ShieldCheck className="w-4 h-4" />
            {game.predicted_winner}
          </div>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onClick();
            }}
            className="flex items-center gap-1 text-cyan-400 font-medium group"
          >
            <span>Details</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameCard;
