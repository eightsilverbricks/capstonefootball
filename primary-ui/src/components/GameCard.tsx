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

const GameCard: React.FC<GameCardProps> = ({ game, onClick, isSelected = false }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/game/${game.season}/${game.week}/${game.away_team}/${game.home_team}`);
    onClick?.();
  };

  const homeColors = getTeamColors(game.home_team);
  const awayColors = getTeamColors(game.away_team);
  const isHome     = game.predicted_winner === game.home_team;
  const winColors  = isHome ? homeColors : awayColors;
  const winProb    = Math.round(getPredictedProbability(game) * 100);
  const awayPct    = (game.away_win_prob * 100).toFixed(0);
  const homePct    = (game.home_win_prob * 100).toFixed(0);
  const conf       = game.confidence_label ?? 'Medium';

  const topFactor = game.factor_cards?.[0];
  const headline  = topFactor?.reason ?? null;

  return (
    <article
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label={`${game.away_team} at ${game.home_team} — open Clark Report`}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick(); } }}
      className="relative rounded overflow-hidden cursor-pointer transition-transform duration-150 hover:-translate-y-0.5 group"
      style={{
        background: 'var(--surface)',
        border: `1px solid ${isSelected ? 'var(--border-emphasis)' : 'var(--border-subtle)'}`,
      }}
    >
      <div className="h-0.5 w-full" style={{ background: winColors.primary }} />

      <div className="p-5 flex flex-col gap-4">

        <div className="flex items-baseline justify-between">
          <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            {game.week_label ?? `Week ${game.week}`}
          </span>
          <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>
            {conf} confidence
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <TeamLogo abbr={game.away_team} size="sm" />
            <p
              className="font-bold leading-none truncate"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.5rem',
                color: !isHome ? 'var(--text-primary)' : 'var(--text-tertiary)',
              }}
            >
              {game.away_team}
            </p>
          </div>

          <span className="text-[10px] uppercase tracking-widest shrink-0" style={{ color: 'var(--text-muted)' }}>
            at
          </span>

          <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
            <p
              className="font-bold leading-none truncate text-right"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.5rem',
                color: isHome ? 'var(--text-primary)' : 'var(--text-tertiary)',
              }}
            >
              {game.home_team}
            </p>
            <TeamLogo abbr={game.home_team} size="sm" />
          </div>
        </div>

        <div className="flex items-baseline justify-between">
          <span
            className="font-bold leading-none tabular-nums"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '3rem',
              color: winColors.secondary || winColors.primary || 'var(--text-primary)',
            }}
          >
            {winProb}
            <span className="text-xl align-super" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-data)', fontWeight: 400 }}>
              %
            </span>
          </span>
          <span className="text-xs uppercase tracking-widest text-right leading-tight" style={{ color: 'var(--text-tertiary)' }}>
            {game.predicted_winner}<br />favored
          </span>
        </div>

        <div
          className="h-0.5 overflow-hidden flex"
          style={{ background: 'var(--surface-raised)' }}
          role="img"
          aria-label={`${game.away_team} ${awayPct}%, ${game.home_team} ${homePct}%`}
        >
          <div style={{ width: `${awayPct}%`, background: awayColors.primary, opacity: !isHome ? 1 : 0.3, transition: 'width 400ms' }} />
          <div style={{ width: `${homePct}%`, background: homeColors.primary, opacity: isHome ? 1 : 0.3, transition: 'width 400ms' }} />
        </div>

        {headline && (
          <p className="text-xs leading-snug line-clamp-2" style={{ color: 'var(--text-tertiary)' }}>
            <span className="uppercase tracking-widest text-[10px] mr-2" style={{ color: 'var(--accent-gold)' }}>
              {topFactor?.name ?? 'Key factor'}
            </span>
            {headline}
          </p>
        )}

        <div className="flex items-center justify-end pt-1">
          <span className="text-[10px] uppercase tracking-widest transition-colors"
            style={{ color: 'var(--text-muted)' }}>
            Read report →
          </span>
        </div>

      </div>
    </article>
  );
};

export default GameCard;
