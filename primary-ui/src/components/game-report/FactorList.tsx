import React from 'react';
import { FactorCard } from '@/types/prediction';
import { getTeamColors } from '@/data/nflData';

/** Reader-facing names for the model's factor buckets. */
const FACTOR_LABELS: Record<string, string> = {
  'Home Field': 'Home field',
  'Market Edge': 'Betting line',
  'Recent Offense': 'Offense',
  'Defensive Edge': 'Defense',
  'Momentum': 'Recent form',
  'Game Context': 'Rest and setting',
};

export function factorLabel(name: string): string {
  return FACTOR_LABELS[name] ?? name;
}

const FactorRow: React.FC<{ factor: FactorCard }> = ({ factor }) => {
  const color = getTeamColors(factor.advantage_team).primary;
  const fillPct = Math.max(4, Math.round(factor.contribution_strength * 100));

  return (
    <li className="py-3 first:pt-0 last:pb-0" style={{ borderTop: '1px solid var(--border-subtle)' }}>
      <div className="flex items-center gap-3 mb-1.5">
        <span className="text-xs w-28 shrink-0" style={{ color: 'var(--text-muted)' }}>
          {factorLabel(factor.name)}
        </span>
        <span
          className="flex-1 h-1 rounded-full overflow-hidden"
          style={{ background: 'var(--surface-overlay)' }}
          aria-hidden="true"
        >
          <span className="block h-full rounded-full" style={{ width: `${fillPct}%`, background: color }} />
        </span>
      </div>
      {factor.headline && (
        <p className="text-sm font-semibold mb-0.5" style={{ color: 'var(--text-primary)' }}>
          {factor.headline}
        </p>
      )}
      {factor.explanation && (
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {factor.explanation}
        </p>
      )}
    </li>
  );
};

const FactorGroup: React.FC<{ title: string; factors: FactorCard[] }> = ({ title, factors }) => (
  <section>
    <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>{title}</h3>
    <ul className="flex flex-col">
      {factors.map((f) => <FactorRow key={f.name} factor={f} />)}
    </ul>
  </section>
);

interface FactorListProps {
  factors: FactorCard[];
  winner: string;
  loser: string;
}

/**
 * The factors split by which team they help, so the report can never look
 * like it argues against its own pick. Hedged reads ("about even") are listed
 * by headline only; every raw number lives in one drawer at the bottom.
 */
const FactorList: React.FC<FactorListProps> = ({ factors, winner, loser }) => {
  const byStrength = [...factors].sort((a, b) => b.contribution_strength - a.contribution_strength);
  const isClaim = (f: FactorCard) => f.confident !== false;
  const forWinner = byStrength.filter((f) => isClaim(f) && f.advantage_team === winner);
  const forLoser = byStrength.filter((f) => isClaim(f) && f.advantage_team === loser);
  const even = byStrength.filter((f) => !forWinner.includes(f) && !forLoser.includes(f));
  const numbers = byStrength.filter((f) => f.baseline_note);

  return (
    <div className="flex flex-col gap-6">
      {forWinner.length > 0 && <FactorGroup title={`Why Clark picks ${winner}`} factors={forWinner} />}
      {forLoser.length > 0 && <FactorGroup title={`What favors ${loser}`} factors={forLoser} />}

      {even.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>About even</h3>
          <ul className="flex flex-col gap-1">
            {even.map((f) => (
              <li key={f.name} className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                <span style={{ color: 'var(--text-muted)' }}>{factorLabel(f.name)}:</span> {f.headline}
              </li>
            ))}
          </ul>
        </section>
      )}

      {numbers.length > 0 && (
        <details className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          <summary className="cursor-pointer select-none" style={{ color: 'var(--text-tertiary)' }}>
            Show the numbers
          </summary>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
            {numbers.map((f) => (
              <React.Fragment key={f.name}>
                <dt style={{ color: 'var(--text-muted)' }}>{factorLabel(f.name)}</dt>
                <dd className="tabular-nums">{f.baseline_note}</dd>
              </React.Fragment>
            ))}
          </dl>
        </details>
      )}
    </div>
  );
};

export default FactorList;
