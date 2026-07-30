// ─── leagueStorylines — the homepage "around the league" rail ─────────────────
// Not news. Every card here is written by the model's own prose layer about a
// specific game in the dataset (factor headlines, the upset path, the key
// battle, the market note), so the rail is honest reporting on what Clark
// thinks rather than a fabricated news feed. The kicker on each card says which
// of those it is.
//
// Angle rotation is deterministic — index-offset, not random — so the rail
// doesn't reshuffle between renders and stays testable.

import { ApiPrediction, getConfidenceScore } from '@/types/prediction';
import { getHeroInsight } from '@/lib/heroInsight';
import { gameKey } from '@/lib/threeWaySignal';

export type StorylineAngle = 'read' | 'upset' | 'battle' | 'market';

export interface Storyline {
  id: string;
  angle: StorylineAngle;
  /** Short uppercase eyebrow, e.g. "Clark's read". */
  kicker: string;
  headline: string;
  body: string;
  game: ApiPrediction;
}

const KICKERS: Record<StorylineAngle, string> = {
  read: "Clark's read",
  upset: 'The upset path',
  battle: 'Key battle',
  market: 'Market check',
};

/** Trim model prose to a rail-friendly length without cutting mid-word. */
function clamp(text: string, max = 190): string {
  const clean = text.trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return `${cut.slice(0, lastSpace > 0 ? lastSpace : max).trimEnd()}…`;
}

/** Strip the "Defensive Resistance: " style prefix off key_battle strings. */
function battleHeadline(keyBattle: string): string {
  const [prefix] = keyBattle.split(':');
  return prefix && prefix.length < 40 ? prefix.trim() : 'The matchup that decides it';
}

function buildAngle(game: ApiPrediction, angle: StorylineAngle): Storyline | null {
  const base = { id: `${gameKey(game)}:${angle}`, angle, kicker: KICKERS[angle], game };

  if (angle === 'read') {
    const insight = getHeroInsight(game);
    if (!insight) return null;
    return { ...base, headline: insight.headline, body: clamp(insight.line || game.football_story || '') };
  }

  if (angle === 'upset' && game.risk_factor) {
    return {
      ...base,
      headline: `How ${game.predicted_winner} loses this`,
      body: clamp(game.risk_factor),
    };
  }

  if (angle === 'battle' && game.key_battle) {
    return { ...base, headline: battleHeadline(game.key_battle), body: clamp(game.key_battle) };
  }

  if (angle === 'market' && game.market_note) {
    return {
      ...base,
      headline: game.market_context?.market_favorite === game.predicted_winner
        ? 'Clark and Vegas agree here'
        : 'Clark and Vegas part ways',
      body: clamp(game.market_note),
    };
  }

  return null;
}

// Rotation order — each game starts at a different offset so consecutive cards
// in the rail don't all lead with the same angle.
const ANGLES: StorylineAngle[] = ['read', 'upset', 'battle', 'market'];

/**
 * One storyline per game, strongest reads first, angles rotated for variety.
 * Games with no usable prose are skipped rather than filled with placeholder
 * text.
 */
export function selectStorylines(games: ApiPrediction[], limit = 6): Storyline[] {
  const ranked = [...games].sort((a, b) => getConfidenceScore(b) - getConfidenceScore(a));
  const out: Storyline[] = [];

  for (let i = 0; i < ranked.length && out.length < limit; i++) {
    const game = ranked[i];
    const offset = out.length % ANGLES.length;
    // Try the rotated angle first, then fall back through the rest so a game
    // with thin data still contributes whatever it does have.
    for (let step = 0; step < ANGLES.length; step++) {
      const story = buildAngle(game, ANGLES[(offset + step) % ANGLES.length]);
      if (story) {
        out.push(story);
        break;
      }
    }
  }

  return out;
}
