// ─── color — WCAG luminance/contrast helpers for the game-page banner ─────────
// Several team primaries/secondaries are light (ARI gold, GB gold, MIN gold,
// etc.). When the banner tints itself toward the home team's color, text laid
// over that tint must stay legible in the dark theme. These helpers pick a
// legible on-color and expose a contrast ratio so callers can decide whether
// to add a scrim before rendering text. Pure — no DOM, no React.

export interface RGB {
  r: number;
  g: number;
  b: number;
}

/** '#97233F' or '97233F' -> {r,g,b}. Falls back to mid-gray on a bad input. */
export function hexToRgb(hex: string): RGB {
  const clean = hex.replace('#', '');
  const full = clean.length === 3
    ? clean.split('').map((c) => c + c).join('')
    : clean;
  const num = parseInt(full, 16);
  if (full.length !== 6 || Number.isNaN(num)) {
    return { r: 128, g: 128, b: 128 };
  }
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function channelLuminance(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

/** WCAG relative luminance, 0 (black) to 1 (white). */
export function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  return 0.2126 * channelLuminance(r) + 0.7152 * channelLuminance(g) + 0.0722 * channelLuminance(b);
}

/** WCAG contrast ratio between two colors, 1 (none) to 21 (max). */
export function contrastRatio(hexA: string, hexB: string): number {
  const lA = relativeLuminance(hexA) + 0.05;
  const lB = relativeLuminance(hexB) + 0.05;
  return lA > lB ? lA / lB : lB / lA;
}

/**
 * Picks whichever of white or near-black gives better contrast against a
 * background — the safe on-color for text sitting over an arbitrary team tint.
 */
export function pickLegibleTextColor(bgHex: string, dark = '#0a0a12', light = '#ffffff'): string {
  return contrastRatio(bgHex, light) >= contrastRatio(bgHex, dark) ? light : dark;
}

/** True when text-on-background meets the WCAG AA body-text threshold (4.5:1). */
export function meetsContrastAA(fgHex: string, bgHex: string): boolean {
  return contrastRatio(fgHex, bgHex) >= 4.5;
}

/** '#97233F' + 0.4 -> 'rgba(151,35,63,0.4)' — for scrims and tinted overlays. */
export function withAlpha(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  const clamped = Math.min(1, Math.max(0, alpha));
  return `rgba(${r}, ${g}, ${b}, ${clamped})`;
}

/**
 * The dark theme's flat surface color (see styles/tokens.css --surface).
 * Several teams' secondary colors (ATL/CIN black, CAR near-black, DEN navy,
 * BUF/NE/HOU/NYG dark red, CHI dark orange) fail WCAG AA as text directly on
 * this background — this constant lets callers check against the real value
 * instead of guessing.
 */
export const SURFACE_HEX = '#111113';

/**
 * Picks the most team-flavored color that still reads legibly as text on
 * `bgHex`: team secondary first, then primary, then a caller-supplied
 * fallback (e.g. the design system's gold accent). Guards against exactly the
 * "light-on-light" (or here, dark-on-dark) failure the plan's C2 calls out —
 * never renders a team color that would be illegible.
 */
export function legibleTeamTextColor(
  colors: { primary: string; secondary: string },
  bgHex: string,
  fallback: string,
): string {
  if (meetsContrastAA(colors.secondary, bgHex)) return colors.secondary;
  if (meetsContrastAA(colors.primary, bgHex)) return colors.primary;
  return fallback;
}

/**
 * How strong a dark scrim needs to be behind light text over this background
 * to reach AA contrast. Returns 0 when no scrim is needed at all (the
 * background is already dark enough), scaling up to 0.85 for very light
 * backgrounds (e.g. ARI/GB/MIN gold), so the banner never renders light text
 * on a light tint.
 */
export function scrimStrengthFor(bgHex: string): number {
  const lum = relativeLuminance(bgHex);
  if (lum <= 0.18) return 0;
  return Math.min(0.85, 0.35 + lum * 0.6);
}
