// ─── ESPN adapter ─────────────────────────────────────────────────────────────
// Every ESPN-specific detail lives in this file. ESPN's site API is public but
// unofficial; if it changes shape, this is the only file that should need to.
// Pure functions only — no fetch, no Deno — so it runs under node:test too.

export const SCOREBOARD_URL =
  'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard';
export const SUMMARY_URL =
  'https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event=';

/** ESPN abbreviations that differ from nflverse's (which our game keys use). */
const ESPN_TO_NFLVERSE: Record<string, string> = { WSH: 'WAS', LAR: 'LA' };

export function nflverseAbbr(espn: string): string {
  return ESPN_TO_NFLVERSE[espn] ?? espn;
}

export type GameState = 'pre' | 'in' | 'post';

export interface LiveEvent {
  eventId: string;
  /** Same key the site uses for picks: nflverse game_id, e.g. 2026_04_ATL_NO. */
  gameKey: string;
  season: number;
  week: number;
  home: string;
  away: string;
  state: GameState;
  completed: boolean;
  startTime: string;
  quarter: number | null;
  clock: string | null;
  homeScore: number;
  awayScore: number;
  /** nflverse abbreviation of the team with the ball, when ESPN reports it. */
  possession: string | null;
  /** Current down and distance (null between plays or outside a live game). */
  down: number | null;
  distance: number | null;
  /** ESPN's field position text, e.g. "KC 35". */
  yardLine: string | null;
  /** Ball spot in yards from the home goal line (0–100). */
  ballOn: number | null;
  redZone: boolean;
  homeTimeouts: number | null;
  awayTimeouts: number | null;
  /** Text of the latest play, straight from the scoreboard. */
  lastPlay: string | null;
  /** ESPN team id → nflverse abbreviation, for resolving play.start.team.id. */
  teamsById: Record<string, string>;
}

export interface LivePlay {
  playId: string;
  seq: number;
  quarter: number;
  clock: string;
  type: string;
  text: string;
  yards: number;
  scoring: boolean;
  homeScore: number;
  awayScore: number;
  /** nflverse abbreviation of the offense on this snap, if known. */
  offense: string | null;
  down: number | null;
  distance: number | null;
  /** ESPN drive id, so the client can collapse routine plays per drive. */
  driveId: string | null;
  /** Ball spot before and after the snap, yards from the home goal line. */
  startYard: number | null;
  endYard: number | null;
}

export function gameKeyFor(season: number, week: number, away: string, home: string): string {
  return `${season}_${String(week).padStart(2, '0')}_${away}_${home}`;
}

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

function numOrNull(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function cleanText(v: unknown): string | null {
  const t = typeof v === 'string' ? v.trim() : '';
  return t ? t : null;
}

export function parseScoreboard(board: Json): LiveEvent[] {
  const season = Number(board?.season?.year ?? 0);
  const week = Number(board?.week?.number ?? 0);
  const events: LiveEvent[] = [];

  for (const event of board?.events ?? []) {
    const comp = event?.competitions?.[0];
    if (!comp) continue;
    const sides: Record<string, Json> = {};
    const teamsById: Record<string, string> = {};
    for (const c of comp.competitors ?? []) {
      sides[c.homeAway] = c;
      teamsById[String(c.team?.id)] = nflverseAbbr(c.team?.abbreviation ?? '');
    }
    if (!sides.home || !sides.away) continue;

    const home = nflverseAbbr(sides.home.team.abbreviation);
    const away = nflverseAbbr(sides.away.team.abbreviation);
    const status = comp.status ?? event.status ?? {};
    const state = (status.type?.state ?? 'pre') as GameState;
    const possessionId = comp.situation?.possession;
    const eventSeason = Number(event.season?.year ?? season);
    const eventWeek = Number(event.week?.number ?? week);

    events.push({
      eventId: String(event.id),
      gameKey: gameKeyFor(eventSeason, eventWeek, away, home),
      season: eventSeason,
      week: eventWeek,
      home,
      away,
      state,
      completed: Boolean(status.type?.completed),
      startTime: String(event.date ?? comp.date ?? ''),
      quarter: state === 'pre' ? null : Number(status.period ?? 0) || null,
      clock: state === 'in' ? String(status.displayClock ?? '') : null,
      homeScore: Number(sides.home.score ?? 0),
      awayScore: Number(sides.away.score ?? 0),
      possession: possessionId ? teamsById[String(possessionId)] ?? null : null,
      down: state === 'in' && Number(comp.situation?.down) > 0 ? Number(comp.situation.down) : null,
      distance: state === 'in' && comp.situation?.distance != null ? Number(comp.situation.distance) : null,
      yardLine: state === 'in' ? (comp.situation?.possessionText ?? null) : null,
      ballOn: state === 'in' ? numOrNull(comp.situation?.yardLine) : null,
      redZone: state === 'in' && Boolean(comp.situation?.isRedZone),
      homeTimeouts: state === 'in' ? numOrNull(comp.situation?.homeTimeouts) : null,
      awayTimeouts: state === 'in' ? numOrNull(comp.situation?.awayTimeouts) : null,
      lastPlay: state === 'in' ? cleanText(comp.situation?.lastPlay?.text) : null,
      teamsById,
    });
  }
  return events;
}

/** Every play in the game so far, oldest first, from drives.previous + current. */
export function parsePlays(summary: Json, teamsById: Record<string, string>): LivePlay[] {
  const drives: Json[] = [
    ...(summary?.drives?.previous ?? []),
    ...(summary?.drives?.current ? [summary.drives.current] : []),
  ];
  const seen = new Set<string>();
  const plays: LivePlay[] = [];

  drives.forEach((drive, driveIndex) => {
    for (const p of drive?.plays ?? []) {
      const playId = String(p?.id ?? '');
      if (!playId || seen.has(playId)) continue;
      seen.add(playId);
      const offenseId = p.start?.team?.id ?? drive.team?.id;
      plays.push({
        playId,
        seq: Number(p.sequenceNumber ?? plays.length),
        quarter: Number(p.period?.number ?? 0),
        clock: String(p.clock?.displayValue ?? ''),
        type: String(p.type?.text ?? ''),
        text: String(p.text ?? ''),
        yards: Number(p.statYardage ?? 0),
        scoring: Boolean(p.scoringPlay),
        homeScore: Number(p.homeScore ?? 0),
        awayScore: Number(p.awayScore ?? 0),
        offense: offenseId != null ? teamsById[String(offenseId)] ?? null : null,
        down: p.start?.down ? Number(p.start.down) : null,
        distance: p.start?.distance != null ? Number(p.start.distance) : null,
        driveId: drive?.id != null ? String(drive.id) : `d${driveIndex}`,
        startYard: numOrNull(p.start?.yardLine),
        endYard: numOrNull(p.end?.yardLine),
      });
    }
  });
  return plays.sort((a, b) => a.seq - b.seq);
}

/** playId → home win probability (0–1) after that play. */
export function parseWinProbability(summary: Json): Record<string, number> {
  const out: Record<string, number> = {};
  for (const row of summary?.winprobability ?? []) {
    if (row?.playId != null && typeof row.homeWinPercentage === 'number') {
      out[String(row.playId)] = row.homeWinPercentage;
    }
  }
  return out;
}

// ─── Drives and box score ────────────────────────────────────────────────────

export interface DriveSummary {
  id: string;
  /** nflverse abbreviation of the offense. */
  team: string | null;
  /** "8 plays, 75 yards, 4:12". */
  description: string;
  /** "Touchdown", "Punt", … null while the drive is going. */
  result: string | null;
  /** Where it started, e.g. "SEA 29". */
  start: string | null;
  plays: number;
  yards: number;
  scoring: boolean;
}

/** Every drive so far, oldest first, the current one last. */
export function parseDrives(summary: Json): DriveSummary[] {
  const drives: Json[] = [
    ...(summary?.drives?.previous ?? []),
    ...(summary?.drives?.current ? [summary.drives.current] : []),
  ];
  const seen = new Set<string>();
  const out: DriveSummary[] = [];
  for (const d of drives) {
    const id = d?.id != null ? String(d.id) : '';
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const abbr = d.team?.abbreviation;
    out.push({
      id,
      team: abbr ? nflverseAbbr(String(abbr)) : null,
      description: String(d.description ?? ''),
      result: cleanText(d.displayResult) ?? cleanText(d.result),
      start: cleanText(d.start?.text),
      plays: Number(d.offensivePlays ?? 0),
      yards: Number(d.yards ?? 0),
      scoring: Boolean(d.isScore),
    });
  }
  return out;
}

/** The team stats the Live tab compares, keyed by our name → ESPN's. */
const TEAM_STATS: Record<string, string> = {
  total_yards: 'totalYards',
  passing: 'netPassingYards',
  rushing: 'rushingYards',
  first_downs: 'firstDowns',
  third_down: 'thirdDownEff',
  fourth_down: 'fourthDownEff',
  red_zone: 'redZoneAttempts',
  plays: 'totalOffensivePlays',
  ypp: 'yardsPerPlay',
  comp_att: 'completionAttempts',
  sacks: 'sacksYardsLost',
  penalties: 'totalPenaltiesYards',
  turnovers: 'turnovers',
  possession: 'possessionTime',
};

export interface Leader { id: string; name: string; line: string }
export interface BoxScore {
  teams: Record<string, Record<string, string>>;
  leaders: Record<string, Partial<Record<'passing' | 'rushing' | 'receiving', Leader>>>;
}

function statAt(labels: string[], stats: string[], label: string): string | null {
  const i = labels.indexOf(label);
  return i >= 0 && stats[i] != null ? String(stats[i]) : null;
}

function leaderLine(kind: string, labels: string[], stats: string[]): string {
  const td = statAt(labels, stats, 'TD');
  const tdPart = td && td !== '0' ? `, ${td} TD` : '';
  if (kind === 'passing') {
    const int = statAt(labels, stats, 'INT');
    return `${statAt(labels, stats, 'C/ATT') ?? '-'}, ${statAt(labels, stats, 'YDS') ?? 0} yds${tdPart}${int && int !== '0' ? `, ${int} INT` : ''}`;
  }
  if (kind === 'rushing') return `${statAt(labels, stats, 'CAR') ?? 0} car, ${statAt(labels, stats, 'YDS') ?? 0} yds${tdPart}`;
  return `${statAt(labels, stats, 'REC') ?? 0} rec, ${statAt(labels, stats, 'YDS') ?? 0} yds${tdPart}`;
}

/** Both teams' box score plus each side's passing, rushing and receiving leader. */
export function parseBox(summary: Json): BoxScore | null {
  const box = summary?.boxscore;
  if (!box?.teams?.length) return null;
  const out: BoxScore = { teams: {}, leaders: {} };
  for (const t of box.teams) {
    const abbr = nflverseAbbr(String(t.team?.abbreviation ?? ''));
    if (!abbr) continue;
    const byName: Record<string, string> = {};
    for (const s of t.statistics ?? []) {
      if (s?.name && byName[s.name] == null) byName[s.name] = String(s.displayValue ?? '').trim();
    }
    out.teams[abbr] = Object.fromEntries(
      Object.entries(TEAM_STATS).map(([ours, espn]) => [ours, byName[espn] ?? '']),
    );
  }
  for (const p of box.players ?? []) {
    const abbr = nflverseAbbr(String(p.team?.abbreviation ?? ''));
    if (!abbr) continue;
    const mine: BoxScore['leaders'][string] = {};
    for (const cat of p.statistics ?? []) {
      if (!['passing', 'rushing', 'receiving'].includes(cat?.name)) continue;
      const top = cat.athletes?.[0];
      if (!top?.athlete?.displayName) continue;
      mine[cat.name as 'passing' | 'rushing' | 'receiving'] = {
        id: String(top.athlete.id ?? ''),
        name: String(top.athlete.displayName),
        line: leaderLine(cat.name, cat.labels ?? [], top.stats ?? []),
      };
    }
    out.leaders[abbr] = mine;
  }
  return out;
}
