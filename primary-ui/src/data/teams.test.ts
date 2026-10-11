import { describe, expect, it } from 'vitest';
import { TEAMS, getTeam, groupByDivision, teamFullName } from './teams';
import { NFL_TEAM_COLORS } from './nflData';

describe('teams', () => {
  it('has 32 unique teams, each with colors', () => {
    expect(new Set(TEAMS.map((t) => t.abbr)).size).toBe(32);
    TEAMS.forEach((t) => expect(NFL_TEAM_COLORS[t.abbr]).toBeDefined());
  });

  it('groups into eight divisions of four', () => {
    const groups = groupByDivision();
    expect(groups).toHaveLength(8);
    groups.forEach((g) => expect(g.teams).toHaveLength(4));
    expect(groups[0].label).toBe('AFC East');
  });

  it('looks up case-insensitively and names unknowns by abbreviation', () => {
    expect(getTeam('sea')?.name).toBe('Seahawks');
    expect(teamFullName('BUF')).toBe('Buffalo Bills');
    expect(teamFullName('XYZ')).toBe('XYZ');
  });
});
