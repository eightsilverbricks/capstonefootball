import { describe, it, expect } from 'vitest';
import { getHeroFactor, getHeroInsight, getEvidenceTeaser } from './heroInsight';
import type { ApiPrediction, FactorCard } from '@/types/prediction';

const card = (overrides: Partial<FactorCard>): FactorCard => ({
  name: 'Recent Offense',
  advantage_team: 'BUF',
  raw_edge: 0.1,
  contribution_strength: 0.5,
  status: 'DECISIVE',
  confident: true,
  ...overrides,
});

const game = (overrides: Partial<ApiPrediction>): ApiPrediction => ({
  season: 2024,
  week: 1,
  week_label: 'Week 1',
  home_team: 'BUF',
  away_team: 'ARI',
  predicted_winner: 'BUF',
  home_win_prob: 0.7,
  away_win_prob: 0.3,
  confidence_label: 'High',
  confidence_score: 40,
  ...overrides,
});

describe('getHeroFactor', () => {
  it('prefers a confident non-market football factor favoring the winner', () => {
    const g = game({
      factor_cards: [
        card({ name: 'Market Edge', advantage_team: 'BUF', contribution_strength: 0.9 }),
        card({ name: 'Defensive Edge', advantage_team: 'BUF', contribution_strength: 0.6 }),
      ],
    });
    expect(getHeroFactor(g)?.name).toBe('Defensive Edge');
  });

  it('falls back to any confident factor for the winner when no football factor qualifies', () => {
    const g = game({
      factor_cards: [
        card({ name: 'Market Edge', advantage_team: 'BUF', contribution_strength: 0.9 }),
        card({ name: 'Recent Offense', advantage_team: 'BUF', contribution_strength: 0.5, confident: false }),
      ],
    });
    expect(getHeroFactor(g)?.name).toBe('Market Edge');
  });

  it('falls back to the strongest card overall rather than returning nothing', () => {
    const g = game({
      factor_cards: [
        card({ name: 'Recent Offense', advantage_team: 'ARI', contribution_strength: 0.7, confident: false }),
        card({ name: 'Momentum', advantage_team: 'ARI', contribution_strength: 0.3 }),
      ],
    });
    expect(getHeroFactor(g)?.name).toBe('Recent Offense');
  });

  it('returns null when there are no factor cards', () => {
    expect(getHeroFactor(game({ factor_cards: [] }))).toBeNull();
  });
});

describe('getHeroInsight', () => {
  it('returns headline and first sentence of the explanation', () => {
    const g = game({
      factor_cards: [
        card({
          name: 'Defensive Edge',
          advantage_team: 'BUF',
          headline: "BUF's defense has been the tougher unit.",
          explanation: 'First sentence here. Second sentence should be dropped.',
        }),
      ],
    });
    const insight = getHeroInsight(g);
    expect(insight?.headline).toBe("BUF's defense has been the tougher unit.");
    expect(insight?.line).toBe('First sentence here.');
    expect(insight?.team).toBe('BUF');
  });

  it('returns null when the hero factor has no headline (ungenerated legacy card)', () => {
    const g = game({ factor_cards: [card({ headline: undefined })] });
    expect(getHeroInsight(g)).toBeNull();
  });
});

describe('getEvidenceTeaser', () => {
  it('names the top factor and mentions the upset path when a risk exists', () => {
    const g = game({
      factor_cards: [card({ name: 'Defensive Edge', advantage_team: 'BUF' })],
      risk_factor: 'ARI bring the pass rush that matters here.',
    });
    expect(getEvidenceTeaser(g)).toBe('See the defensive edge Clark weighted most — and the upset path.');
  });

  it('omits the upset path clause when there is no risk factor', () => {
    const g = game({ factor_cards: [card({ name: 'Momentum', advantage_team: 'BUF' })] });
    expect(getEvidenceTeaser(g)).toBe('See the momentum edge Clark weighted most in this one.');
  });

  it('falls back to the generic teaser when there are no factor cards', () => {
    expect(getEvidenceTeaser(game({ factor_cards: [] }))).toBe(
      'View the evidence — why Clark thinks this',
    );
  });
});
