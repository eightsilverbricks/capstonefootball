import React from 'react';
import { Game } from '@/data/nflData';
import { ChevronRight, Cloud, Snowflake, Sun, Home } from 'lucide-react';

interface GameCardProps {
  game: Game;
  onClick: () => void;
  isSelected?: boolean;
}

const GameCard: React.FC<GameCardProps> = ({ game, onClick, isSelected }) => {
  const getWeatherIcon = () => {
    if (game.weather.toLowerCase().includes('snow')) return <Snowflake className="w-4 h-4" />;
    if (game.weather.toLowerCase().includes('cloud')) return <Cloud className="w-4 h-4" />;
    if (game.weather.toLowerCase().includes('dome')) return <Home className="w-4 h-4" />;
    return <Sun className="w-4 h-4" />;
  };

  const predictedWinner = game.homeWinProbability > game.awayWinProbability ? 'home' : 'away';

  return (
    <div
      onClick={onClick}
      className={`relative bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-xl overflow-hidden cursor-pointer transform transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-cyan-500/20 border ${
        isSelected ? 'border-cyan-400 shadow-lg shadow-cyan-500/30' : 'border-slate-700/50'
      }`}
    >
      {/* Stadium Background */}
      <div className="absolute inset-0 opacity-20">
        <img
          src={game.stadiumImage}
          alt={game.stadium}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/80 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative p-4">
        {/* Game Time & Weather */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-cyan-400 bg-cyan-400/10 px-2 py-1 rounded-full">
            Week {game.week}
          </span>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            {getWeatherIcon()}
            <span>{game.temperature}°F</span>
          </div>
        </div>

        {/* Teams */}
        <div className="space-y-3">
          {/* Away Team */}
          <div className={`flex items-center justify-between p-2 rounded-lg transition-colors ${
            predictedWinner === 'away' ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-slate-800/50'
          }`}>
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white text-sm"
                style={{ backgroundColor: game.awayTeam.primaryColor }}
              >
                {game.awayTeam.abbreviation}
              </div>
              <div>
                <p className="font-semibold text-white">{game.awayTeam.city}</p>
                <p className="text-xs text-slate-400">{game.awayTeam.record}</p>
              </div>
            </div>
            <div className="text-right">
              <p className={`text-lg font-bold ${
                predictedWinner === 'away' ? 'text-emerald-400' : 'text-slate-300'
              }`}>
                {game.awayWinProbability}%
              </p>
            </div>
          </div>

          {/* VS Divider */}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-slate-700" />
            <span className="text-xs text-slate-500 font-medium">VS</span>
            <div className="flex-1 h-px bg-slate-700" />
          </div>

          {/* Home Team */}
          <div className={`flex items-center justify-between p-2 rounded-lg transition-colors ${
            predictedWinner === 'home' ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-slate-800/50'
          }`}>
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white text-sm"
                style={{ backgroundColor: game.homeTeam.primaryColor }}
              >
                {game.homeTeam.abbreviation}
              </div>
              <div>
                <p className="font-semibold text-white">{game.homeTeam.city}</p>
                <p className="text-xs text-slate-400">{game.homeTeam.record}</p>
              </div>
            </div>
            <div className="text-right">
              <p className={`text-lg font-bold ${
                predictedWinner === 'home' ? 'text-emerald-400' : 'text-slate-300'
              }`}>
                {game.homeWinProbability}%
              </p>
            </div>
          </div>
        </div>

        {/* Win Probability Bar */}
        <div className="mt-4">
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden flex">
            <div
              className="h-full transition-all duration-500"
              style={{
                width: `${game.awayWinProbability}%`,
                backgroundColor: game.awayTeam.primaryColor,
              }}
            />
            <div
              className="h-full transition-all duration-500"
              style={{
                width: `${game.homeWinProbability}%`,
                backgroundColor: game.homeTeam.primaryColor,
              }}
            />
          </div>
        </div>

        {/* Game Info */}
        <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
          <span>{game.gameTime}</span>
          <div className="flex items-center gap-1">
            <span>Spread: {game.spread > 0 ? '+' : ''}{game.spread}</span>
            <span className="mx-1">|</span>
            <span>O/U: {game.overUnder}</span>
          </div>
        </div>

        {/* View Details */}
        <div className="mt-3 flex items-center justify-center gap-1 text-cyan-400 text-sm font-medium group">
          <span>View Analysis</span>
          <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>

      {/* Predicted Winner Badge */}
      {predictedWinner && (
        <div className="absolute top-3 right-3">
          <div className="bg-emerald-500 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            AI Pick
          </div>
        </div>
      )}
    </div>
  );
};

export default GameCard;
