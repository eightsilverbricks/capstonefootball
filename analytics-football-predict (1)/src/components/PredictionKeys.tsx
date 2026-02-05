import React, { useState } from 'react';
import { PredictionKey } from '@/data/nflData';
import { 
  Crown, RefreshCw, Target, TrendingUp, Footprints, Shield, 
  Home, Heart, BarChart3, Star, Clock, ClipboardList, History,
  ChevronDown, ChevronUp, Info
} from 'lucide-react';

interface PredictionKeysProps {
  keys: PredictionKey[];
  homeTeamName: string;
  awayTeamName: string;
  homeTeamColor: string;
  awayTeamColor: string;
  onKeyToggle?: (keyId: number, enabled: boolean) => void;
}

const iconMap: { [key: string]: React.ReactNode } = {
  crown: <Crown className="w-4 h-4" />,
  refresh: <RefreshCw className="w-4 h-4" />,
  target: <Target className="w-4 h-4" />,
  trending: <TrendingUp className="w-4 h-4" />,
  run: <Footprints className="w-4 h-4" />,
  shield: <Shield className="w-4 h-4" />,
  home: <Home className="w-4 h-4" />,
  medical: <Heart className="w-4 h-4" />,
  chart: <BarChart3 className="w-4 h-4" />,
  star: <Star className="w-4 h-4" />,
  clock: <Clock className="w-4 h-4" />,
  clipboard: <ClipboardList className="w-4 h-4" />,
  history: <History className="w-4 h-4" />,
};

const PredictionKeys: React.FC<PredictionKeysProps> = ({
  keys,
  homeTeamName,
  awayTeamName,
  homeTeamColor,
  awayTeamColor,
  onKeyToggle,
}) => {
  const [expandedKey, setExpandedKey] = useState<number | null>(null);
  const [enabledKeys, setEnabledKeys] = useState<Set<number>>(new Set(keys.map(k => k.id)));

  const toggleKey = (keyId: number) => {
    const newEnabled = new Set(enabledKeys);
    if (newEnabled.has(keyId)) {
      newEnabled.delete(keyId);
    } else {
      newEnabled.add(keyId);
    }
    setEnabledKeys(newEnabled);
    onKeyToggle?.(keyId, newEnabled.has(keyId));
  };

  const calculateTotalScore = (side: 'home' | 'away') => {
    return keys
      .filter(k => enabledKeys.has(k.id))
      .reduce((total, key) => {
        const score = side === 'home' ? key.homeTeamScore : key.awayTeamScore;
        return total + (score * key.weight / 100);
      }, 0);
  };

  const homeTotal = calculateTotalScore('home');
  const awayTotal = calculateTotalScore('away');
  const totalScore = homeTotal + awayTotal;
  const homePercentage = totalScore > 0 ? (homeTotal / totalScore) * 100 : 50;
  const awayPercentage = totalScore > 0 ? (awayTotal / totalScore) * 100 : 50;

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border-b border-slate-700">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-cyan-400" />
            13 Keys to Victory
          </h3>
          <div className="flex items-center gap-1 text-xs text-slate-400">
            <Info className="w-3 h-3" />
            Toggle factors to adjust prediction
          </div>
        </div>

        {/* Score Summary */}
        <div className="flex items-center gap-3">
          <div className="flex-1 text-right">
            <span className="text-sm text-slate-400">{awayTeamName}</span>
            <p className="text-2xl font-bold" style={{ color: awayTeamColor }}>
              {awayPercentage.toFixed(1)}%
            </p>
          </div>
          <div className="flex-1">
            <div className="h-3 bg-slate-700 rounded-full overflow-hidden flex">
              <div
                className="h-full transition-all duration-500"
                style={{ width: `${awayPercentage}%`, backgroundColor: awayTeamColor }}
              />
              <div
                className="h-full transition-all duration-500"
                style={{ width: `${homePercentage}%`, backgroundColor: homeTeamColor }}
              />
            </div>
          </div>
          <div className="flex-1 text-left">
            <span className="text-sm text-slate-400">{homeTeamName}</span>
            <p className="text-2xl font-bold" style={{ color: homeTeamColor }}>
              {homePercentage.toFixed(1)}%
            </p>
          </div>
        </div>
      </div>

      {/* Keys List */}
      <div className="divide-y divide-slate-700/50">
        {keys.map((key) => {
          const isEnabled = enabledKeys.has(key.id);
          const isExpanded = expandedKey === key.id;
          const homeWins = key.homeTeamScore > key.awayTeamScore;
          const awayWins = key.awayTeamScore > key.homeTeamScore;

          return (
            <div
              key={key.id}
              className={`transition-all ${!isEnabled ? 'opacity-50' : ''}`}
            >
              <div
                className="flex items-center gap-3 p-3 hover:bg-slate-700/30 cursor-pointer"
                onClick={() => setExpandedKey(isExpanded ? null : key.id)}
              >
                {/* Toggle */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleKey(key.id);
                  }}
                  className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${
                    isEnabled ? 'bg-cyan-500 text-white' : 'bg-slate-600 text-slate-400'
                  }`}
                >
                  {isEnabled && (
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>

                {/* Icon */}
                <div className={`p-1.5 rounded-lg ${isEnabled ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-700 text-slate-500'}`}>
                  {iconMap[key.icon] || <Star className="w-4 h-4" />}
                </div>

                {/* Name & Weight */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white text-sm">{key.name}</span>
                    <span className="text-xs text-slate-500">({key.weight}%)</span>
                  </div>
                </div>

                {/* Score Comparison */}
                <div className="flex items-center gap-2 text-sm">
                  <span className={`font-semibold ${awayWins ? 'text-emerald-400' : 'text-slate-400'}`}>
                    {key.awayTeamScore}
                  </span>
                  <span className="text-slate-600">-</span>
                  <span className={`font-semibold ${homeWins ? 'text-emerald-400' : 'text-slate-400'}`}>
                    {key.homeTeamScore}
                  </span>
                </div>

                {/* Winner Indicator */}
                <div className="w-6 flex justify-center">
                  {homeWins && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: homeTeamColor }} />}
                  {awayWins && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: awayTeamColor }} />}
                  {!homeWins && !awayWins && <div className="w-2 h-2 rounded-full bg-slate-600" />}
                </div>

                {/* Expand Icon */}
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </div>

              {/* Expanded Description */}
              {isExpanded && (
                <div className="px-3 pb-3 pl-14">
                  <p className="text-sm text-slate-400">{key.description}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full transition-all"
                        style={{
                          width: `${(key.awayTeamScore / 10) * 100}%`,
                          backgroundColor: awayTeamColor,
                        }}
                      />
                    </div>
                    <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full transition-all"
                        style={{
                          width: `${(key.homeTeamScore / 10) * 100}%`,
                          backgroundColor: homeTeamColor,
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="p-3 bg-slate-900/50 border-t border-slate-700">
        <p className="text-xs text-slate-500 text-center">
          Based on historical data analysis of 1,200+ NFL games
        </p>
      </div>
    </div>
  );
};

export default PredictionKeys;
