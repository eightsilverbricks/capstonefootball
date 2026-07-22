import { describe, it, expect } from 'vitest';
import {
  hexToRgb,
  relativeLuminance,
  contrastRatio,
  pickLegibleTextColor,
  meetsContrastAA,
  withAlpha,
  scrimStrengthFor,
  legibleTeamTextColor,
  SURFACE_HEX,
} from './color';

describe('hexToRgb', () => {
  it('parses a standard 6-digit hex', () => {
    expect(hexToRgb('#97233F')).toEqual({ r: 0x97, g: 0x23, b: 0x3F });
  });

  it('parses a 3-digit shorthand hex', () => {
    expect(hexToRgb('#fff')).toEqual({ r: 255, g: 255, b: 255 });
  });

  it('degrades to mid-gray on a malformed input', () => {
    expect(hexToRgb('not-a-color')).toEqual({ r: 128, g: 128, b: 128 });
  });
});

describe('relativeLuminance', () => {
  it('black is 0 and white is 1', () => {
    expect(relativeLuminance('#000000')).toBeCloseTo(0, 5);
    expect(relativeLuminance('#ffffff')).toBeCloseTo(1, 5);
  });

  it('a light gold reads much brighter than a dark navy', () => {
    expect(relativeLuminance('#FFB612')).toBeGreaterThan(relativeLuminance('#00338D'));
  });
});

describe('contrastRatio', () => {
  it('black vs white is the maximum 21:1', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 0);
  });

  it('a color against itself is 1:1', () => {
    expect(contrastRatio('#97233F', '#97233F')).toBeCloseTo(1, 5);
  });
});

describe('pickLegibleTextColor', () => {
  it('picks light text on a dark navy background', () => {
    expect(pickLegibleTextColor('#00338D')).toBe('#ffffff');
  });

  it('picks dark text on a light gold background', () => {
    expect(pickLegibleTextColor('#FFB612')).toBe('#0a0a12');
  });
});

describe('meetsContrastAA', () => {
  it('white on near-black passes AA', () => {
    expect(meetsContrastAA('#ffffff', '#0a0a12')).toBe(true);
  });

  it('a mid-gray on a light gold fails AA', () => {
    expect(meetsContrastAA('#94a3b8', '#FFB612')).toBe(false);
  });
});

describe('withAlpha', () => {
  it('renders an rgba string with the given alpha', () => {
    expect(withAlpha('#97233F', 0.4)).toBe('rgba(151, 35, 63, 0.4)');
  });

  it('clamps out-of-range alpha into [0,1]', () => {
    expect(withAlpha('#000000', 5)).toBe('rgba(0, 0, 0, 1)');
    expect(withAlpha('#000000', -5)).toBe('rgba(0, 0, 0, 0)');
  });
});

describe('legibleTeamTextColor', () => {
  it('uses the team secondary when it already passes AA against the dark surface', () => {
    // ARI secondary is gold — plenty of contrast against the near-black surface.
    const ari = { primary: '#97233F', secondary: '#FFB612' };
    expect(legibleTeamTextColor(ari, SURFACE_HEX, 'var(--accent-gold)')).toBe('#FFB612');
  });

  it('falls back to primary when secondary is too dark for the surface (e.g. CIN black)', () => {
    const cin = { primary: '#FB4F14', secondary: '#000000' };
    const result = legibleTeamTextColor(cin, SURFACE_HEX, 'var(--accent-gold)');
    expect(result).not.toBe('#000000');
    expect(result).toBe('#FB4F14');
  });

  it('falls back to the caller-supplied color when neither team color passes AA', () => {
    const bothDark = { primary: '#101820', secondary: '#000000' };
    expect(legibleTeamTextColor(bothDark, SURFACE_HEX, '#ffffff')).toBe('#ffffff');
  });
});

describe('scrimStrengthFor', () => {
  it('needs no scrim behind an already-dark background', () => {
    expect(scrimStrengthFor('#0a0a12')).toBe(0);
  });

  it('needs a strong scrim behind a light gold background', () => {
    expect(scrimStrengthFor('#FFB612')).toBeGreaterThan(0.5);
  });

  it('never exceeds the 0.85 cap', () => {
    expect(scrimStrengthFor('#ffffff')).toBeLessThanOrEqual(0.85);
  });
});
