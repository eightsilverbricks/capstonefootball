import { describe, expect, it } from 'vitest';
import { GATE_COPY, gateView, type GateFeature } from './gate';

const FEATURES = Object.keys(GATE_COPY) as GateFeature[];

describe('gateView', () => {
  it('locks every feature for signed-out visitors', () => {
    for (const f of FEATURES) expect(gateView(f, false).locked).toBe(true);
  });

  it('opens every feature for signed-in members', () => {
    for (const f of FEATURES) expect(gateView(f, true).locked).toBe(false);
  });

  it('carries the copy for the feature it was asked about', () => {
    const view = gateView('leaderboard', false);
    expect(view.feature).toBe('leaderboard');
    expect(view.quote).toBe(GATE_COPY.leaderboard.quote);
  });

  it('gives every feature a quote and a plain explanation', () => {
    for (const f of FEATURES) {
      expect(GATE_COPY[f].quote.length).toBeGreaterThan(10);
      expect(GATE_COPY[f].detail.length).toBeGreaterThan(10);
    }
  });
});
