import React from 'react';
import { FactorCard } from '@/types/prediction';
import { getTeamColors } from '@/data/nflData';
import ChallengeFactor from '@/components/competition/ChallengeFactor';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  DECISIVE: { label: 'Key edge',  color: 'var(--status-decisive)' },
  MODERATE: { label: 'Notable',   color: 'var(--status-moderate)' },
  MINOR:    { label: 'Slight',    color: 'var(--status-minor)' },
  NEUTRAL:  { label: 'Even',      color: 'var(--status-neutral)' },
};

interface FactorRowProps {
  factor: FactorCard;
  rank: number;
  gameId?: string;
}

const FactorRow: React.FC<FactorRowProps> = ({ factor, rank, gameId }) => {
  const isEven     = factor.advantage_team === 'Even';
  const teamColors = isEven ? null : getTeamColors(factor.advantage_team);
  const accentColor = teamColors?.primary ?? '#475569';
  const labelColor  = teamColors?.secondary ?? '#94a3b8';
  const fillPct     = Math.round(factor.contribution_strength * 100);
  const statusCfg   = STATUS_CONFIG[factor.status] ?? STATUS_CONFIG.NEUTRAL;
  const displayText = factor.explanation || '';

  return (
    <article
      className="rounded-lg overflow-hidden"
      style={{ border: '1px solid var(--border-default)', background: 'var(--surface)' }}
    >
      {/* Header: rank · name · team badge */}
      <div className="flex items-center justify-between gap-3 px-4 pt-3.5 pb-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className="text-[11px] font-mono shrink-0 w-4 text-right tabular-nums"
            style={{ color: 'var(--text-muted)' }}
          >
            {rank}
          </span>
          <span
            className="font-semibold text-sm truncate"
            style={{ color: 'var(--text-primary)' }}
          >
            {factor.name}
          </span>
        </div>
        {!isEven && (
          <span
            className="shrink-0 text-[11px] font-bold px-2 py-0.5 rounded"
            style={{
              background: `${accentColor}1a`,
              color: labelColor,
              border: `1px solid ${accentColor}28`,
            }}
          >
            {factor.advantage_team}
          </span>
        )}
      </div>

      {/* Contribution bar + status label */}
      <div className="px-4 pb-3">
        <div className="flex items-center gap-3">
          <div
            className="flex-1 h-1 rounded-full overflow-hidden"
            style={{ background: 'var(--surface-overlay)' }}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${fillPct}%`,
                backgroundColor: accentColor,
                transition: `width 400ms var(--ease-out)`,
              }}
            />
          </div>
          <span
            className="text-[11px] shrink-0 font-medium tabular-nums"
            style={{ color: statusCfg.color }}
          >
            {statusCfg.label}
          </span>
        </div>
      </div>

      {/* Headline + full explanation — inline, expanded by default.
          This is the core reasoning; it must never hide behind a second
          dropdown (see CLARK_REPORT_AND_VIRALITY_PLAN.md, B1). */}
      {displayText && (
        <div className="px-4 pb-4">
          {factor.headline && (
            <p
              className="text-sm font-semibold mb-1"
              style={{ color: 'var(--text-primary)' }}
            >
              {factor.headline}
            </p>
          )}
          <p
            className="text-sm leading-relaxed"
            style={{ color: 'var(--text-secondary)' }}
          >
            {displayText}
          </p>
        </div>
      )}

      {/* Community challenge thread — the only thing that stays collapsed;
          secondary to the reasoning above, never competes with it. */}
      {gameId && <ChallengeFactor gameId={gameId} factorName={factor.name} />}
    </article>
  );
};

interface FactorListProps {
  factors: FactorCard[];
  gameId?: string;
}

const FactorList: React.FC<FactorListProps> = ({ factors, gameId }) => {
  const sorted = [...factors].sort((a, b) => b.contribution_strength - a.contribution_strength);

  return (
    <section aria-label="Factors to victory">
      <h3
        className="text-[11px] font-semibold uppercase tracking-widest mb-3"
        style={{ color: 'var(--text-muted)' }}
      >
        Factors to victory
      </h3>
      <div className="flex flex-col gap-2">
        {sorted.map((factor, i) => (
          <FactorRow key={factor.name} factor={factor} rank={i + 1} gameId={gameId} />
        ))}
      </div>
    </section>
  );
};

export default FactorList;
