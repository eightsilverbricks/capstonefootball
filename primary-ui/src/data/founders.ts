// ─── The three of us ──────────────────────────────────────────────────────────
// One record per founder, driving the bobbleheads on the landing page and the
// About page. Jersey team + number come straight off our actual jerseys, so the
// bobblehead colors are the real team colors from NFL_TEAM_COLORS.
//
// Faces are real cutouts from the original commissioned artwork (the group
// photo used everywhere else in the brand), cropped per-founder into
// public/founders/<id>.png — see that folder's crop script in git history if
// the source frame ever needs re-cropping. `photo: true` below is what tells
// Bobblehead to use the cutout instead of the drawn SVG face; it falls back to
// the drawn face automatically if the file 404s.

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
    photo: true,
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
    photo: true,
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
    photo: true,
  },
];

/**
 * Signature on the welcome note. Kept literal rather than derived from FOUNDERS
 * — the bobblehead row is ordered left-to-right by jersey, the signature is the
 * order we actually sign things in.
 */
export const FOUNDER_SIGNATURE = 'Zane, Nicholas, & Takuo';
