// ─── The three of us ──────────────────────────────────────────────────────────
// One record per founder, driving the bobbleheads on the landing page and the
// About page. Jersey team + number come straight off our actual jerseys, so the
// bobblehead colors are the real team colors from NFL_TEAM_COLORS.
//
// To swap the drawn SVG faces for real cutouts: drop transparent PNGs at
// public/founders/<id>.png and set `photo: true` below. The Bobblehead falls
// back to the drawn face automatically if the file 404s, so it's safe to flip
// the flag before the art exists.

export type HairStyle = 'spiky' | 'straight' | 'curly';

export interface Founder {
  id: string;
  name: string;
  firstName: string;
  /** NFL abbreviation — drives the jersey colors. */
  team: string;
  teamName: string;
  number: string;
  role: string;
  /** One fan-voice line shown under the bobblehead. */
  line: string;
  hair: HairStyle;
  hairColor: string;
  skin: string;
  /** Set true once public/founders/<id>.png exists. */
  photo?: boolean;
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
    hair: 'spiky',
    hairColor: '#141118',
    skin: '#e8b98f',
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
    hair: 'straight',
    hairColor: '#17131a',
    skin: '#eec39c',
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
    hair: 'curly',
    hairColor: '#3a2318',
    skin: '#e5b189',
  },
];

/**
 * Signature on the welcome note. Kept literal rather than derived from FOUNDERS
 * — the bobblehead row is ordered left-to-right by jersey, the signature is the
 * order we actually sign things in.
 */
export const FOUNDER_SIGNATURE = 'Zane, Nicholas, & Takuo';
