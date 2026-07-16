import React from 'react';
import { useNavigate } from 'react-router-dom';
import { StoryModule } from '@/lib/storyModules';
import { getTeamColors } from '@/data/nflData';

interface StoryModulesProps {
  modules: StoryModule[];
}

/** Provisional fan-support sparkline (matches BeliefTracker's shape). */
const MiniSpark: React.FC<{ points: { pct: number }[]; color: string }> = ({ points, color }) => {
  const w = 100;
  const h = 20;
  const line = points
    .map((p, i) => `${((i / (points.length - 1)) * w).toFixed(1)},${(h - p.pct * h).toFixed(1)}`)
    .join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="w-full h-5" aria-hidden="true">
      <polyline points={line} fill="none" stroke={color} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
    </svg>
  );
};

const StoryCard: React.FC<{ module: StoryModule }> = ({ module }) => {
  const navigate = useNavigate();
  const colors = getTeamColors(module.accentTeam);
  const { game } = module;

  return (
    <button
      type="button"
      onClick={() => navigate(`/game/${game.season}/${game.week}/${game.away_team}/${game.home_team}`)}
      className="w-full text-left rounded-lg p-4 flex flex-col gap-2 transition-transform duration-150 hover:-translate-y-0.5"
      style={{ background: 'var(--surface)', border: '1px solid var(--border-subtle)', borderLeft: `3px solid ${colors.primary}` }}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--accent-gold)' }}>
          {module.kicker}
        </span>
        {module.provisional && (
          <span className="text-[9px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }} title="Illustrative — real community picks are coming">
            †
          </span>
        )}
      </div>

      <p className="leading-snug" style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', color: 'var(--text-primary)' }}>
        {module.headline}
      </p>

      {module.sparkline && <MiniSpark points={module.sparkline} color={colors.primary} />}

      <div className="flex items-baseline justify-between mt-auto pt-1">
        <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
          {module.statLabel}
        </span>
        <span className="text-sm font-semibold tabular-nums" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
          {module.statValue}
        </span>
      </div>
    </button>
  );
};

/**
 * The compact editorial modules beside The Signal — support swinging, the
 * boldest public call, the most divided fanbase. Team-colored, one conclusion
 * each, all tapping into the same week's data.
 */
const StoryModules: React.FC<StoryModulesProps> = ({ modules }) => {
  if (modules.length === 0) return null;
  return (
    <div className="flex flex-col gap-4 h-full">
      {modules.map((m) => (
        <StoryCard key={m.id} module={m} />
      ))}
    </div>
  );
};

export default StoryModules;
