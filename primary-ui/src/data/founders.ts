// ─── The three of us ──────────────────────────────────────────────────────────
// One record per founder, driving the labels under the group photo on the
// landing page and About page. Jersey team + number come straight off our
// actual jerseys.
//
// `photoXPercent` is where each of us sits, horizontally, in
// public/founders/group.jpg (0–100, left edge to right edge) — it's what lets
// FoundersPortrait anchor each name label under the right face in a single
// flat image instead of three separate cutouts. Recompute these if the source
// photo is ever swapped for a different composition.

export interface Founder {
  id: string;
  name: string;
  firstName: string;
  /** NFL abbreviation — drives the label color. */
  team: string;
  teamName: string;
  number: string;
  role: string;
  /** One fan-voice line shown under the name. */
  line: string;
  /** Horizontal center of this person's face in group.jpg, as a 0–100 percent. */
  photoXPercent: number;
}

export const FOUNDERS: Founder[] = [
  {
    id: 'takuo',
    name: 'Takuo Yamamoto',
    firstName: 'Takuo',
    team: 'SEA',
    teamName: 'Seahawks',
    number: '11',
    role: 'Co-founder',
    line: 'Loud on Sundays. Louder about the numbers.',
    photoXPercent: 16.9,
  },
  {
    id: 'nicholas',
    name: 'Nicholas Chan',
    firstName: 'Nicholas',
    team: 'NYG',
    teamName: 'Giants',
    number: '6',
    role: 'Co-founder',
    line: 'Believes in the Giants. Every single year.',
    photoXPercent: 48.2,
  },
  {
    id: 'zane',
    name: 'Zane Wolf',
    firstName: 'Zane',
    team: 'BUF',
    teamName: 'Bills',
    number: '17',
    role: 'Co-founder',
    line: 'Bills Mafia — table included.',
    photoXPercent: 81.3,
  },
];

/**
 * Signature on the welcome note. Kept literal rather than derived from FOUNDERS
 * — the group photo is ordered left-to-right by jersey, the signature is the
 * order we actually sign things in.
 */
export const FOUNDER_SIGNATURE = 'Zane, Nicholas, & Takuo';
