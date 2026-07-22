import { describe, it, expect } from 'vitest';
import { getShareLine } from './shareCard';
import type { Pick } from '@/competition/types';
import type { TeamPick } from '@/lib/threeWaySignal';

const pick = (overrides: Partial<Pick> = {}): Pick => ({ team: 'ARI', confidence: 0.85, ...overrides });

describe('getShareLine', () => {
  it('states the contrarian pick with no outcome when unresolved', () => {
    const vegas: TeamPick = { team: 'BUF', prob: 0.7 };
    expect(getShareLine(pick(), vegas, null)).toBe("I'm on ARI at 85% when Vegas didn't.");
  });

  it('omits the market clause when siding with Vegas', () => {
    const vegas: TeamPick = { team: 'ARI', prob: 0.7 };
    expect(getShareLine(pick(), vegas, null)).toBe("I'm on ARI at 85%.");
  });

  it('omits the market clause entirely when there is no market line', () => {
    expect(getShareLine(pick(), null, null)).toBe("I'm on ARI at 85%.");
  });

  it('reports a cashed win with the signed net', () => {
    const vegas: TeamPick = { team: 'BUF', prob: 0.7 };
    expect(getShareLine(pick(), vegas, 35)).toBe(
      "I backed ARI at 85% when Vegas didn't — cashed +35.",
    );
  });

  it('reports a missed loss with the absolute net (no double negative)', () => {
    expect(getShareLine(pick(), null, -35)).toBe('I backed ARI at 85% — missed 35.');
  });

  it('reports a push when resolved net is exactly zero', () => {
    expect(getShareLine(pick({ confidence: 0.5 }), null, 0)).toBe(
      'I backed ARI at 50% — pushed, no credits moved.',
    );
  });
});
