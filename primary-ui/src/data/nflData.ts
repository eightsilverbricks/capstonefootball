export const modelAccuracy = {
  season: 203,
  seasonTotal: 285,
};

export const topFactors = [
  { rank: 1, name: 'Closing Spread', importance: 15, description: 'Point spread from the home-team perspective' },
  { rank: 2, name: 'Home Moneyline', importance: 13, description: 'Market price for the home team' },
  { rank: 3, name: 'Away Moneyline', importance: 12, description: 'Market price for the away team' },
  { rank: 4, name: 'Rest Differential', importance: 8, description: 'Home rest days minus away rest days' },
  { rank: 5, name: 'Recent Point Differential', importance: 8, description: 'Last-three-game scoring margin' },
  { rank: 6, name: 'Recent EPA', importance: 7, description: 'Last-three-game offensive and defensive EPA' },
  { rank: 7, name: 'Recent Success Rate', importance: 7, description: 'Last-three-game efficiency on offense and defense' },
  { rank: 8, name: 'Recent Win Rate', importance: 6, description: 'Last-three-game win percentage' },
  { rank: 9, name: 'Division Matchup', importance: 5, description: 'Whether both teams are in the same division' },
  { rank: 10, name: 'Home Field', importance: 4, description: 'Home-team indicator retained in the model' },
];

// ─── NFL Team Colors ───────────────────────────────────────────────────────────
// primary: dominant brand color used for accents
// secondary: alternate color used for text/highlights
export const NFL_TEAM_COLORS: Record<string, { primary: string; secondary: string; text: string }> = {
  ARI: { primary: '#97233F', secondary: '#FFB612', text: '#ffffff' },
  ATL: { primary: '#A71930', secondary: '#000000', text: '#ffffff' },
  BAL: { primary: '#241773', secondary: '#9E7C0C', text: '#ffffff' },
  BUF: { primary: '#00338D', secondary: '#C60C30', text: '#ffffff' },
  CAR: { primary: '#0085CA', secondary: '#101820', text: '#ffffff' },
  CHI: { primary: '#0B162A', secondary: '#C83803', text: '#C83803' },
  CIN: { primary: '#FB4F14', secondary: '#000000', text: '#ffffff' },
  CLE: { primary: '#311D00', secondary: '#FF3C00', text: '#FF3C00' },
  DAL: { primary: '#003594', secondary: '#869397', text: '#ffffff' },
  DEN: { primary: '#FB4F14', secondary: '#002244', text: '#ffffff' },
  DET: { primary: '#0076B6', secondary: '#B0B7BC', text: '#ffffff' },
  GB:  { primary: '#203731', secondary: '#FFB612', text: '#FFB612' },
  HOU: { primary: '#03202F', secondary: '#A71930', text: '#A71930' },
  IND: { primary: '#002C5F', secondary: '#A2AAAD', text: '#ffffff' },
  JAX: { primary: '#006778', secondary: '#9F792C', text: '#ffffff' },
  KC:  { primary: '#E31837', secondary: '#FFB81C', text: '#ffffff' },
  LA:  { primary: '#003594', secondary: '#FFA300', text: '#FFA300' },
  LAC: { primary: '#0080C6', secondary: '#FFC20E', text: '#ffffff' },
  LV:  { primary: '#000000', secondary: '#A5ACAF', text: '#A5ACAF' },
  MIA: { primary: '#008E97', secondary: '#FC4C02', text: '#ffffff' },
  MIN: { primary: '#4F2683', secondary: '#FFC62F', text: '#FFC62F' },
  NE:  { primary: '#002244', secondary: '#C60C30', text: '#C60C30' },
  NO:  { primary: '#101820', secondary: '#D3BC8D', text: '#D3BC8D' },
  NYG: { primary: '#0B2265', secondary: '#A71930', text: '#A71930' },
  NYJ: { primary: '#125740', secondary: '#ffffff', text: '#ffffff' },
  PHI: { primary: '#004C54', secondary: '#A5ACAF', text: '#A5ACAF' },
  PIT: { primary: '#101820', secondary: '#FFB612', text: '#FFB612' },
  SEA: { primary: '#002244', secondary: '#69BE28', text: '#69BE28' },
  SF:  { primary: '#AA0000', secondary: '#B3995D', text: '#ffffff' },
  TB:  { primary: '#D50A0A', secondary: '#FF7900', text: '#ffffff' },
  TEN: { primary: '#0C2340', secondary: '#4B92DB', text: '#4B92DB' },
  WAS: { primary: '#5A1414', secondary: '#FFB612', text: '#FFB612' },
};

// ─── ESPN logo abbreviation mapping ───────────────────────────────────────────
// The ESPN CDN uses different abbreviations for a few teams
const ESPN_ABBR_MAP: Record<string, string> = {
  LA:  'LAR',
  WAS: 'WSH',
};

export function getTeamColors(abbr: string) {
  return NFL_TEAM_COLORS[abbr] ?? { primary: '#1e293b', secondary: '#94a3b8', text: '#ffffff' };
}

export function getEspnLogoUrl(abbr: string): string {
  const espnAbbr = ESPN_ABBR_MAP[abbr] ?? abbr;
  return `https://a.espncdn.com/i/teamlogos/nfl/500/${espnAbbr.toLowerCase()}.png`;
}
