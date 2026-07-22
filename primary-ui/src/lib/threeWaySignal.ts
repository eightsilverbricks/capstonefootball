// ─── Clark / Vegas / Fans comparison logic ─────────────────────────────────────
// Vegas is derived from real market_context data already in predictions.json.
// Fan sentiment has NO real backend yet — see product-overhaul Phase 5/6 for the
// planned persistence layer. Until then, getFanPick() below is a clearly-labeled
// PROVISIONAL placeholder: deterministic per game (seeded by game id) so the UI
// doesn't flicker or lie about being live data, but it is not real user input.
// Replace this module's fan logic — and only this module — once real aggregated
// picks exist.

import { ApiPrediction, getPredictedProbability } from '@/types/prediction';
import { GAME_CREDIT_CAP } from '@/competition/scoring';
import { getHeroInsight } from '@/lib/heroInsight';

export interface TeamPick {
  team: string;
  /** Win probability / confidence in [0, 1] for `team`. */
  prob: number;
}

export function gameKey(game: ApiPrediction): string {
  return game.game_id ?? `${game.season}_${game.week}_${game.away_team}_${game.home_team}`;
}

// ─── Deterministic seeded PRNG (djb2 hash → [0,1)) ─────────────────────────────
// NOT cryptographic. Only used so provisional fan data is stable across renders.
function seededRandom01(seed: string): number {
  let hash = 5381;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 33) ^ seed.charCodeAt(i);
  }
  // Convert to unsigned 32-bit, then normalize to [0, 1)
  return (hash >>> 0) / 4294967296;
}

// ─── Vegas — real data, derived from moneylines ────────────────────────────────
function moneylineToImpliedProb(moneyline: number): number {
  return moneyline < 0 ? -moneyline / (-moneyline + 100) : 100 / (moneyline + 100);
}

export function getVegasPick(game: ApiPrediction): TeamPick | null {
  const mc = game.market_context;
  if (!mc || !mc.market_used || !mc.home_moneyline || !mc.away_moneyline) return null;

  const homeImplied = moneylineToImpliedProb(mc.home_moneyline);
  const awayImplied = moneylineToImpliedProb(mc.away_moneyline);
  const total = homeImplied + awayImplied; // remove vig
  if (total <= 0) return null;

  const homeProb = homeImplied / total;
  const awayProb = awayImplied / total;
  return homeProb >= awayProb
    ? { team: game.home_team, prob: homeProb }
    : { team: game.away_team, prob: awayProb };
}

// ─── Fans — PROVISIONAL placeholder, seeded per game ───────────────────────────
/**
 * PROVISIONAL. Deterministic placeholder for fan sentiment — not real user data.
 * ~65% of the time fans "agree" with Clark's favorite (mirrors real-world
 * favorite bias); the rest of the time they lean the other way, so the product
 * has real-feeling disagreement to demonstrate the three-way comparison.
 */
export function getFanPick(game: ApiPrediction): TeamPick {
  const seed = gameKey(game);
  const agreesWithClark = seededRandom01(`${seed}:fanflip`) < 0.65;
  const team = agreesWithClark
    ? game.predicted_winner
    : game.predicted_winner === game.home_team
      ? game.away_team
      : game.home_team;
  const prob = 0.52 + seededRandom01(`${seed}:fanconf`) * 0.41; // 52%–93%
  return { team, prob };
}

// ─── Pre-pick teaser — a qualitative hook shown BEFORE the user commits ────────
// Deliberately withholds every number (team names, percentages) so it can't bias
// the blind pick — only describes the *shape* of the disagreement. Several games
// in the same week often land in the same bucket (e.g. several near-locks), so
// each bucket has a few phrasings, chosen deterministically per game so adjacent
// cards in a confidence-sorted feed don't read identically.
function pickVariant(seed: string, options: string[]): string {
  const idx = Math.floor(seededRandom01(`${seed}:teaser`) * options.length);
  return options[idx];
}

export function getPrePickTeaser(game: ApiPrediction, vegas: TeamPick | null, fan: TeamPick): string {
  const clarkProb = getPredictedProbability(game);
  const seed = gameKey(game);
  const disagreementCount =
    (fan.team !== game.predicted_winner ? 1 : 0) + (vegas && vegas.team !== game.predicted_winner ? 1 : 0);

  if (disagreementCount >= 2) {
    return pickVariant(seed, ['Nobody agrees on this one.', 'Three different opinions on this game.']);
  }
  if (Math.abs(fan.prob - 0.5) < 0.06) {
    return pickVariant(seed, ['Fans are genuinely split.', "This fanbase can't agree with itself."]);
  }
  if (vegas && vegas.team !== game.predicted_winner) {
    return pickVariant(seed, ["The market isn't so sure about this.", 'Vegas sees it differently than Clark.']);
  }
  if (clarkProb >= 0.75) {
    return pickVariant(seed, ['Clark sees this as a near-lock.', 'Clark isn\'t hedging on this one.', "One of Clark's more confident reads."]);
  }
  if (clarkProb <= 0.56) {
    return pickVariant(seed, ["This one's close to a coin flip.", 'A genuine toss-up, per Clark.']);
  }
  return pickVariant(seed, ['A clean read this week.', 'Nothing unusual here — steady favorite.']);
}

// ─── Fan sentiment over time — PROVISIONAL, seeded per game ───────────────────
/**
 * PROVISIONAL. A deterministic, seeded time series of fan support for the
 * fan-favored team in the days leading to kickoff — NOT real tracked sentiment.
 * Drifts from a 50/50 start toward getFanPick()'s final share, so the reveal on
 * the game page has a believable "support built over the week" shape. Labeled
 * illustrative wherever shown.
 */
export interface SentimentPoint {
  label: string;
  pct: number;
}

export function getFanSentimentSeries(game: ApiPrediction): { team: string; points: SentimentPoint[] } {
  const fan = getFanPick(game);
  const seed = gameKey(game);
  const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Kick'];
  const target = fan.prob;

  const points = labels.map((label, i) => {
    const t = i / (labels.length - 1);
    if (i === labels.length - 1) return { label, pct: target };
    const base = 0.5 + (target - 0.5) * t;
    const noise = (seededRandom01(`${seed}:sent${i}`) - 0.5) * 0.09 * (1 - t * 0.5);
    return { label, pct: Math.min(0.95, Math.max(0.05, base + noise)) };
  });

  return { team: fan.team, points };
}

// ─── Fanbase split — PROVISIONAL, seeded per game ─────────────────────────────
/** PROVISIONAL. How loyally each fanbase backs its own team (homer bias). */
export interface FanbaseSplit {
  homeTeam: string;
  homeBacksHome: number;
  awayTeam: string;
  awayBacksAway: number;
}

export function getFanbaseSplit(game: ApiPrediction): FanbaseSplit {
  const seed = gameKey(game);
  return {
    homeTeam: game.home_team,
    homeBacksHome: 0.62 + seededRandom01(`${seed}:homehomer`) * 0.3,
    awayTeam: game.away_team,
    awayBacksAway: 0.6 + seededRandom01(`${seed}:awayhomer`) * 0.3,
  };
}

// ─── One-line takeaway — the central conflict of a matchup ─────────────────────
export function getMatchupTakeaway(game: ApiPrediction, vegas: TeamPick | null, fan: TeamPick): string {
  const clark = game.predicted_winner;
  if (vegas && vegas.team !== clark && fan.team !== clark) {
    return `Clark stands alone on ${clark} — Vegas and the fans both lean the other way.`;
  }
  if (vegas && vegas.team !== clark) {
    return `The model likes ${clark}; the market leans ${vegas.team}. That gap is the whole game.`;
  }
  if (fan.team !== clark) {
    return `Clark and Vegas both back ${clark}, but ${fan.team} fans aren't buying it.`;
  }
  if (getPredictedProbability(game) < 0.58) {
    return `A near coin-flip — Clark gives ${clark} only the slightest edge.`;
  }
  return `Clark, Vegas, and the fans all converge on ${clark} — a rare game with no argument.`;
}

// ─── Homepage "Signal" — most interesting disagreement in a set of games ──────
export interface SignalResult {
  game: ApiPrediction;
  sentence: string;
  clark: TeamPick;
  vegas: TeamPick | null;
  fan: TeamPick;
  /** The non-obvious factor headline behind Clark's pick (B5) — null if the
   * game has no factor data to build one from. */
  clarkHeadline: string | null;
}

export function computeSignal(games: ApiPrediction[]): SignalResult | null {
  if (games.length === 0) return null;

  let best: SignalResult | null = null;
  let bestScore = -Infinity;

  for (const game of games) {
    const vegas = getVegasPick(game);
    const fan = getFanPick(game);
    const clark: TeamPick = { team: game.predicted_winner, prob: getPredictedProbability(game) };

    const disagreementCount =
      (fan.team !== clark.team ? 1 : 0) +
      (vegas && vegas.team !== clark.team ? 1 : 0) +
      (vegas && vegas.team !== fan.team ? 1 : 0);
    const splitCloseness = 0.5 - Math.abs(fan.prob - 0.5); // rewards a divided fanbase
    const score = disagreementCount * 10 + splitCloseness;

    if (score > bestScore) {
      bestScore = score;
      best = {
        game,
        sentence: buildSignalSentence(game, clark, vegas, fan),
        clark, vegas, fan,
        clarkHeadline: getHeroInsight(game)?.headline ?? null,
      };
    }
  }
  return best;
}

// ─── Fanbase standings — PROVISIONAL, seeded per (team, game) ──────────────────
/**
 * PROVISIONAL. A per-fanbase season standing, seeded deterministically — NOT
 * real community data. For each team's own games it models loyal-but-imperfect
 * belief: fans usually back their own team (seeded ~75% loyalty) at a seeded
 * conviction, sometimes fading them. Resolved against the real actual_winner,
 * this yields a fun, honest-if-labeled "which fanbases believed well in 2024"
 * ranking. Replace with real aggregated fan picks when they exist.
 */
export interface FanbaseStanding {
  team: string;
  games: number;
  correct: number;
  net: number;
  loyaltyPct: number;
}

export function computeFanbaseStandings(games: ApiPrediction[]): FanbaseStanding[] {
  const byTeam = new Map<string, { games: number; correct: number; net: number; loyal: number }>();

  for (const game of games) {
    const winner = game.actual_winner ?? null;
    if (!winner) continue; // only resolved games count

    for (const team of [game.home_team, game.away_team]) {
      const opponent = team === game.home_team ? game.away_team : game.home_team;
      const seed = `${team}:${gameKey(game)}`;
      const isLoyal = seededRandom01(`${seed}:loyal`) < 0.75;
      const backed = isLoyal ? team : opponent;
      const conviction = 0.55 + seededRandom01(`${seed}:conv`) * 0.4; // 0.55–0.95
      const stake = Math.round(GAME_CREDIT_CAP * (2 * conviction - 1));
      const won = backed === winner;

      const acc = byTeam.get(team) ?? { games: 0, correct: 0, net: 0, loyal: 0 };
      acc.games += 1;
      acc.correct += won ? 1 : 0;
      acc.net += won ? stake : -stake;
      acc.loyal += isLoyal ? 1 : 0;
      byTeam.set(team, acc);
    }
  }

  return [...byTeam.entries()]
    .map(([team, a]) => ({
      team,
      games: a.games,
      correct: a.correct,
      net: a.net,
      loyaltyPct: a.games ? a.loyal / a.games : 0,
    }))
    .sort((a, b) => b.net - a.net);
}

function buildSignalSentence(
  game: ApiPrediction,
  clark: TeamPick,
  vegas: TeamPick | null,
  fan: TeamPick,
): string {
  const matchup = `${game.away_team} at ${game.home_team}`;
  if (vegas && vegas.team !== clark.team) {
    return `Vegas and Clark disagree on ${matchup}.`;
  }
  if (fan.team !== clark.team) {
    return `Clark and Vegas agree on ${clark.team}. ${fan.team} fans don't.`;
  }
  if (Math.abs(fan.prob - 0.5) < 0.06) {
    return `This week's most divided fanbase: ${matchup}.`;
  }
  return `Clark, Vegas, and the fans all agree on ${clark.team} this week.`;
}
