import { describe, it, expect } from 'vitest';
import {
  LIVE_SEASON,
  DEMO_SEASON,
  LIVE_SEASON_KICKOFF,
  seasonConfig,
  isPreSeason,
  daysUntilKickoff,
} from './season';

describe('seasonConfig', () => {
  it('points live and demo at different datasets', () => {
    // The whole separation rests on these not colliding: one shared URL would
    // serve demo cards to the live season after a toggle.
    expect(seasonConfig('live').dataUrl).not.toBe(seasonConfig('demo').dataUrl);
    expect(seasonConfig('live').season).toBe(LIVE_SEASON);
    expect(seasonConfig('demo').season).toBe(DEMO_SEASON);
  });

  it('marks only the demo season as demo', () => {
    expect(seasonConfig('live').isDemo).toBe(false);
    expect(seasonConfig('demo').isDemo).toBe(true);
  });

  it('uses a completed season for the demo, so picks can resolve', () => {
    expect(DEMO_SEASON).toBeLessThan(LIVE_SEASON);
  });
});

describe('pre-season helpers', () => {
  const before = new Date(LIVE_SEASON_KICKOFF.getTime() - 3 * 86_400_000);
  const after = new Date(LIVE_SEASON_KICKOFF.getTime() + 86_400_000);

  it('detects the pre-season window', () => {
    expect(isPreSeason(before)).toBe(true);
    expect(isPreSeason(after)).toBe(false);
  });

  it('counts whole days down to kickoff', () => {
    expect(daysUntilKickoff(before)).toBe(3);
  });

  it('never reports a negative countdown once the season starts', () => {
    expect(daysUntilKickoff(after)).toBe(0);
  });
});
