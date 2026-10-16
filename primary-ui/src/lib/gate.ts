/**
 * The sign-in wall, as data. Signed out, people get the scoreboard (teams,
 * kickoffs, scores) plus the pitch; everything Clark thinks, and everything
 * built on an account, sits behind a free sign-up.
 *
 * This is a UI gate only — predictions.json and the public-read tables are
 * still reachable by anyone who goes looking.
 */

export type GateFeature =
  | 'clark-pick'
  | 'game'
  | 'team'
  | 'roster'
  | 'player'
  | 'leaderboard'
  | 'my-season';

export interface GateCopy {
  /** Clark's line on the wall, in his voice. */
  quote: string;
  /** What the account unlocks, plainly. */
  detail: string;
}

export const GATE_COPY: Record<GateFeature, GateCopy> = {
  'clark-pick': {
    quote: "My picks are for members. It's free, and I don't sell your data.",
    detail: "Create an account to see who I'm taking in every game, and how sure I am.",
  },
  game: {
    quote: "The full breakdown is for members. Free account, thirty seconds.",
    detail: "Get my pick and the Clark Report, live win odds, the play-by-play, game chat and Ask Clark.",
  },
  team: {
    quote: "Team pages are for members. Free account, no betting.",
    detail: "Get my outlook for the rest of the season, key players, injuries and every game I've picked for this team.",
  },
  roster: {
    quote: "Depth charts are for members. Free account, no betting.",
    detail: "See the starters drawn on a field, what each position does, and who's on the injury report.",
  },
  player: {
    quote: "Player pages are for members. Free account, no betting.",
    detail: "Get this season's numbers, the last five games and injury status for every starter.",
  },
  leaderboard: {
    quote: "Sign up and you're on the board. Can you beat me?",
    detail: "See who's leading this week and this season, how every fanbase is doing, and where you'd rank.",
  },
  'my-season': {
    quote: "Your season lives in your account. Make one and I'll keep score.",
    detail: "Track every pick you make, your record against mine, and how you do by team and by week.",
  },
};

export interface GateView extends GateCopy {
  locked: boolean;
  feature: GateFeature;
}

/** Whether a feature is locked for this visitor, and what the wall says. */
export function gateView(feature: GateFeature, isSignedIn: boolean): GateView {
  return { feature, locked: !isSignedIn, ...GATE_COPY[feature] };
}
