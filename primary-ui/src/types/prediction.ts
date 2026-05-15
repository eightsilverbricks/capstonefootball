export interface ApiPrediction {
  season: number;
  week: number;
  home_team: string;
  away_team: string;
  home_win_prob: number;
  away_win_prob: number;
  predicted_winner: string;
}

export type ConfidenceLevel = 'High' | 'Medium' | 'Low';
export type SortMode = 'confidence' | 'week';
export type ConfidenceFilter = 'all' | 'high' | 'medium' | 'low';

export function getPredictedProbability(game: ApiPrediction) {
  return game.predicted_winner === game.home_team
    ? game.home_win_prob
    : game.away_win_prob;
}

export function getConfidenceScore(game: ApiPrediction) {
  return Math.abs(game.home_win_prob - 0.5);
}

export function getConfidencePercent(game: ApiPrediction) {
  return getConfidenceScore(game) * 200;
}

export function getConfidenceLevel(game: ApiPrediction): ConfidenceLevel {
  const confidence = getConfidenceScore(game);

  if (confidence >= 0.15) {
    return 'High';
  }
  if (confidence >= 0.08) {
    return 'Medium';
  }
  return 'Low';
}

export function toPercent(probability: number) {
  return (probability * 100).toFixed(1);
}
