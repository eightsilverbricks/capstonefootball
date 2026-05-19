export const heroImage =
  'https://d64gsuwffb70l.cloudfront.net/694491795a0312a18db84fc2_1766101527992_8e96bca5.jpg';

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
