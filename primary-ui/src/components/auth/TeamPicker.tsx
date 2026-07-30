import React from 'react';
import { Check } from 'lucide-react';
import TeamLogo from '@/components/TeamLogo';
import { NFL_TEAM_COLORS, getTeamColors } from '@/data/nflData';

const TEAMS = Object.keys(NFL_TEAM_COLORS).sort();

interface TeamPickerProps {
  value: string | null;
  onChange: (team: string | null) => void;
  /** Accessible name for the group. */
  label?: string;
}

/**
 * A visual favorite-team picker — 32 logos on a scrollable grid, selected tile
 * ringed in that team's own color. Deliberately not a <select>: picking your
 * team is the fun part of signing up, and a dropdown of abbreviations isn't.
 *
 * Implemented as a radio group so keyboard and screen-reader users get real
 * single-select semantics.
 */
const TeamPicker: React.FC<TeamPickerProps> = ({ value, onChange, label = 'Your team' }) => (
  <div role="radiogroup" aria-label={label}>
    <div
      className="grid grid-cols-6 sm:grid-cols-8 gap-1.5 max-h-[9.5rem] overflow-y-auto p-2 rounded-lg"
      style={{ background: 'var(--bg)', border: '1px solid var(--border-subtle)' }}
    >
      {TEAMS.map((abbr) => {
        const selected = value === abbr;
        const colors = getTeamColors(abbr);
        return (
          <button
            key={abbr}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={abbr}
            onClick={() => onChange(selected ? null : abbr)}
            className="relative flex items-center justify-center aspect-square rounded-md transition-transform duration-150 hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
            style={{
              background: selected ? `${colors.primary}33` : 'transparent',
              boxShadow: selected ? `inset 0 0 0 1.5px ${colors.secondary}` : 'none',
              opacity: selected || !value ? 1 : 0.5,
            }}
          >
            <TeamLogo abbr={abbr} size="sm" className="!w-7 !h-7" />
            {selected && (
              <Check
                className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full p-[1px]"
                style={{ background: colors.secondary, color: '#111' }}
                aria-hidden="true"
              />
            )}
          </button>
        );
      })}
    </div>
    <p className="text-[11px] mt-1.5" style={{ color: 'var(--text-muted)' }}>
      {value
        ? `Locked in — your ${value} games get flagged all season.`
        : 'Optional. Pick one and we’ll highlight their games for you.'}
    </p>
  </div>
);

export default TeamPicker;
