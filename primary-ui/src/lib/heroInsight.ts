// ─── heroInsight — the "Clark noticed…" card + dynamic evidence-gate teaser ────
// Pure helpers. Both surface the same idea: the non-obvious factor Clark's
// pick actually rests on, stated as a claim rather than a percentage — visible
// BEFORE anyone opts into the full evidence, per the virality plan (B2/B3).
//
// Selection order mirrors the backend's synthesis-lede logic (see
// nfl-prediction/src/factor_prose.py build_synthesis_lede): prefer a genuinely
// confident football factor (not the market) that favors the predicted
// winner; fall back to any confident factor for the winner; fall back to the
// single strongest card overall so the UI never has nothing to show.

import { ApiPrediction, FactorCard } from '@/types/prediction';

const FOOTBALL_FACTOR_NAMES = new Set(['Recent Offense', 'Defensive Edge', 'Momentum']);

function isConfident(card: FactorCard): boolean {
  return card.confident !== false;
}

/**
 * The single factor card the "Clark noticed" card and evidence teaser should
 * both be built from. Returns null only when the game has no factor cards.
 */
export function getHeroFactor(game: ApiPrediction): FactorCard | null {
  const cards = game.factor_cards ?? [];
  if (cards.length === 0) return null;

  const sorted = [...cards].sort((a, b) => b.contribution_strength - a.contribution_strength);
  const winner = game.predicted_winner;

  const footballLead = sorted.find(
    (c) => c.advantage_team === winner && FOOTBALL_FACTOR_NAMES.has(c.name) && isConfident(c),
  );
  if (footballLead) return footballLead;

  const confidentForWinner = sorted.find((c) => c.advantage_team === winner && isConfident(c));
  if (confidentForWinner) return confidentForWinner;

  return sorted[0];
}

export interface HeroInsight {
  headline: string;
  line: string;
  team: string;
}

/** First sentence of a paragraph — keeps the hero card to one punchy line. */
function firstSentence(text: string): string {
  const match = text.match(/^.*?[.!?](?:\s|$)/);
  return (match ? match[0] : text).trim();
}

/**
 * Data for the "Clark noticed…" hero card. Returns null when there's no
 * factor data to build a genuine insight from (caller should skip the card).
 */
export function getHeroInsight(game: ApiPrediction): HeroInsight | null {
  const factor = getHeroFactor(game);
  if (!factor || !factor.headline) return null;

  const explanation = factor.explanation || '';
  return {
    headline: factor.headline,
    line: explanation ? firstSentence(explanation) : '',
    team: factor.advantage_team,
  };
}

const FACTOR_LABELS: Record<string, string> = {
  'Market Edge': 'market',
  'Recent Offense': 'offensive',
  'Defensive Edge': 'defensive',
  'Momentum': 'momentum',
  'Game Context': 'situational',
};

/**
 * Dynamic, per-game promise for the evidence-gate button — replaces the
 * generic "View the evidence — why Clark thinks this" with a specific pull
 * from this game's data (top factor + the upset path, when one exists).
 */
export function getEvidenceTeaser(game: ApiPrediction): string {
  const factor = getHeroFactor(game);
  if (!factor) return 'View the evidence — why Clark thinks this';

  const label = FACTOR_LABELS[factor.name] ?? factor.name.toLowerCase();
  const base = `See the ${label} edge Clark weighted most`;
  return game.risk_factor ? `${base} — and the upset path.` : `${base} in this one.`;
}
