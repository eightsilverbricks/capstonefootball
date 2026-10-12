/** The in-depth Clark Report, written by nfl-prediction/src/clark_report.py. */

export interface ReportStat {
  display: string;
  rank: number;
}

export interface MatchupTable {
  offense_team: string;
  defense_team: string;
  edge_team: string | null;
  rows: { label: string; offense: ReportStat; defense: ReportStat }[];
}

export interface MatchupSection {
  title: string;
  sub: string;
  table: MatchupTable;
  body: string[];
}

export interface ClarkReportData {
  version: number;
  source: 'template' | 'gemini';
  basis: { kind: 'season' | 'last_season'; season: number; label: string; games: number };
  headline: string;
  dek: string;
  intro: string[];
  deciding: MatchupSection;
  other_side: MatchupSection;
  underdog: { title: string; items: { lead: string; text: string }[] };
  change_my_mind: string[];
  meaning: { title: string; pct: number; body: string };
  line: { favorite: string; spread: number; pct: number; body: string } | null;
  numbers: { away: string; home: string; rows: { label: string; away: string; home: string }[] };
  signoff: string;
}
