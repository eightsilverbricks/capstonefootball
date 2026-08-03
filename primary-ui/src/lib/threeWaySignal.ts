// ─── Clark / Vegas / Fans comparison logic ─────────────────────────────────────
// All three signals are real data. Vegas is derived from the market_context
// moneylines already in predictions.json; the fan signal is the aggregate of
// real accounts' picks, loaded through sentimentRepository.
//
// The fan signal is therefore *optional*: a game nobody has picked yet has no
// fan position at all. Every fan helper below returns null in that case, and
// callers are expected to say "no picks yet" rather than fill the gap. Nothing
// in this module invents a number.

import { ApiPrediction, getPredictedProbability } from '@/types/prediction';
import { GAME_CREDIT_CAP } from '@/competition/scoring';
import { FanbaseTotal, SentimentDay, SentimentMap } from '@/data/sentimentRepository';

export interface TeamPick {
  team: string;
  /** Win probability / confidence in [0, 1] for `team`. */
  prob: number;
}

/** A fan position, plus how many real picks it rests on. */
export interface FanPick extends TeamPick {
  picks: number;
}

export function gameKey(game: ApiPrediction): string {
  return game.game_id ?? `${game.season}_${game.week}_${game.away_team}_${game.home_team}`;
}

// ─── Deterministic seeded PRNG (djb2 hash → [0,1)) ─────────────────────────────
// NOT cryptographic, and no longer used for any *data*. Its only remaining job
// is choosing between equivalent phrasings of the pre-pick teaser, so adjacent
// cards in a sorted feed don't read identically. Stable per game across renders.
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

// ─── Fans — real aggregated picks ──────────────────────────────────────────────
/**
 * Where the community landed on this game: the team more accounts backed, and
 * the share of picks it drew. Null when nobody has picked it yet — there is no
 * such thing as a fan position on a game with no picks.
 */
export function getFanPick(game: ApiPrediction, sentiment: SentimentMap): FanPick | null {
  const entry = sentiment[gameKey(game)];
  if (!entry) return null;

  const home = entry.byTeam[game.home_team] ?? 0;
  const away = entry.byTeam[game.away_team] ?? 0;
  const counted = home + away;
  if (counted === 0) return null;

  return home >= away
    ? { team: game.home_team, prob: home / counted, picks: counted }
    : { team: game.away_team, prob: away / counted, picks: counted };
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

export function getPrePickTeaser(
  game: ApiPrediction,
  vegas: TeamPick | null,
  fan: FanPick | null,
): string {
  const clarkProb = getPredictedProbability(game);
  const seed = gameKey(game);
  const disagreementCount =
    (fan && fan.team !== game.predicted_winner ? 1 : 0) +
    (vegas && vegas.team !== game.predicted_winner ? 1 : 0);

  if (disagreementCount >= 2) {
    return pickVariant(seed, ['Nobody agrees on this one.', 'Three different opinions on this game.']);
  }
  if (fan && Math.abs(fan.prob - 0.5) < 0.06) {
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

// ─── Fan support over time — real, from pick timestamps ───────────────────────
export interface SentimentPoint {
  label: string;
  pct: number;
}

export interface SentimentSeries {
  team: string;
  points: SentimentPoint[];
  picks: number;
}

/** A curve needs at least this many picks over this many days to mean anything. */
const MIN_SERIES_DAYS = 2;
const MIN_SERIES_PICKS = 4;

function dayLabel(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`);
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getUTCDay()] ?? iso.slice(5);
}

/**
 * How support for the eventual leading team built, day by day, from real pick
 * timestamps. Null when there aren't enough picks across enough days to draw a
 * line that says anything — two picks on one afternoon is not a trend.
 */
export function buildSentimentSeries(
  game: ApiPrediction,
  days: SentimentDay[],
): SentimentSeries | null {
  if (days.length < MIN_SERIES_DAYS) return null;

  const totals = days.reduce(
    (acc, d) => ({
      home: acc.home + (d.byTeam[game.home_team] ?? 0),
      away: acc.away + (d.byTeam[game.away_team] ?? 0),
    }),
    { home: 0, away: 0 },
  );
  const picks = totals.home + totals.away;
  if (picks < MIN_SERIES_PICKS) return null;

  const team = totals.home >= totals.away ? game.home_team : game.away_team;
  const other = team === game.home_team ? game.away_team : game.home_team;

  let backing = 0;
  let against = 0;
  const points: SentimentPoint[] = [];
  for (const d of days) {
    backing += d.byTeam[team] ?? 0;
    against += d.byTeam[other] ?? 0;
    const counted = backing + against;
    if (counted === 0) continue; // picks that day were all on a third value — skip
    points.push({ label: dayLabel(d.day), pct: backing / counted });
  }

  return points.length >= MIN_SERIES_DAYS ? { team, points, picks } : null;
}

// ─── Fanbase split — real, from picks tagged with the picker's fanbase ────────
export interface FanbaseSide {
  team: string;
  /** Share of that fanbase's picks that backed their own team. */
  backsOwn: number;
  picks: number;
}

export interface FanbaseSplit {
  home: FanbaseSide | null;
  away: FanbaseSide | null;
}

function sideSplit(fanTeam: string, key: string, totals: FanbaseTotal[]): FanbaseSide | null {
  const rows = totals.filter((r) => r.fanTeam === fanTeam && r.gameKey === key);
  const picks = rows.reduce((s, r) => s + r.picks, 0);
  if (picks === 0) return null;

  const own = rows.filter((r) => r.team === fanTeam).reduce((s, r) => s + r.picks, 0);
  return { team: fanTeam, backsOwn: own / picks, picks };
}

/**
 * How loyally each side's fanbase backed its own team on this game. Either side
 * is null when nobody from that fanbase has picked it. Null overall when neither
 * has.
 */
export function getFanbaseSplit(
  game: ApiPrediction,
  totals: FanbaseTotal[],
): FanbaseSplit | null {
  const key = gameKey(game);
  const home = sideSplit(game.home_team, key, totals);
  const away = sideSplit(game.away_team, key, totals);
  return home || away ? { home, away } : null;
}

// ─── One-line takeaway — the central conflict of a matchup ─────────────────────
export function getMatchupTakeaway(
  game: ApiPrediction,
  vegas: TeamPick | null,
  fan: FanPick | null,
): string {
  const clark = game.predicted_winner;
  if (vegas && fan && vegas.team !== clark && fan.team !== clark) {
    return `Clark stands alone on ${clark} — Vegas and the fans both lean the other way.`;
  }
  if (vegas && vegas.team !== clark) {
    return `The model likes ${clark}; the market leans ${vegas.team}. That gap is the whole game.`;
  }
  if (fan && fan.team !== clark) {
    return `Clark and Vegas both back ${clark}, but ${fan.team} fans aren't buying it.`;
  }
  if (getPredictedProbability(game) < 0.58) {
    return `A near coin-flip — Clark gives ${clark} only the slightest edge.`;
  }
  if (!fan) {
    return `Clark and the market both land on ${clark}. Nobody has staked a call against it yet.`;
  }
  return `Clark, Vegas, and the fans all converge on ${clark} — a rare game with no argument.`;
}

// ─── Fanbase standings — real, from picks tagged with the picker's fanbase ────
/**
 * Which fanbases have believed well this season. Every row is real: picks made
 * by accounts that told us who they root for, resolved against the actual
 * winner in predictions.json. Fanbases with no picks simply don't appear.
 */
export interface FanbaseStanding {
  team: string;
  /** Resolved picks made by this fanbase (not games — a game can hold many). */
  picks: number;
  correct: number;
  net: number;
  loyaltyPct: number;
}

export function computeFanbaseStandings(
  games: ApiPrediction[],
  totals: FanbaseTotal[],
): FanbaseStanding[] {
  const winnerByKey = new Map<string, string>();
  for (const game of games) {
    if (game.actual_winner) winnerByKey.set(gameKey(game), game.actual_winner);
  }

  const byTeam = new Map<string, { picks: number; correct: number; net: number; loyal: number }>();

  for (const row of totals) {
    const winner = winnerByKey.get(row.gameKey);
    if (!winner) continue; // only resolved games count

    const acc = byTeam.get(row.fanTeam) ?? { picks: 0, correct: 0, net: 0, loyal: 0 };
    const won = row.team === winner;
    acc.picks += row.picks;
    acc.correct += won ? row.picks : 0;
    // stakeUnits is Σ(2·conf − 1); the cap turns it into credits. Every pick in
    // this row backed the same team on the same game, so the sign is uniform.
    acc.net += (won ? 1 : -1) * row.stakeUnits * GAME_CREDIT_CAP;
    acc.loyal += row.team === row.fanTeam ? row.picks : 0;
    byTeam.set(row.fanTeam, acc);
  }

  return [...byTeam.entries()]
    .map(([team, a]) => ({
      team,
      picks: a.picks,
      correct: a.correct,
      net: Math.round(a.net),
      loyaltyPct: a.picks ? a.loyal / a.picks : 0,
    }))
    .sort((a, b) => b.net - a.net);
}
