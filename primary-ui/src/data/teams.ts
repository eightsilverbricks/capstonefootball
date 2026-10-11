/**
 * The 32 teams with the names and divisions every team-facing page needs.
 * Abbreviations match the predictions feed (nflverse style: LA = Rams).
 */
export type Conference = 'AFC' | 'NFC';
export type Division = 'East' | 'North' | 'South' | 'West';

export interface TeamInfo {
  abbr: string;
  city: string;
  name: string;
  conference: Conference;
  division: Division;
}

export const TEAMS: readonly TeamInfo[] = [
  { abbr: 'BUF', city: 'Buffalo', name: 'Bills', conference: 'AFC', division: 'East' },
  { abbr: 'MIA', city: 'Miami', name: 'Dolphins', conference: 'AFC', division: 'East' },
  { abbr: 'NE', city: 'New England', name: 'Patriots', conference: 'AFC', division: 'East' },
  { abbr: 'NYJ', city: 'New York', name: 'Jets', conference: 'AFC', division: 'East' },
  { abbr: 'BAL', city: 'Baltimore', name: 'Ravens', conference: 'AFC', division: 'North' },
  { abbr: 'CIN', city: 'Cincinnati', name: 'Bengals', conference: 'AFC', division: 'North' },
  { abbr: 'CLE', city: 'Cleveland', name: 'Browns', conference: 'AFC', division: 'North' },
  { abbr: 'PIT', city: 'Pittsburgh', name: 'Steelers', conference: 'AFC', division: 'North' },
  { abbr: 'HOU', city: 'Houston', name: 'Texans', conference: 'AFC', division: 'South' },
  { abbr: 'IND', city: 'Indianapolis', name: 'Colts', conference: 'AFC', division: 'South' },
  { abbr: 'JAX', city: 'Jacksonville', name: 'Jaguars', conference: 'AFC', division: 'South' },
  { abbr: 'TEN', city: 'Tennessee', name: 'Titans', conference: 'AFC', division: 'South' },
  { abbr: 'DEN', city: 'Denver', name: 'Broncos', conference: 'AFC', division: 'West' },
  { abbr: 'KC', city: 'Kansas City', name: 'Chiefs', conference: 'AFC', division: 'West' },
  { abbr: 'LV', city: 'Las Vegas', name: 'Raiders', conference: 'AFC', division: 'West' },
  { abbr: 'LAC', city: 'Los Angeles', name: 'Chargers', conference: 'AFC', division: 'West' },
  { abbr: 'DAL', city: 'Dallas', name: 'Cowboys', conference: 'NFC', division: 'East' },
  { abbr: 'NYG', city: 'New York', name: 'Giants', conference: 'NFC', division: 'East' },
  { abbr: 'PHI', city: 'Philadelphia', name: 'Eagles', conference: 'NFC', division: 'East' },
  { abbr: 'WAS', city: 'Washington', name: 'Commanders', conference: 'NFC', division: 'East' },
  { abbr: 'CHI', city: 'Chicago', name: 'Bears', conference: 'NFC', division: 'North' },
  { abbr: 'DET', city: 'Detroit', name: 'Lions', conference: 'NFC', division: 'North' },
  { abbr: 'GB', city: 'Green Bay', name: 'Packers', conference: 'NFC', division: 'North' },
  { abbr: 'MIN', city: 'Minnesota', name: 'Vikings', conference: 'NFC', division: 'North' },
  { abbr: 'ATL', city: 'Atlanta', name: 'Falcons', conference: 'NFC', division: 'South' },
  { abbr: 'CAR', city: 'Carolina', name: 'Panthers', conference: 'NFC', division: 'South' },
  { abbr: 'NO', city: 'New Orleans', name: 'Saints', conference: 'NFC', division: 'South' },
  { abbr: 'TB', city: 'Tampa Bay', name: 'Buccaneers', conference: 'NFC', division: 'South' },
  { abbr: 'ARI', city: 'Arizona', name: 'Cardinals', conference: 'NFC', division: 'West' },
  { abbr: 'LA', city: 'Los Angeles', name: 'Rams', conference: 'NFC', division: 'West' },
  { abbr: 'SF', city: 'San Francisco', name: '49ers', conference: 'NFC', division: 'West' },
  { abbr: 'SEA', city: 'Seattle', name: 'Seahawks', conference: 'NFC', division: 'West' },
];

const BY_ABBR: ReadonlyMap<string, TeamInfo> = new Map(TEAMS.map((t) => [t.abbr, t]));

export function getTeam(abbr: string): TeamInfo | undefined {
  return BY_ABBR.get(abbr.toUpperCase());
}

export function teamFullName(abbr: string): string {
  const team = getTeam(abbr);
  return team ? `${team.city} ${team.name}` : abbr;
}

export interface DivisionGroup {
  label: string;
  teams: TeamInfo[];
}

/** Eight divisions in display order: AFC East … NFC West. */
export function groupByDivision(teams: readonly TeamInfo[] = TEAMS): DivisionGroup[] {
  const conferences: Conference[] = ['AFC', 'NFC'];
  const divisions: Division[] = ['East', 'North', 'South', 'West'];
  return conferences.flatMap((conf) =>
    divisions.map((div) => ({
      label: `${conf} ${div}`,
      teams: teams.filter((t) => t.conference === conf && t.division === div),
    })),
  );
}
