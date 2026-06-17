import React from 'react';
import { CompetitionGame } from '@/competition/types';
import {
  weeklyNet, clarkDifferential, biggestCorrectStake, pickForEntity, resolvePick,
} from '@/competition/scoring';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface WeeklyRecapCardProps {
  /** 'you' = your week vs the Index. 'crowd' = the crowd vs the Index (no user input needed). */
  variant: 'you' | 'crowd';
  /** Settled games through the recap week. */
  games: CompetitionGame[];
  week: number;
  weekLabel: string;
  /** Rank change this week (+up / −down). Mock for this pass. */
  rankDelta?: number;
}

function signed(n: number): string {
  return `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(Math.round(n))}`;
}

/**
 * A compact, brand-styled recap built to read like something exportable to an
 * image later. Two variants share one layout: the user's week vs the Index, and
 * the crowd's week vs the Index.
 */
const WeeklyRecapCard: React.FC<WeeklyRecapCardProps> = ({
  variant, games, week, weekLabel, rankDelta = 0,
}) => {
  const entity = variant;
  const weekGames = games.filter(g => g.week === week);

  const net = weeklyNet(weekGames, entity);
  const differential = clarkDifferential(games, entity);
  const biggest = biggestCorrectStake(weekGames, entity);

  // Identify the matchup behind the biggest correct stake for a human highlight.
  const biggestGame = weekGames
    .filter(g => resolvePick(pickForEntity(g, entity), g.actualWinner) === biggest && biggest > 0)
    .map(g => pickForEntity(g, entity).team)[0];

  const beatIndex = differential > 0;
  const title = variant === 'you' ? 'Your week' : 'The Crowd';
  const netColor = net > 0 ? 'var(--stake-positive)' : net < 0 ? 'var(--stake-negative)' : 'var(--text-tertiary)';

  return (
    <article
      className="rounded-xl overflow-hidden flex flex-col"
      style={{
        width: '320px',
        background: 'var(--surface)',
        border: '1px solid var(--border-emphasis)',
      }}
      aria-label={`${title} recap for ${weekLabel}`}
    >
      {/* Brand bar */}
      <div className="px-5 pt-4 pb-3 flex items-center justify-between"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="flex items-baseline gap-1.5">
          <span className="font-bold leading-none" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
            Clark
          </span>
          <span className="italic leading-none" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-tertiary)' }}>
            Competition
          </span>
        </div>
        <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
          {weekLabel}
        </span>
      </div>

      {/* Hero net */}
      <div className="px-5 pt-5 pb-4">
        <div className="text-[10px] uppercase tracking-[0.2em] mb-1" style={{ color: 'var(--text-muted)' }}>
          {title} · net credits
        </div>
        <div className="font-bold leading-none tabular-nums"
          style={{ fontFamily: 'var(--font-display)', fontSize: '3.5rem', color: netColor }}>
          {signed(net)}
        </div>
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-2 gap-px mt-1"
        style={{ background: 'var(--border-subtle)' }}>
        <Stat label="Season vs Index" value={signed(differential)}
          valueColor={beatIndex ? 'var(--stake-positive)' : differential < 0 ? 'var(--stake-negative)' : 'var(--text-tertiary)'} />
        <Stat
          label="Rank movement"
          value={
            <span className="inline-flex items-center gap-1">
              {rankDelta > 0 ? <TrendingUp className="w-4 h-4" style={{ color: 'var(--stake-positive)' }} />
                : rankDelta < 0 ? <TrendingDown className="w-4 h-4" style={{ color: 'var(--stake-negative)' }} />
                : <Minus className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />}
              {rankDelta !== 0 ? Math.abs(rankDelta) : '—'}
            </span>
          }
          valueColor="var(--text-primary)"
        />
      </div>

      {/* Highlight */}
      <div className="px-5 py-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        <div className="text-[10px] uppercase tracking-widest mb-1" style={{ color: 'var(--accent-gold)' }}>
          Biggest correct stake
        </div>
        {biggest > 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            <span className="font-bold tabular-nums" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
              +{Math.round(biggest)}
            </span>{' '}
            on <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{biggestGame}</span> paying off.
          </p>
        ) : (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No winning stake this week.</p>
        )}
      </div>
    </article>
  );
};

const Stat: React.FC<{ label: string; value: React.ReactNode; valueColor: string }> = ({ label, value, valueColor }) => (
  <div className="px-5 py-3" style={{ background: 'var(--surface)' }}>
    <div className="text-[10px] uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>{label}</div>
    <div className="font-bold tabular-nums leading-none"
      style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: valueColor }}>
      {value}
    </div>
  </div>
);

export default WeeklyRecapCard;
