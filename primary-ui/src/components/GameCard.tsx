import React from 'react';
import { ApiPrediction, getPredictedProbability } from '@/types/prediction';
import { getTeamColors } from '@/data/nflData';
import TeamLogo from './TeamLogo';
import { ChevronRight } from 'lucide-react';

interface GameCardProps {
  game: ApiPrediction;
  onClick: () => void;
  isSelected?: boolean;
}

const CONFIDENCE_STYLES = {
  High:   { dot: '#4ade80', label: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  Medium: { dot: '#fbbf24', label: 'text-amber-400',   bg: 'bg-amber-400/10' },
  Low:    { dot: '#94a3b8', label: 'text-slate-400',   bg: 'bg-slate-400/10' },
};

const GameCard: React.FC<GameCardProps> = ({ game, onClick, isSelected }) => {
  const homeColors = getTeamColors(game.home_team);
  const awayColors = getTeamColors(game.away_team);
  const winnerProb = (getPredictedProbability(game) * 100).toFixed(0);
  const isHome = game.predicted_winner === game.home_team;
  const winnerColors = isHome ? homeColors : awayColors;
  const conf = game.confidence_label ?? 'Medium';
  const confStyle = CONFIDENCE_STYLES[conf] ?? CONFIDENCE_STYLES.Medium;
  const awayPct = (game.away_win_prob * 100).toFixed(0);
  const homePct = (game.home_win_prob * 100).toFixed(0);

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
      className={`relative rounded-xl overflow-hidden cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl border ${
        isSelected ? 'border-white/30' : 'border-white/8'
      }`}
      style={{
        background: '#111118',
        boxShadow: isSelected ? `0 0 0 1px ${winnerColors.primary}60, 0 8px 32px ${winnerColors.primary}20` : undefined,
      }}
    >
      {/* Team color band at top */}
      <div
        className="h-1 w-full"
        style={{
          background: `linear-gradient(90deg, ${awayColors.primary} 0%, ${awayColors.primary} 50%, ${homeColors.primary} 50%, ${homeColors.primary} 100%)`,
        }}
      />

      <div className="p-4">
        {/* Week label */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs text-white/30">{game.week_label ?? `Week ${game.week}`}</span>
          <div className={`flex items-center gap-1.5 text-xs font-medium ${confStyle.label} ${confStyle.bg} px-2 py-0.5 rounded-full`}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: confStyle.dot }} />
            {conf}
          </div>
        </div>

        {/* Teams */}
        <div className="space-y-2.5 mb-4">
          {/* Away */}
          <div className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
            !isHome ? 'bg-white/8 border border-white/15' : 'bg-white/[0.03]'
          }`}>
            <div className="flex items-center gap-3">
              <TeamLogo abbr={game.away_team} size="sm" />
              <div>
                <p className="font-semibold text-white text-sm">{game.away_team}</p>
                <p className="text-xs text-white/30">Away</p>
              </div>
            </div>
            <p className={`font-bold text-base ${!isHome ? 'text-white' : 'text-white/40'}`}>
              {awayPct}%
            </p>
          </div>

          {/* Home */}
          <div className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
            isHome ? 'bg-white/8 border border-white/15' : 'bg-white/[0.03]'
          }`}>
            <div className="flex items-center gap-3">
              <TeamLogo abbr={game.home_team} size="sm" />
              <div>
                <p className="font-semibold text-white text-sm">{game.home_team}</p>
                <p className="text-xs text-white/30">Home</p>
              </div>
            </div>
            <p className={`font-bold text-base ${isHome ? 'text-white' : 'text-white/40'}`}>
              {homePct}%
            </p>
          </div>
        </div>

        {/* Probability bar */}
        <div className="h-1.5 rounded-full overflow-hidden flex mb-4">
          <div
            className="h-full transition-all duration-500"
            style={{ width: `${awayPct}%`, backgroundColor: awayColors.primary, opacity: !isHome ? 1 : 0.3 }}
          />
          <div
            className="h-full transition-all duration-500"
            style={{ width: `${homePct}%`, backgroundColor: homeColors.primary, opacity: isHome ? 1 : 0.3 }}
          />
        </div>

        {/* Bottom: winner + CTA */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: winnerColors.secondary || winnerColors.primary }} />
            <span className="text-sm font-semibold" style={{ color: winnerColors.secondary || '#ffffff' }}>
              {game.predicted_winner}
            </span>
            <span className="text-xs text-white/30">{winnerProb}%</span>
          </div>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            className="flex items-center gap-1 text-xs text-white/40 hover:text-white/80 group transition-colors"
          >
            Clark Report
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameCard;
