import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiPrediction, getPredictedProbability } from '@/types/prediction';
import { getTeamColors } from '@/data/nflData';
import TeamLogo from './TeamLogo';

interface GameCardProps {
  game: ApiPrediction;
  onClick?: () => void;
  isSelected?: boolean;
}

const CONF_COLORS: Record<string, string> = {
  High:   '#4ade80',
  Medium: '#fbbf24',
  Low:    '#94a3b8',
};

const GameCard: React.FC<GameCardProps> = ({ game, onClick, isSelected = false }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/game/${game.season}/${game.week}/${game.away_team}/${game.home_team}`);
    onClick?.();
  };

  const homeColors = getTeamColors(game.home_team);
  const awayColors = getTeamColors(game.away_team);
  const isHome     = game.predicted_winner === game.home_team;
  const winProb    = (getPredictedProbability(game) * 100).toFixed(0);
  const awayPct    = (game.away_win_prob * 100).toFixed(0);
  const homePct    = (game.home_win_prob * 100).toFixed(0);
  const conf       = game.confidence_label ?? 'Medium';
  const confColor  = CONF_COLORS[conf] ?? CONF_COLORS.Medium;

  // Top-factor editorial headline from model output
  const topFactor = game.factor_cards?.[0];
  const headline  = topFactor?.reason ?? null;

  return (
    <article
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label={`${game.away_team} at ${game.home_team} — open Clark Report`}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick(); } }}
      className="relative rounded-lg overflow-hidden cursor-pointer transition-transform duration-150 hover:-translate-y-0.5"
      style={{
        background: 'var(--surface)',
        border: `1px solid ${isSelected ? 'var(--border-emphasis)' : 'var(--border-subtle)'}`,
      }}
    >
      {/* Single-team accent stripe — winner color, no gradient */}
      <div
        className="h-0.5 w-full"
        style={{ background: isHome ? homeColors.primary : awayColors.primary }}
      />

      <div className="p-4 flex flex-col gap-3">

        {/* Header: week + confidence */}
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {game.week_label ?? `Week ${game.week}`}
          </span>
          <span
            className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded"
            style={{
              color: confColor,
              background: `${confColor}18`,
              border: `1px solid ${confColor}30`,
            }}
          >
            {conf}
          </span>
        </div>

        {/* Teams: away · vs · home */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <TeamLogo abbr={game.away_team} size="sm" />
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate"
                style={{ color: !isHome ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
                {game.away_team}
              </p>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Away · {awayPct}%</p>
            </div>
          </div>

          <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>vs</span>

          <div className="flex items-center gap-2 flex-1 min-w-0 justify-end text-right">
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate"
                style={{ color: isHome ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
                {game.home_team}
              </p>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Home · {homePct}%</p>
            </div>
            <TeamLogo abbr={game.home_team} size="sm" />
          </div>
        </div>

        {/* Split probability bar — solid team colors, no gradient */}
        <div
          className="h-1 rounded-full overflow-hidden flex"
          style={{ background: 'var(--surface-raised)' }}
          role="img"
          aria-label={`${game.away_team} ${awayPct}%, ${game.home_team} ${homePct}%`}
        >
          <div style={{ width: `${awayPct}%`, background: awayColors.primary, opacity: !isHome ? 1 : 0.3, transition: 'width 400ms' }} />
          <div style={{ width: `${homePct}%`, background: homeColors.primary, opacity: isHome ? 1 : 0.3, transition: 'width 400ms' }} />
        </div>

        {/* Top-factor editorial line */}
        {headline && (
          <p className="text-[11px] leading-snug line-clamp-2" style={{ color: 'var(--text-tertiary)' }}>
            <span style={{ color: 'var(--accent-gold)', marginRight: '0.3rem' }}>
              {topFactor?.name ?? 'Key factor'}:
            </span>
            {headline}
          </p>
        )}

        {/* Footer: winner + report link */}
        <div className="flex items-center justify-between pt-0.5">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ background: isHome ? homeColors.primary : awayColors.primary }} />
            <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
              {game.predicted_winner}
            </span>
            <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{winProb}%</span>
          </div>
          <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            Report →
          </span>
        </div>

      </div>
    </article>
  );
};

export default GameCard;
