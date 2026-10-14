// ─── Clark's voice outside the report (§15: templates, no AI) ────────────────
// Explain-this-play glossary, Clark reacting in chat, Ask Clark answered from
// the report, and Clark's confession when he gets one wrong.

import type { ApiPrediction } from '@/types/prediction';
import type { LivePlay } from '@/data/liveRepository';
import { getTeam } from '@/data/teams';

const nick = (t: string) => getTeam(t)?.name ?? t;
const pct = (p: number) => Math.round(p * 100);

const GLOSSARY: [RegExp, string][] = [
  [/touchdown/i, 'A touchdown is 6 points: the ball crossed the goal line. The kick after is worth 1 more, or a team can try a 2-point play from the 2-yard line.'],
  [/two-point|2pt/i, 'A two-point try: instead of kicking for 1, the offense runs one play from the 2-yard line. Get in and it counts 2.'],
  [/field goal good|field goal/i, 'A field goal is 3 points, kicked through the uprights. Teams usually try one on 4th down when they are close enough but short of a first down.'],
  [/extra point/i, 'The extra point is a short kick after a touchdown, worth 1 point.'],
  [/interception/i, 'An interception: a defender caught a pass meant for the offense, so the defense takes the ball.'],
  [/fumble/i, "A fumble: the ball carrier lost the ball. Whoever recovers it gets possession, so it's a turnover if the defense grabs it."],
  [/sack/i, 'A sack: the defense tackled the quarterback behind the line before he could throw. The offense loses yards and a down.'],
  [/safety/i, 'A safety is 2 points for the defense: the offense was tackled in its own end zone. They also have to kick the ball away.'],
  [/punt/i, 'A punt: on 4th down the offense kicks the ball away to push the other team back instead of risking a turnover on downs.'],
  [/kickoff/i, 'A kickoff starts each half and follows every score.'],
  [/holding/i, "Holding: a blocker grabbed a defender to stop him. It's 10 yards against the offense, and the most common penalty in football."],
  [/false start/i, 'False start: an offensive player moved before the snap. 5 yards back.'],
  [/pass interference/i, 'Pass interference: a defender (or receiver) made illegal contact while the ball was in the air. On defense, the ball goes to the spot of the foul.'],
  [/offside|neutral zone/i, 'Offside: a defender was across the line when the ball was snapped. 5 yards for the offense.'],
  [/roughing/i, 'Roughing the passer: a late or illegal hit on the quarterback. 15 yards and an automatic first down.'],
  [/penalty/i, 'A penalty: a flag for breaking a rule. The team that fouled loses yards, and some fouls also give a first down.'],
  [/timeout/i, 'Each team gets 3 timeouts a half to stop the clock.'],
  [/pass/i, 'A pass play: the quarterback throws. Incomplete passes stop the clock.'],
  [/rush|run/i, 'A running play: someone carries the ball instead of throwing it. The clock keeps running if they stay in bounds.'],
];

/** Plain-English explanation of a play, by its type and text. */
export function explainPlay(play: Pick<LivePlay, 'play_type' | 'text'>): string {
  const hay = `${play.play_type} ${play.text}`;
  return GLOSSARY.find(([re]) => re.test(hay))?.[1] ?? 'A regular play. Tap a big play for what it meant for the game.';
}

/** Clark reacting to a big play, in chat. Positive when it helps his pick. */
export function clarkChatLine(play: LivePlay, game: Pick<ApiPrediction, 'predicted_winner' | 'home_team' | 'away_team'>): string {
  const pick = game.predicted_winner;
  const pickScore = pick === game.home_team ? play.home_score : play.away_score;
  const otherScore = pick === game.home_team ? play.away_score : play.home_score;
  const helps = play.offense === pick
    ? !/interception|fumble|sack/i.test(play.play_type)
    : /interception|fumble|sack/i.test(play.play_type);
  if (helps && pickScore > otherScore) return `That's what I was talking about. ${nick(pick)} up ${pickScore}–${otherScore}. 📈`;
  if (helps) return `Okay, there it is. That's the ${nick(pick)} I picked. Still work to do.`;
  if (pickScore < otherScore) return `Not great for my pick. ${nick(pick)} down ${otherScore}–${pickScore}. I'm sweating. 😬`;
  return `Hm. That one hurts my ${nick(pick)} pick. Not panicking. Yet.`;
}

export interface AskItem { q: string; a: string }

/** Suggested questions, answered straight from the report (no AI). */
export function askClark(game: ApiPrediction): AskItem[] {
  const r = game.clark_report;
  if (!r) return [];
  const other = game.predicted_winner === game.home_team ? game.away_team : game.home_team;
  const items: AskItem[] = [
    { q: `Why the ${nick(game.predicted_winner)}?`, a: [r.intro[1] ?? r.intro[0], r.dek].filter(Boolean).join(' ') },
    { q: `How do the ${nick(other)} win?`, a: r.underdog.items.map((i) => `${i.lead} ${i.text}`).join(' ') },
    { q: 'What would change your mind?', a: r.change_my_mind.join(' ') },
    { q: `What does ${r.meaning.pct}% mean?`, a: r.meaning.body },
  ];
  if (r.line) items.push({ q: 'Do you agree with the betting line?', a: r.line.body });
  if (r.injuries) items.push({ q: 'Who is hurt?', a: r.injuries.body });
  return items;
}

/** Clark owning a miss, for the home feed and recap. Null when he got it right. */
export function confession(game: ApiPrediction): string | null {
  if (!game.actual_winner || game.actual_winner === game.predicted_winner) return null;
  const prob = game.predicted_winner === game.home_team ? game.home_win_prob : game.away_win_prob;
  const score = `${game.away_team} ${game.away_score}–${game.home_score} ${game.home_team}`;
  const lesson = pct(prob) >= 70
    ? "That's a big miss at that confidence, and I'm going back through the numbers."
    : 'Close games go the other way sometimes. This was one of them.';
  return `I had the ${nick(game.predicted_winner)} at ${pct(prob)}%. Final: ${score}. I was wrong. ${lesson}`;
}
