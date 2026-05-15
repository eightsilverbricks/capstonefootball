import React from 'react';
import {
  ApiPrediction,
  getConfidenceLevel,
  getConfidencePercent,
  getPredictedProbability,
  toPercent,
} from '@/types/prediction';
import { BarChart3, Calendar, ShieldCheck, X } from 'lucide-react';

interface GameDetailModalProps {
  game: ApiPrediction;
  onClose: () => void;
}

const GameDetailModal: React.FC<GameDetailModalProps> = ({ game, onClose }) => {
  const predictedProbability = getPredictedProbability(game);
  const confidenceLevel = getConfidenceLevel(game);
  const confidencePercent = getConfidencePercent(game);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative min-h-screen flex items-start justify-center p-4 pt-8">
        <div className="relative w-full max-w-3xl bg-slate-900 rounded-xl shadow-2xl overflow-hidden border border-slate-700">
          <div className="p-6 border-b border-slate-700 bg-slate-950/60">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 bg-slate-800 hover:bg-slate-700 rounded-md transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-white" />
            </button>

            <div className="flex items-center gap-2 text-sm text-slate-400 mb-4">
              <Calendar className="w-4 h-4" />
              <span>Week {game.week}</span>
              <span className="mx-1">•</span>
              <span>{game.season} season</span>
            </div>

            <h2 className="text-3xl font-bold text-white">
              {game.away_team} @ {game.home_team}
            </h2>
            <p className="mt-2 text-slate-400">
              Logistic regression model prediction generated from the processed training table.
            </p>
          </div>

          <div className="p-6 space-y-6">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-4">
                <p className="text-sm text-slate-400 mb-1">{game.away_team} win probability</p>
                <p className="text-3xl font-bold text-slate-100">{toPercent(game.away_win_prob)}%</p>
              </div>
              <div className="rounded-lg border border-cyan-800/70 bg-cyan-950/30 p-4">
                <p className="text-sm text-slate-400 mb-1">{game.home_team} win probability</p>
                <p className="text-3xl font-bold text-cyan-300">{toPercent(game.home_win_prob)}%</p>
              </div>
            </div>

            <div className="rounded-lg border border-emerald-700/50 bg-emerald-950/20 p-5">
              <div className="flex items-center gap-2 text-emerald-300 mb-2">
                <ShieldCheck className="w-5 h-5" />
                <span className="font-semibold">Predicted winner</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
                <p className="text-4xl font-bold text-white">{game.predicted_winner}</p>
                <p className="text-slate-300">
                  {toPercent(predictedProbability)}% model win probability
                </p>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-slate-300">
                  <BarChart3 className="w-4 h-4 text-cyan-400" />
                  <span>Confidence rating</span>
                </div>
                <span className="font-semibold text-cyan-300">
                  {confidenceLevel} ({confidencePercent.toFixed(1)}%)
                </span>
              </div>
              <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400"
                  style={{ width: `${Math.max(confidencePercent, 4)}%` }}
                />
              </div>
            </div>

            <div className="rounded-lg border border-slate-700 bg-slate-800/40 p-5">
              <h3 className="text-lg font-semibold text-white mb-3">What this prediction uses</h3>
              <p className="text-slate-400 leading-7">
                The API loads the trained logistic regression pipeline and scores each game with the
                same feature set used by the Python model: betting market lines, rest differential,
                division-game context, season and last-three-game EPA/success-rate signals, turnover
                differential, quarterback efficiency, and offensive-vs-defensive matchup features.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameDetailModal;
