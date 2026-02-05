import React, { useState } from 'react';
import { Trophy, Medal, TrendingUp, Crown, ChevronUp, ChevronDown, Minus } from 'lucide-react';

interface LeaderboardEntry {
  rank: number;
  previousRank: number;
  username: string;
  avatar: string;
  correctPicks: number;
  totalPicks: number;
  accuracy: number;
  streak: number;
  points: number;
}

const leaderboardData: LeaderboardEntry[] = [
  { rank: 1, previousRank: 1, username: 'GridironGuru', avatar: '', correctPicks: 142, totalPicks: 176, accuracy: 80.7, streak: 8, points: 2840 },
  { rank: 2, previousRank: 4, username: 'StatsMaster99', avatar: '', correctPicks: 138, totalPicks: 176, accuracy: 78.4, streak: 5, points: 2760 },
  { rank: 3, previousRank: 2, username: 'NFLAnalyst', avatar: '', correctPicks: 136, totalPicks: 176, accuracy: 77.3, streak: 3, points: 2720 },
  { rank: 4, previousRank: 3, username: 'BettingKing', avatar: '', correctPicks: 135, totalPicks: 176, accuracy: 76.7, streak: 4, points: 2700 },
  { rank: 5, previousRank: 7, username: 'TouchdownTom', avatar: '', correctPicks: 133, totalPicks: 176, accuracy: 75.6, streak: 6, points: 2660 },
  { rank: 6, previousRank: 5, username: 'PigSkinPro', avatar: '', correctPicks: 131, totalPicks: 176, accuracy: 74.4, streak: 2, points: 2620 },
  { rank: 7, previousRank: 6, username: 'FantasyFootball', avatar: '', correctPicks: 130, totalPicks: 176, accuracy: 73.9, streak: 1, points: 2600 },
  { rank: 8, previousRank: 10, username: 'RedZoneRick', avatar: '', correctPicks: 128, totalPicks: 176, accuracy: 72.7, streak: 4, points: 2560 },
  { rank: 9, previousRank: 8, username: 'BlitzBoy', avatar: '', correctPicks: 127, totalPicks: 176, accuracy: 72.2, streak: 0, points: 2540 },
  { rank: 10, previousRank: 9, username: 'EndZoneExpert', avatar: '', correctPicks: 125, totalPicks: 176, accuracy: 71.0, streak: 2, points: 2500 },
];

const Leaderboard: React.FC = () => {
  const [timeframe, setTimeframe] = useState<'week' | 'season' | 'alltime'>('season');

  const getRankChange = (current: number, previous: number) => {
    if (current < previous) return { direction: 'up', change: previous - current };
    if (current > previous) return { direction: 'down', change: current - previous };
    return { direction: 'same', change: 0 };
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-5 h-5 text-yellow-400" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-slate-300" />;
    if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />;
    return <span className="text-slate-400 font-medium">{rank}</span>;
  };

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-b border-slate-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-400" />
              Community Leaderboard
            </h3>
            <p className="text-sm text-slate-400 mt-1">Top predictors this season</p>
          </div>
          
          {/* Timeframe Toggle */}
          <div className="flex items-center bg-slate-800 rounded-lg p-1">
            <button
              onClick={() => setTimeframe('week')}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                timeframe === 'week' ? 'bg-yellow-500 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setTimeframe('season')}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                timeframe === 'season' ? 'bg-yellow-500 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Season
            </button>
            <button
              onClick={() => setTimeframe('alltime')}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                timeframe === 'alltime' ? 'bg-yellow-500 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              All-Time
            </button>
          </div>
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-xs text-slate-400 border-b border-slate-700">
              <th className="px-4 py-3 text-left">Rank</th>
              <th className="px-4 py-3 text-left">User</th>
              <th className="px-4 py-3 text-center">Record</th>
              <th className="px-4 py-3 text-center">Accuracy</th>
              <th className="px-4 py-3 text-center">Streak</th>
              <th className="px-4 py-3 text-right">Points</th>
            </tr>
          </thead>
          <tbody>
            {leaderboardData.map((entry) => {
              const rankChange = getRankChange(entry.rank, entry.previousRank);
              
              return (
                <tr
                  key={entry.rank}
                  className={`border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors ${
                    entry.rank <= 3 ? 'bg-slate-700/20' : ''
                  }`}
                >
                  {/* Rank */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 flex items-center justify-center">
                        {getRankIcon(entry.rank)}
                      </div>
                      <div className="w-4">
                        {rankChange.direction === 'up' && (
                          <ChevronUp className="w-4 h-4 text-emerald-400" />
                        )}
                        {rankChange.direction === 'down' && (
                          <ChevronDown className="w-4 h-4 text-red-400" />
                        )}
                        {rankChange.direction === 'same' && (
                          <Minus className="w-4 h-4 text-slate-500" />
                        )}
                      </div>
                    </div>
                  </td>

                  {/* User */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                        {entry.username.charAt(0)}
                      </div>
                      <span className="font-medium text-white">{entry.username}</span>
                    </div>
                  </td>

                  {/* Record */}
                  <td className="px-4 py-3 text-center">
                    <span className="text-slate-300">
                      {entry.correctPicks}-{entry.totalPicks - entry.correctPicks}
                    </span>
                  </td>

                  {/* Accuracy */}
                  <td className="px-4 py-3 text-center">
                    <span className={`font-semibold ${
                      entry.accuracy >= 75 ? 'text-emerald-400' :
                      entry.accuracy >= 70 ? 'text-yellow-400' :
                      'text-slate-300'
                    }`}>
                      {entry.accuracy}%
                    </span>
                  </td>

                  {/* Streak */}
                  <td className="px-4 py-3 text-center">
                    {entry.streak > 0 ? (
                      <div className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full text-xs">
                        <TrendingUp className="w-3 h-3" />
                        {entry.streak}W
                      </div>
                    ) : (
                      <span className="text-slate-500">-</span>
                    )}
                  </td>

                  {/* Points */}
                  <td className="px-4 py-3 text-right">
                    <span className="font-bold text-white">{entry.points.toLocaleString()}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="p-4 bg-slate-900/50 border-t border-slate-700">
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Updated after each game • Points: 20 per correct pick + bonuses
          </p>
          <button className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors">
            View Full Rankings
          </button>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
