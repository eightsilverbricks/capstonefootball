// ─── Factor card from the football diagnosis engine ───────────────────────────
export interface FactorCard {
  name: string;
  advantage_team: string;
  opponent?: string;
  raw_edge: number;
  contribution_strength: number;
  status: 'DECISIVE' | 'MODERATE' | 'MINOR' | 'NEUTRAL';
  tier?: 'strong' | 'medium' | 'weak';
  reason?: string;
  why_it_matters: string;
  football_translation: string;
}

// ─── Market context ────────────────────────────────────────────────────────────
export interface MarketContext {
  market_used: boolean;
  market_favorite: string;
  spread_line: number;
  home_moneyline: number;
  away_moneyline: number;
  interpretation: string;
}

// ─── Learning module (beginner education) ─────────────────────────────────────
export interface LearningModule {
  concept: string;
  simple_explanation: string;
  why_predictive: string;
}

// ─── Legacy explanation factors (kept for backward compat) ────────────────────
export interface PredictionFactor {
  feature: string;
  label: string;
  value: string;
  direction: string;
  impact: number;
}

// ─── Player context per team ──────────────────────────────────────────────────
export interface PlayerContext {
  qb?: { name?: string | null; attempts?: number; epa_per_att?: number; cpoe?: number | null };
  rb?: { name?: string | null; carries?: number; ypc?: number; epa?: number };
}

// ─── Full game prediction from /predictions endpoint ──────────────────────────
export interface ApiPrediction {
  // Identity
  season: number;
  week: number;
  week_label: string;
  game_date?: string;
  weekday?: string;
  gametime?: string;
  game_type?: string;
  location?: string;
  stadium?: string;
  home_team: string;
  away_team: string;

  // Core prediction
  predicted_winner: string;
  home_win_prob: number;
  away_win_prob: number;

  // Confidence
  confidence_label: 'High' | 'Medium' | 'Low';
  confidence_score: number;

  // Football diagnosis
  headline?: string;
  football_story?: string;
  primary_reason?: string;
  secondary_reason?: string;
  risk_factor?: string;
  flip_scenarios?: string[];
  factor_cards?: FactorCard[];
  market_note?: string;
  market_context?: MarketContext;
  learning_module?: LearningModule;
  key_battle?: string;

  // Player context
  home_players?: PlayerContext;
  away_players?: PlayerContext;

  // Weather
  weather?: {
    temp?: number | null;
    wind?: number | null;
    surface?: string;
    roof?: string | null;
    stadium?: string | null;
    is_outdoor?: boolean;
    is_notable?: boolean;
    summary?: string;
  };

  // Records (pregame)
  home_season_record?: string | null;
  away_season_record?: string | null;
  home_last3_record?: string | null;
  away_last3_record?: string | null;
  home_last3_pts_for?: number | null;
  home_last3_pts_ag?: number | null;
  away_last3_pts_for?: number | null;
  away_last3_pts_ag?: number | null;

  // Legacy compat
  explanation_summary?: string;
  explanation_factors?: PredictionFactor[];
  model_feature_set?: string;
}

// ─── Filter / sort types ──────────────────────────────────────────────────────
export type ConfidenceFilter = 'all' | 'high' | 'medium' | 'low';
export type SortMode = 'confidence' | 'week';

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getPredictedProbability(game: ApiPrediction): number {
  return game.predicted_winner === game.home_team
    ? game.home_win_prob
    : game.away_win_prob;
}

/** Returns the raw edge value (0–1) as a percentage string like "72%" */
export function toPercent(prob: number): string {
  return (prob * 100).toFixed(1);
}

export function getConfidenceLevel(game: ApiPrediction): 'High' | 'Medium' | 'Low' {
  return game.confidence_label ?? (
    Math.abs(game.home_win_prob - 0.5) >= 0.15 ? 'High'
    : Math.abs(game.home_win_prob - 0.5) >= 0.08 ? 'Medium'
    : 'Low'
  );
}

/** Winner win probability as a 0–100 number */
export function getWinnerProb(game: ApiPrediction): number {
  return getPredictedProbability(game) * 100;
}

/** Top N factor cards sorted by contribution_strength */
export function getTopFactors(game: ApiPrediction, n = 3): FactorCard[] {
  const cards = game.factor_cards ?? [];
  return [...cards]
    .sort((a, b) => b.contribution_strength - a.contribution_strength)
    .slice(0, n);
}

export function getConfidenceScore(game: ApiPrediction): number {
  return Math.abs(game.home_win_prob - 0.5);
}
