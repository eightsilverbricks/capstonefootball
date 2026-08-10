// ─── slate — the NFL week as fans actually experience it ─────────────────────
// A week isn't a ranked list, it's a sequence of viewing windows: Thursday
// night, the 1 o'clock games, the 4 o'clock games, Sunday night, Monday night.
// Every helper here is a pure read of fields the predictions feed already
// carries (`weekday`, `gametime`, `game_date`, `game_type`) — nothing is
// invented, and anything unparseable degrades to a labelled "Kickoff TBD"
// bucket rather than throwing or silently vanishing from the page.

import { ApiPrediction, getConfidenceScore } from '@/types/prediction';
import { gameKey, getVegasPick } from '@/lib/threeWaySignal';

export type SlateWindowId =
  | 'holiday'
  | 'thursdayNight'
  | 'friday'
  | 'saturday'
  | 'international'
  | 'sundayEarly'
  | 'sundayAfternoon'
  | 'sundayNight'
  | 'mondayNight'
  | 'unscheduled';

export interface SlateWindow {
  id: SlateWindowId;
  /** Section heading — how a fan actually refers to this block of games. */
  label: string;
  /** True for the marquee standalone windows, which get hero treatment. */
  primetime: boolean;
}

/** Hour of kickoff, or null when `gametime` is missing or malformed. */
export function parseKickoffHour(gametime?: string): number | null {
  if (!gametime) return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(gametime.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return hour;
}

/** '13:00' -> '1:00 PM ET'. Returns '' when the time can't be read. */
export function formatKickoff(gametime?: string): string {
  const hour = parseKickoffHour(gametime);
  if (hour === null) return '';
  const minute = gametime!.trim().split(':')[1];
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display}:${minute} ${suffix} ET`;
}

/**
 * The holiday a game is played on, when it lands on one. The NFL's holiday
 * slates are the week's built-in event games, so they're worth naming rather
 * than flattening into "Thursday Afternoon".
 */
function holidayName(gameDate?: string): string | null {
  if (!gameDate) return null;
  const match = /^\d{4}-(\d{2})-(\d{2})$/.exec(gameDate.trim());
  if (!match) return null;
  const month = Number(match[1]);
  const day = Number(match[2]);

  if (month === 12 && day === 25) return 'Christmas Day';
  if (month === 1 && day === 1) return "New Year's Day";
  // US Thanksgiving is always the fourth Thursday of November.
  if (month === 11 && day >= 22 && day <= 28) return 'Thanksgiving Day';
  return null;
}

const UNSCHEDULED: SlateWindow = { id: 'unscheduled', label: 'Kickoff TBD', primetime: false };

/**
 * Which viewing window a game belongs to. Holiday games win over the weekday
 * rules — nobody calls the Thanksgiving noon game "the Thursday afternoon
 * game".
 */
export function getSlateWindow(game: ApiPrediction): SlateWindow {
  const weekday = (game.weekday ?? '').trim().toLowerCase();
  const hour = parseKickoffHour(game.gametime);

  const holiday = holidayName(game.game_date);
  // A holiday game in a normal primetime slot is still just that night's game.
  if (holiday && !(weekday === 'thursday' && hour !== null && hour >= 19)) {
    return { id: 'holiday', label: holiday, primetime: true };
  }

  if (!weekday || hour === null) return UNSCHEDULED;

  switch (weekday) {
    case 'thursday':
      return hour >= 19
        ? { id: 'thursdayNight', label: 'Thursday Night', primetime: true }
        : { id: 'holiday', label: 'Thursday Afternoon', primetime: false };
    case 'friday':
      return { id: 'friday', label: 'Friday', primetime: false };
    case 'saturday':
      return { id: 'saturday', label: 'Saturday', primetime: false };
    case 'monday':
      return { id: 'mondayNight', label: 'Monday Night', primetime: true };
    case 'sunday':
      if (hour < 12) return { id: 'international', label: 'International Kickoff', primetime: false };
      if (hour < 15) return { id: 'sundayEarly', label: 'Sunday Early', primetime: false };
      if (hour < 18) return { id: 'sundayAfternoon', label: 'Sunday Afternoon', primetime: false };
      return { id: 'sundayNight', label: 'Sunday Night', primetime: true };
    default:
      return UNSCHEDULED;
  }
}

/**
 * Lexicographically sortable kickoff stamp. Deliberately a string rather than
 * a Date: the feed's times are Eastern wall-clock, so constructing a Date
 * would reinterpret them in the viewer's zone and reorder the slate for
 * anyone outside ET. Unscheduled games sort last.
 */
export function kickoffSortKey(game: ApiPrediction): string {
  const date = game.game_date?.trim() || '9999-12-31';
  const time = parseKickoffHour(game.gametime) === null ? '99:99' : game.gametime!.trim();
  return `${date}T${time}`;
}

// ── Billing ──────────────────────────────────────────────────────────────────
// Which game leads the page. Weighted toward the things that actually make a
// matchup worth someone's attention — the round, the timeslot, and whether
// Clark is picking against the market — rather than raw model confidence,
// which surfaces blowouts nobody wants to read about.

const ROUND_WEIGHT: Record<string, number> = {
  SB: 100,
  CON: 80,
  DIV: 62,
  WC: 46,
};

const WINDOW_WEIGHT: Partial<Record<SlateWindowId, number>> = {
  sundayNight: 26,
  mondayNight: 22,
  thursdayNight: 18,
  holiday: 24,
  international: 8,
};

const CONTRARIAN_WEIGHT = 30;
const TOSS_UP_WEIGHT = 12;
const TOSS_UP_THRESHOLD = 0.06;

/** True when Clark's pick disagrees with the market's favorite. */
export function isContrarian(game: ApiPrediction): boolean {
  const vegas = getVegasPick(game);
  return vegas !== null && vegas.team !== game.predicted_winner;
}

/** True when the model sees the game as close to a coin flip. */
export function isTossUp(game: ApiPrediction): boolean {
  return getConfidenceScore(game) < TOSS_UP_THRESHOLD;
}

/** How much of the page a game has earned. Higher leads. */
export function billingScore(game: ApiPrediction): number {
  const round = ROUND_WEIGHT[(game.game_type ?? '').toUpperCase()] ?? 0;
  const window = WINDOW_WEIGHT[getSlateWindow(game).id] ?? 0;
  const contrarian = isContrarian(game) ? CONTRARIAN_WEIGHT : 0;
  const tossUp = isTossUp(game) ? TOSS_UP_WEIGHT : 0;
  return round + window + contrarian + tossUp;
}

/**
 * Why this game is leading the page, in the site's voice. Null when it simply
 * outranked the rest without a single headline reason — the hero then falls
 * back to the game's own story.
 */
export function billingReason(game: ApiPrediction): string | null {
  const round = (game.game_type ?? '').toUpperCase();
  if (round === 'SB') return 'The Super Bowl';
  if (round === 'CON') return 'Conference Championship';
  if (round === 'DIV') return 'Divisional Round';
  if (round === 'WC') return 'Wild Card Weekend';

  if (isContrarian(game)) return 'Clark is picking against the market';
  if (isTossUp(game)) return "The closest call on the board";

  const window = getSlateWindow(game);
  if (window.primetime) return `${window.label} headliner`;
  return null;
}

/**
 * The week's lead game. Ties break on kickoff then game key so the same slate
 * always produces the same hero — a lead that reshuffles between renders reads
 * as a bug.
 */
export function selectLeadGame(games: ApiPrediction[]): ApiPrediction | null {
  if (games.length === 0) return null;
  return [...games].sort(compareByBilling)[0];
}

function compareByBilling(a: ApiPrediction, b: ApiPrediction): number {
  const byScore = billingScore(b) - billingScore(a);
  if (byScore !== 0) return byScore;
  const byKickoff = kickoffSortKey(a).localeCompare(kickoffSortKey(b));
  if (byKickoff !== 0) return byKickoff;
  return gameKey(a).localeCompare(gameKey(b));
}

// ── Grouping ─────────────────────────────────────────────────────────────────

export interface SlateGroup {
  window: SlateWindow;
  /** Shared kickoff time when every game starts together, else ''. */
  kickoff: string;
  games: ApiPrediction[];
}

/**
 * The week split into its viewing windows, in the order they're played.
 * Windows are ordered by their earliest kickoff rather than a hardcoded
 * sequence, so an unusual week (a Wednesday holiday game, a Friday opener)
 * still reads chronologically.
 */
export function groupBySlate(games: ApiPrediction[]): SlateGroup[] {
  const buckets = new Map<SlateWindowId, { window: SlateWindow; games: ApiPrediction[] }>();

  for (const game of games) {
    const window = getSlateWindow(game);
    const existing = buckets.get(window.id);
    if (existing) {
      existing.games.push(game);
    } else {
      buckets.set(window.id, { window, games: [game] });
    }
  }

  return [...buckets.values()]
    .map(({ window, games: bucketGames }) => {
      const ordered = [...bucketGames].sort(compareByBilling);
      const times = new Set(ordered.map((g) => g.gametime ?? ''));
      return {
        window,
        kickoff: times.size === 1 ? formatKickoff(ordered[0].gametime) : '',
        games: ordered,
      };
    })
    .sort((a, b) => earliestKickoff(a.games).localeCompare(earliestKickoff(b.games)));
}

function earliestKickoff(games: ApiPrediction[]): string {
  return games.reduce((min, game) => {
    const key = kickoffSortKey(game);
    return key < min ? key : min;
  }, kickoffSortKey(games[0]));
}
