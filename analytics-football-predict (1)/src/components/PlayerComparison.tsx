import React from 'react';
import { Player } from '@/data/nflData';
import { TrendingUp, TrendingDown, Minus, Flame, Snowflake, Activity } from 'lucide-react';

interface PlayerComparisonProps {
  player1: Player | null;
  player2: Player | null;
  team1Color: string;
  team2Color: string;
}

const PlayerComparison: React.FC<PlayerComparisonProps> = ({
  player1,
  player2,
  team1Color,
  team2Color,
}) => {
  const getFormIcon = (form: 'hot' | 'cold' | 'neutral') => {
    switch (form) {
      case 'hot':
        return <Flame className="w-4 h-4 text-orange-400" />;
      case 'cold':
        return <Snowflake className="w-4 h-4 text-blue-400" />;
      default:
        return <Activity className="w-4 h-4 text-slate-400" />;
    }
  };

  const getFormLabel = (form: 'hot' | 'cold' | 'neutral') => {
    switch (form) {
      case 'hot':
        return 'On Fire';
      case 'cold':
        return 'Struggling';
      default:
        return 'Steady';
    }
  };

  const compareStats = (stat1: number | undefined, stat2: number | undefined, higherIsBetter: boolean = true) => {
    if (stat1 === undefined || stat2 === undefined) return 'equal';
    if (stat1 === stat2) return 'equal';
    const better = higherIsBetter ? stat1 > stat2 : stat1 < stat2;
    return better ? 'player1' : 'player2';
  };

  const StatRow: React.FC<{
    label: string;
    stat1: number | undefined;
    stat2: number | undefined;
    suffix?: string;
    higherIsBetter?: boolean;
  }> = ({ label, stat1, stat2, suffix = '', higherIsBetter = true }) => {
    const comparison = compareStats(stat1, stat2, higherIsBetter);

    return (
      <div className="flex items-center justify-between py-2 border-b border-slate-700/50">
        <div className={`flex-1 text-right pr-4 ${comparison === 'player1' ? 'text-emerald-400 font-semibold' : 'text-slate-300'}`}>
          {stat1 !== undefined ? `${stat1}${suffix}` : '-'}
          {comparison === 'player1' && <TrendingUp className="inline w-3 h-3 ml-1" />}
        </div>
        <div className="flex-shrink-0 w-32 text-center text-xs text-slate-400 font-medium">
          {label}
        </div>
        <div className={`flex-1 text-left pl-4 ${comparison === 'player2' ? 'text-emerald-400 font-semibold' : 'text-slate-300'}`}>
          {comparison === 'player2' && <TrendingUp className="inline w-3 h-3 mr-1" />}
          {stat2 !== undefined ? `${stat2}${suffix}` : '-'}
        </div>
      </div>
    );
  };

  if (!player1 && !player2) {
    return (
      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700 text-center">
        <Activity className="w-12 h-12 mx-auto text-slate-600 mb-3" />
        <h3 className="text-lg font-semibold text-white mb-2">Select a Player</h3>
        <p className="text-slate-400 text-sm">
          Click on a position on the field to view player stats and comparisons
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/50 rounded-xl overflow-hidden border border-slate-700">
      {/* Header */}
      <div className="flex">
        {/* Player 1 */}
        <div className="flex-1 p-4 text-center border-r border-slate-700" style={{ backgroundColor: `${team1Color}20` }}>
          {player1 ? (
            <>
              <div className="relative inline-block">
                <img
                  src={player1.image}
                  alt={player1.name}
                  className="w-20 h-20 rounded-full object-cover border-4 mx-auto animate-bounce"
                  style={{ borderColor: team1Color, animationDuration: '2s' }}
                />
                <div className="absolute -bottom-1 -right-1 bg-slate-900 rounded-full p-1">
                  {getFormIcon(player1.recentForm)}
                </div>
              </div>
              <h3 className="mt-2 font-bold text-white">{player1.name}</h3>
              <p className="text-sm text-slate-400">#{player1.number} • {player1.position}</p>
              <div className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-xs ${
                player1.recentForm === 'hot' ? 'bg-orange-500/20 text-orange-400' :
                player1.recentForm === 'cold' ? 'bg-blue-500/20 text-blue-400' :
                'bg-slate-600/20 text-slate-400'
              }`}>
                {getFormIcon(player1.recentForm)}
                {getFormLabel(player1.recentForm)}
              </div>
            </>
          ) : (
            <div className="py-8 text-slate-500">No player selected</div>
          )}
        </div>

        {/* VS */}
        <div className="flex items-center justify-center w-12 bg-slate-900">
          <span className="text-slate-500 font-bold text-sm transform -rotate-90">VS</span>
        </div>

        {/* Player 2 */}
        <div className="flex-1 p-4 text-center border-l border-slate-700" style={{ backgroundColor: `${team2Color}20` }}>
          {player2 ? (
            <>
              <div className="relative inline-block">
                <img
                  src={player2.image}
                  alt={player2.name}
                  className="w-20 h-20 rounded-full object-cover border-4 mx-auto animate-bounce"
                  style={{ borderColor: team2Color, animationDuration: '2.5s' }}
                />
                <div className="absolute -bottom-1 -right-1 bg-slate-900 rounded-full p-1">
                  {getFormIcon(player2.recentForm)}
                </div>
              </div>
              <h3 className="mt-2 font-bold text-white">{player2.name}</h3>
              <p className="text-sm text-slate-400">#{player2.number} • {player2.position}</p>
              <div className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-xs ${
                player2.recentForm === 'hot' ? 'bg-orange-500/20 text-orange-400' :
                player2.recentForm === 'cold' ? 'bg-blue-500/20 text-blue-400' :
                'bg-slate-600/20 text-slate-400'
              }`}>
                {getFormIcon(player2.recentForm)}
                {getFormLabel(player2.recentForm)}
              </div>
            </>
          ) : (
            <div className="py-8 text-slate-500">No player selected</div>
          )}
        </div>
      </div>

      {/* Stats Comparison */}
      {(player1 || player2) && (
        <div className="p-4">
          <h4 className="text-sm font-semibold text-slate-400 mb-3 text-center">SEASON STATISTICS</h4>
          <StatRow label="Passing Yards" stat1={player1?.stats.passingYards} stat2={player2?.stats.passingYards} />
          <StatRow label="Touchdowns" stat1={player1?.stats.touchdowns} stat2={player2?.stats.touchdowns} />
          <StatRow label="Interceptions" stat1={player1?.stats.interceptions} stat2={player2?.stats.interceptions} higherIsBetter={false} />
          <StatRow label="Completion %" stat1={player1?.stats.completionPct} stat2={player2?.stats.completionPct} suffix="%" />
          <StatRow label="QB Rating" stat1={player1?.stats.qbRating} stat2={player2?.stats.qbRating} />
        </div>
      )}

      {/* AI Insights */}
      {(player1 || player2) && (
        <div className="p-4 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border-t border-slate-700">
          <h4 className="text-sm font-semibold text-cyan-400 mb-2 flex items-center gap-2">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm0 14a6 6 0 110-12 6 6 0 010 12zm-1-5a1 1 0 112 0v2a1 1 0 11-2 0v-2zm0-6a1 1 0 112 0v3a1 1 0 11-2 0V5z" />
            </svg>
            AI Analysis
          </h4>
          {player1 && (
            <p className="text-sm text-slate-300 mb-2">
              <span className="font-semibold" style={{ color: team1Color }}>{player1.name}:</span> {player1.aiInsight}
            </p>
          )}
          {player2 && (
            <p className="text-sm text-slate-300">
              <span className="font-semibold" style={{ color: team2Color }}>{player2.name}:</span> {player2.aiInsight}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default PlayerComparison;
