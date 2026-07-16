import React from 'react';
import { FanbaseStanding } from '@/lib/threeWaySignal';
import { getTeamColors } from '@/data/nflData';
import { signed, stakeColor } from '@/lib/format';

interface FanbaseStandingsProps {
  standings: FanbaseStanding[];
  userTeam: string | null;
}

/** One ranked fanbase row. */
const Row: React.FC<{ rank: number; s: FanbaseStanding; highlight: boolean }> = ({ rank, s, highlight }) => {
  const colors = getTeamColors(s.team);
  return (
    <div
      className="flex items-center gap-3 py-2 px-3 rounded"
      style={{ background: highlight ? 'var(--surface-raised)' : 'transparent', border: highlight ? '1px solid var(--border-emphasis)' : '1px solid transparent' }}
    >
      <span className="text-xs tabular-nums w-5 text-right" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
        {rank}
      </span>
      <span className="w-1 h-4 rounded-full" style={{ background: colors.primary }} />
      <span className="font-semibold flex-1" style={{ color: 'var(--text-primary)' }}>
        {s.team}
        {highlight && <span className="ml-2 text-[9px] uppercase tracking-widest" style={{ color: 'var(--accent-gold)' }}>your team</span>}
      </span>
      <span className="text-xs tabular-nums" style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
        {s.correct}/{s.games}
      </span>
      <span className="text-sm font-semibold tabular-nums w-14 text-right" style={{ color: stakeColor(s.net), fontFamily: 'var(--font-mono)' }}>
        {signed(s.net)}
      </span>
    </div>
  );
};

/**
 * PROVISIONAL fanbase leaderboard — top believers plus your own team, so the
 * ranking always has a personal anchor. Clearly labeled as illustrative.
 */
const FanbaseStandings: React.FC<FanbaseStandingsProps> = ({ standings, userTeam }) => {
  const top = standings.slice(0, 5);
  const userIndex = standings.findIndex((s) => s.team === userTeam);
  const userInTop = userIndex > -1 && userIndex < 5;
  const userRow = userIndex > -1 && !userInTop ? standings[userIndex] : null;

  return (
    <div className="rounded p-6" style={{ background: 'var(--surface)', border: '1px solid var(--border-subtle)' }}>
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="text-xs uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
          Fanbase belief · 2024
        </h2>
        <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }} title="Illustrative — real community picks are coming">
          provisional †
        </span>
      </div>
      <div className="flex flex-col gap-0.5">
        {top.map((s, i) => (
          <Row key={s.team} rank={i + 1} s={s} highlight={s.team === userTeam} />
        ))}
        {userRow && (
          <>
            <div className="text-center text-[10px] py-1" style={{ color: 'var(--text-muted)' }}>···</div>
            <Row rank={userIndex + 1} s={userRow} highlight />
          </>
        )}
      </div>
    </div>
  );
};

export default FanbaseStandings;
