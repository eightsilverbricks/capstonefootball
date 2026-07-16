import React from 'react';
import { useFanIdentity } from '@/hooks/useFanIdentity';
import { NFL_TEAM_COLORS } from '@/data/nflData';

const TEAMS = Object.keys(NFL_TEAM_COLORS).sort();

/**
 * Lightweight, skippable favorite-team picker — scaffolding for future
 * fanbase-level insights (see useFanIdentity.ts). Device-local only.
 */
const FanIdentityPicker: React.FC = () => {
  const { team, setTeam } = useFanIdentity();

  return (
    <select
      value={team ?? ''}
      onChange={(e) => {
        if (e.target.value) setTeam(e.target.value);
      }}
      aria-label="Choose your favorite team"
      className="text-xs bg-transparent rounded px-2 py-1 outline-none cursor-pointer"
      style={{
        color: team ? 'var(--text-primary)' : 'var(--text-muted)',
        border: '1px solid var(--border-default)',
      }}
    >
      <option value="" disabled style={{ color: 'var(--text-muted)' }}>
        Pick your team
      </option>
      {TEAMS.map((abbr) => (
        <option key={abbr} value={abbr} style={{ color: '#000' }}>
          {abbr}
        </option>
      ))}
    </select>
  );
};

export default FanIdentityPicker;
