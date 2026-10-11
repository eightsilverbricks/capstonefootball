// ─── Big plays and plain-English notes ────────────────────────────────────────
// Deciding what counts as a big play needs no AI: the rules below are the
// spec in CLARK_OVERHAUL_PLAN.md §3. Every big play gets a template note; the
// optional free AI note (notes via Gemini in ai.ts) only ever replaces it.

import type { LivePlay } from './espnAdapter.ts';

/** A swing in home win probability this large is a big play on its own. */
export const WP_SWING = 0.08;
export const LONG_GAIN_YARDS = 25;

export type BigPlayReason =
  | 'touchdown' | 'field_goal' | 'turnover' | 'sack' | 'fourth_down'
  | 'long_gain' | 'win_prob_swing';

export interface PlayContext {
  home: string;
  away: string;
  /** Home win probability before and after the play, when ESPN has them. */
  wpBefore: number | null;
  wpAfter: number | null;
}

const lower = (s: string) => s.toLowerCase();
const isTouchdown = (p: LivePlay) => lower(p.type).includes('touchdown') || (p.scoring && /touchdown/i.test(p.text));
const isFieldGoalGood = (p: LivePlay) => lower(p.type).includes('field goal good');
const isInterception = (p: LivePlay) => lower(p.type).includes('interception');
const isFumbleLost = (p: LivePlay) => lower(p.type).includes('fumble recovery (opponent)');
const isSack = (p: LivePlay) => lower(p.type) === 'sack' || lower(p.type).startsWith('sack');
const isSpecialTeams = (p: LivePlay) => /punt|field goal|kickoff|extra point|timeout|end|two-minute|penalty/i.test(p.type);

export function bigPlayReason(p: LivePlay, ctx: PlayContext): BigPlayReason | null {
  if (isTouchdown(p)) return 'touchdown';
  if (isInterception(p) || isFumbleLost(p)) return 'turnover';
  if (isFieldGoalGood(p) && p.quarter >= 4 && clockSeconds(p.clock) <= 300) return 'field_goal';
  if (isSack(p) && (p.down ?? 0) >= 3) return 'sack';
  if (p.down === 4 && !isSpecialTeams(p)) return 'fourth_down';
  if (p.yards >= LONG_GAIN_YARDS && !isSpecialTeams(p)) return 'long_gain';
  if (ctx.wpBefore != null && ctx.wpAfter != null && Math.abs(ctx.wpAfter - ctx.wpBefore) >= WP_SWING) {
    return 'win_prob_swing';
  }
  return null;
}

export function clockSeconds(clock: string): number {
  const [m, s] = clock.split(':').map(Number);
  return Number.isFinite(m) && Number.isFinite(s) ? m * 60 + s : Number.POSITIVE_INFINITY;
}

function defenseOf(p: LivePlay, ctx: PlayContext): string | null {
  if (!p.offense) return null;
  return p.offense === ctx.home ? ctx.away : ctx.home;
}

/** "ATL lead 14–7" / "Tied 7–7", from the score after the play. */
export function scoreline(p: LivePlay, ctx: PlayContext): string {
  if (p.homeScore === p.awayScore) return `Tied ${p.homeScore}–${p.awayScore}`;
  const homeLeads = p.homeScore > p.awayScore;
  const [leader, hi, lo] = homeLeads
    ? [ctx.home, p.homeScore, p.awayScore]
    : [ctx.away, p.awayScore, p.homeScore];
  return `${leader} lead ${hi}–${lo}`;
}

function ordinal(n: number): string {
  return ['1st', '2nd', '3rd', '4th'][n - 1] ?? `${n}th`;
}

/** One plain-English sentence for a big play. Never empty for a big play. */
export function templateNote(p: LivePlay, reason: BigPlayReason, ctx: PlayContext): string {
  const team = p.offense ?? 'The offense';
  const defense = defenseOf(p, ctx) ?? 'The defense';
  switch (reason) {
    case 'touchdown':
      // On a defensive or return score, ESPN's offense is the team that lost the ball.
      if (isInterception(p) || /fumble|return/i.test(p.type)) {
        return `Defensive touchdown for ${defense}. ${scoreline(p, ctx)}.`;
      }
      return `Touchdown ${team}. ${scoreline(p, ctx)}.`;
    case 'field_goal':
      return `Late field goal for ${team}. ${scoreline(p, ctx)}.`;
    case 'turnover':
      return isInterception(p)
        ? `Interception. ${defense} take the ball back.`
        : `Fumble. ${defense} recover and take over.`;
    case 'sack':
      return `${defense} sack the quarterback on ${ordinal(p.down ?? 3)} down, likely ending the drive.`;
    case 'fourth_down': {
      const dist = p.distance != null ? ` & ${p.distance}` : '';
      const made = p.yards >= (p.distance ?? 1);
      return made
        ? `${team} go for it on 4th${dist} and convert.`
        : `${team} go for it on 4th${dist} and come up short. ${defense} take over.`;
    }
    case 'long_gain':
      return `${p.yards}-yard gain for ${team}.`;
    case 'win_prob_swing': {
      const after = Math.round((ctx.wpAfter ?? 0.5) * 100);
      const leader = after >= 50 ? ctx.home : ctx.away;
      const pct = after >= 50 ? after : 100 - after;
      return `A big swing: ${leader} are now ${pct}% to win.`;
    }
  }
}
