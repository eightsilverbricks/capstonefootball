/**
 * The signed-in front page, as data: the lead Clark Report, the "more from this
 * week" items, injuries, and the You / Clark / Fans records. Everything here is
 * built from real fields in predictions.json (and real picks); nothing is
 * invented. Copy is in Clark's voice: first person, plain English.
 */
import { ApiPrediction, getPredictedProbability } from '@/types/prediction';
import { PickMap } from '@/data/picksRepository';
import { SentimentMap } from '@/data/sentimentRepository';
import { getTeam } from '@/data/teams';
import { gameKey, getFanPick, getVegasPick } from '@/lib/threeWaySignal';
import { isFinal } from '@/lib/gameStatus';
import { getSlateWindow, isContrarian, isTossUp, selectLeadGame } from '@/lib/slate';

const pct = (p: number): number => Math.round(p * 100);
const nick = (t: string): string => getTeam(t)?.name ?? t;
const loserOf = (g: ApiPrediction): string => (g.predicted_winner === g.home_team ? g.away_team : g.home_team);

/** Fan positions only count once enough people have picked. */
export const MIN_FAN_PICKS = 25;

export const gamePath = (g: ApiPrediction): string => `/game/${g.season}/${g.week}/${g.away_team}/${g.home_team}`;

/** The story text minus its "Clark picks X with a N% chance" opener, which the headline already says. */
export function leadDek(game: ApiPrediction): string {
  const story = game.football_story ?? game.explanation_summary ?? game.primary_reason ?? '';
  return story.replace(/^Clark picks [A-Z]{2,3} with an? \d+% chance to win\.\s*/, '').trim();
}

export interface LeadStory {
  game: ApiPrediction;
  kicker: string;
  headline: string;
  dek: string;
  byline: string;
}

/** The lead: the week's top-billed game, upcoming games first. */
export function leadStory(games: ApiPrediction[], sentiment: SentimentMap): LeadStory | null {
  const open = games.filter((g) => !isFinal(g));
  const game = selectLeadGame(open.length ? open : games);
  if (!game) return null;

  const winner = nick(game.predicted_winner);
  const prob = pct(getPredictedProbability(game));
  const fan = getFanPick(game, sentiment);
  const vegas = getVegasPick(game);
  const window = getSlateWindow(game);

  let headline = `I'm on the ${winner} at ${prob}%.`;
  let byline = 'My top game this week';
  if (fan && fan.picks >= MIN_FAN_PICKS && fan.team !== game.predicted_winner) {
    headline = `Fans are on the ${nick(fan.team)}. I've got the ${winner} at ${prob}%.`;
    byline = 'My biggest disagreement with the fans this week';
  } else if (vegas && vegas.team !== game.predicted_winner) {
    headline = `The betting line likes the ${nick(vegas.team)}. I'm taking the ${winner} at ${prob}%.`;
    byline = "I'm going against the line here";
  } else if (isTossUp(game)) {
    headline = `${nick(game.away_team)} at ${nick(game.home_team)} is basically a coin flip. I lean ${winner}, ${prob}%.`;
    byline = 'The closest call on my board';
  }

  const dek = leadDek(game);
  const when = [window.label, game.stadium].filter(Boolean).join(' · ');
  return { game, kicker: `The Clark Report · ${window.label}`, headline, dek, byline: `${byline} · ${when}` };
}

export interface FeedItem {
  key: string;
  game: ApiPrediction;
  kicker: string;
  title: string;
  note: string;
}

function recapItem(g: ApiPrediction): FeedItem {
  const right = g.actual_winner === g.predicted_winner;
  const score = `${nick(g.away_team)} ${g.away_score ?? ''}, ${nick(g.home_team)} ${g.home_score ?? ''}`;
  return {
    key: `recap-${gameKey(g)}`,
    game: g,
    kicker: 'Recap',
    title: right ? `${score}: I called this one.` : `${score}: what I got wrong.`,
    note: `I had ${g.predicted_winner} ${pct(getPredictedProbability(g))}%.`,
  };
}

/** Up to `limit` short items under the lead: against the line, coin flips, recaps. */
export function moreItems(games: ApiPrediction[], lead: ApiPrediction | null, limit = 4): FeedItem[] {
  const leadKey = lead ? gameKey(lead) : '';
  const rest = games.filter((g) => gameKey(g) !== leadKey);
  const open = rest.filter((g) => !isFinal(g));
  const items: FeedItem[] = [];

  open.filter(isContrarian).forEach((g) => {
    const vegas = getVegasPick(g);
    items.push({
      key: `line-${gameKey(g)}`,
      game: g,
      kicker: 'Me vs the line',
      title: `I'm taking the ${nick(g.predicted_winner)} over the ${nick(loserOf(g))}, against the betting favorite.`,
      note: `Clark: ${g.predicted_winner} ${pct(getPredictedProbability(g))}%${vegas ? ` · Line: ${vegas.team} ${pct(vegas.prob)}%` : ''}`,
    });
  });
  open.filter((g) => isTossUp(g) && !isContrarian(g)).forEach((g) => {
    items.push({
      key: `flip-${gameKey(g)}`,
      game: g,
      kicker: 'Coin flip',
      title: `${nick(g.away_team)} at ${nick(g.home_team)}: I barely lean ${nick(g.predicted_winner)}.`,
      note: g.risk_factor ?? `Clark: ${g.predicted_winner} ${pct(getPredictedProbability(g))}%`,
    });
  });
  rest.filter((g) => isFinal(g) && g.actual_winner).forEach((g) => items.push(recapItem(g)));

  return items.slice(0, limit);
}

export interface InjuryItem {
  key: string;
  game: ApiPrediction;
  team: string;
  name: string;
  status: string;
  injury: string;
}

const STATUS_RANK: Record<string, number> = { Out: 0, Doubtful: 1, Questionable: 2 };

/** The week's injury notes on games still to play, worst status first. */
export function injuryItems(games: ApiPrediction[], limit = 5): InjuryItem[] {
  return games
    .filter((g) => !isFinal(g))
    .flatMap((g) => (g.injury_notes ?? []).map((n) => ({
      key: `${gameKey(g)}-${n.name}`,
      game: g,
      team: n.team,
      name: n.name,
      status: n.status,
      injury: n.injury,
    })))
    .sort((a, b) => (STATUS_RANK[a.status] ?? 9) - (STATUS_RANK[b.status] ?? 9))
    .slice(0, limit);
}

export interface Record3 {
  you: { w: number; l: number } | null;
  clark: { w: number; l: number };
  fans: { w: number; l: number } | null;
}

/** Season-to-date records on graded games: you (if you've picked), Clark, and fans (if they have). */
export function seasonRecords(games: ApiPrediction[], picks: PickMap, sentiment: SentimentMap): Record3 {
  const graded = games.filter((g) => isFinal(g) && g.actual_winner);
  const clark = { w: 0, l: 0 };
  const you = { w: 0, l: 0 };
  const fans = { w: 0, l: 0 };
  graded.forEach((g) => {
    if (g.predicted_winner === g.actual_winner) clark.w += 1; else clark.l += 1;
    const pick = picks[gameKey(g)];
    if (pick) { if (pick.team === g.actual_winner) you.w += 1; else you.l += 1; }
    const fan = getFanPick(g, sentiment);
    if (fan) { if (fan.team === g.actual_winner) fans.w += 1; else fans.l += 1; }
  });
  return {
    clark,
    you: you.w + you.l > 0 ? you : null,
    fans: fans.w + fans.l > 0 ? fans : null,
  };
}

export const formatWL = (r: { w: number; l: number } | null): string => (r ? `${r.w}–${r.l}` : '—');

/** Clark's line in the "Clark says" card: trash talk when he's ahead, credit when he's not. */
export function clarkQuip(records: Record3): string {
  const { clark, you } = records;
  if (clark.w + clark.l === 0) return "No games graded yet. I'm feeling good about my picks, though.";
  if (!you) return `I'm ${formatWL(clark)} so far. Make some picks and let's see who's better.`;
  if (clark.w > you.w) return `I'm ${formatWL(clark)}. You're ${formatWL(you)}. Just saying.`;
  if (clark.w < you.w) return `You're ${formatWL(you)} and I'm ${formatWL(clark)}. Okay, you're good. For now.`;
  return `We're tied at ${clark.w} wins each. This week settles it.`;
}
