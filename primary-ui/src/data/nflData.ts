export const heroImage =
  'https://d64gsuwffb70l.cloudfront.net/694491795a0312a18db84fc2_1766101527992_8e96bca5.jpg';

export const modelAccuracy = {
  season: 202,
  seasonTotal: 285,
};

export const topFactors = [
  { rank: 1, name: 'Market Lines', importance: 15, description: 'Spread plus home and away moneyline' },
  { rank: 2, name: 'Season EPA Differential', importance: 13, description: 'Offensive and defensive EPA per play gaps' },
  { rank: 3, name: 'Success Rate Differential', importance: 12, description: 'Season and recent offensive consistency' },
  { rank: 4, name: 'Quarterback Efficiency', importance: 10, description: 'QB EPA per play and completion percentage over expected' },
  { rank: 5, name: 'Turnover Differential', importance: 9, description: 'Season and last-three-game turnover margin' },
  { rank: 6, name: 'Passing Matchup', importance: 9, description: 'Home passing EPA against opponent defensive EPA allowed' },
  { rank: 7, name: 'Recent Form', importance: 8, description: 'Last-three-game EPA, success rate, pass EPA, and QB EPA' },
  { rank: 8, name: 'Sack Pressure', importance: 7, description: 'Sacks allowed against opponent defensive sack rate' },
  { rank: 9, name: 'Rest Differential', importance: 6, description: 'Home rest days minus away rest days' },
  { rank: 10, name: 'Game Context', importance: 5, description: 'Division game and home-field indicators' },
];
