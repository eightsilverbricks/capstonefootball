import React from 'react';
import { modelAccuracy, topFactors } from '@/data/nflData';
import { Target, TrendingUp, Award, BarChart3, CheckCircle, History } from 'lucide-react';

const ModelAccuracy: React.FC = () => {
  const thisWeekPct = (modelAccuracy.thisWeek / modelAccuracy.thisWeekTotal * 100).toFixed(1);
  const seasonPct = (modelAccuracy.season / modelAccuracy.seasonTotal * 100).toFixed(1);
  const lastSeasonPct = (modelAccuracy.lastSeason / modelAccuracy.lastSeasonTotal * 100).toFixed(1);
  const allTimePct = (modelAccuracy.allTime / modelAccuracy.allTimeTotal * 100).toFixed(1);

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border-b border-slate-700">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Target className="w-5 h-5 text-emerald-400" />
          Model Performance
        </h3>
        <p className="text-sm text-slate-400 mt-1">Track record based on historical predictions</p>
      </div>

      {/* Accuracy Stats */}
      <div className="p-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* This Week */}
        <div className="bg-slate-700/50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-emerald-400">{thisWeekPct}%</div>
          <p className="text-xs text-slate-400 mt-1">This Week</p>
          <p className="text-xs text-slate-500">{modelAccuracy.thisWeek}/{modelAccuracy.thisWeekTotal}</p>
        </div>

        {/* Season */}
        <div className="bg-slate-700/50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-cyan-400">{seasonPct}%</div>
          <p className="text-xs text-slate-400 mt-1">2024 Season</p>
          <p className="text-xs text-slate-500">{modelAccuracy.season}/{modelAccuracy.seasonTotal}</p>
        </div>

        {/* Last Season */}
        <div className="bg-slate-700/50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-purple-400">{lastSeasonPct}%</div>
          <p className="text-xs text-slate-400 mt-1">2023 Season</p>
          <p className="text-xs text-slate-500">{modelAccuracy.lastSeason}/{modelAccuracy.lastSeasonTotal}</p>
        </div>

        {/* All Time */}
        <div className="bg-slate-700/50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-yellow-400">{allTimePct}%</div>
          <p className="text-xs text-slate-400 mt-1">All Time</p>
          <p className="text-xs text-slate-500">{modelAccuracy.allTime}/{modelAccuracy.allTimeTotal}</p>
        </div>
      </div>

      {/* Accuracy Bar */}
      <div className="px-4 pb-4">
        <div className="bg-slate-700/50 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-400">Season Accuracy</span>
            <span className="text-sm font-semibold text-emerald-400">{seasonPct}%</span>
          </div>
          <div className="h-3 bg-slate-600 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-1000"
              style={{ width: `${seasonPct}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>0%</span>
            <span>Vegas Average: 52.4%</span>
            <span>100%</span>
          </div>
        </div>
      </div>

      {/* Top Factors */}
      <div className="p-4 border-t border-slate-700">
        <h4 className="text-sm font-semibold text-slate-400 mb-3 flex items-center gap-2">
          <Award className="w-4 h-4" />
          TOP 10 PREDICTIVE FACTORS
        </h4>
        <div className="space-y-2">
          {topFactors.map((factor) => (
            <div key={factor.rank} className="flex items-center gap-3">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                factor.rank <= 3 ? 'bg-yellow-500/20 text-yellow-400' :
                factor.rank <= 6 ? 'bg-slate-600 text-slate-300' :
                'bg-slate-700 text-slate-400'
              }`}>
                {factor.rank}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-white truncate">{factor.name}</span>
                  <span className="text-xs text-cyan-400 ml-2">{factor.importance}%</span>
                </div>
                <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden mt-1">
                  <div
                    className={`h-full transition-all ${
                      factor.rank <= 3 ? 'bg-yellow-400' :
                      factor.rank <= 6 ? 'bg-cyan-400' :
                      'bg-slate-500'
                    }`}
                    style={{ width: `${factor.importance * 6.67}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Methodology Note */}
      <div className="p-4 bg-slate-900/50 border-t border-slate-700">
        <div className="flex items-start gap-2">
          <History className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-slate-500">
            Model trained on 1,200+ NFL games from 2019-2024. Factors weighted based on historical correlation with game outcomes. Updated weekly with new data.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ModelAccuracy;
