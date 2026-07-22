import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import FactorList from './FactorList';
import type { FactorCard } from '@/types/prediction';

const makeFactors = (): FactorCard[] => [
  {
    name: 'Market Edge',
    advantage_team: 'KC',
    raw_edge: 1.4,
    contribution_strength: 0.82,
    status: 'DECISIVE',
    headline: 'The market leans KC.',
    explanation: 'KC favored by 6.5 — market edge is clear.',
    baseline_note: 'Vegas priced KC as a 6.5-point favorite.',
    confident: true,
  },
  {
    name: 'Recent Offense',
    advantage_team: 'BUF',
    raw_edge: 0.4,
    contribution_strength: 0.41,
    status: 'MODERATE',
    headline: 'BUF own the better recent offense.',
    explanation: 'BUF EPA +0.18 over last 3 games.',
    baseline_note: 'BUF hold a +0.18 EPA/play edge.',
    confident: true,
  },
  {
    name: 'Defensive Edge',
    advantage_team: 'Even',
    raw_edge: 0.0,
    contribution_strength: 0.05,
    status: 'NEUTRAL',
    headline: 'Recent defense grades out close.',
    explanation: 'Defenses roughly equal over last 3 games.',
    baseline_note: 'Recent EPA allowed grades out close.',
    confident: false,
  },
];

describe('FactorList', () => {
  it('renders the section heading', () => {
    render(<FactorList factors={makeFactors()} />);
    expect(screen.getByText(/factors to victory/i)).toBeInTheDocument();
  });

  it('renders all factor names', () => {
    render(<FactorList factors={makeFactors()} />);
    expect(screen.getByText('Market Edge')).toBeInTheDocument();
    expect(screen.getByText('Recent Offense')).toBeInTheDocument();
    expect(screen.getByText('Defensive Edge')).toBeInTheDocument();
  });

  it('renders explanation text from backend for non-neutral factors', () => {
    render(<FactorList factors={makeFactors()} />);
    expect(screen.getByText(/KC favored by 6.5/)).toBeInTheDocument();
    expect(screen.getByText(/BUF EPA \+0\.18/)).toBeInTheDocument();
  });

  it('sorts factors by contribution_strength descending', () => {
    render(<FactorList factors={makeFactors()} />);
    const names = screen.getAllByText(/Market Edge|Recent Offense|Defensive Edge/);
    const mIdx = names.findIndex((el) => el.textContent === 'Market Edge');
    const rIdx = names.findIndex((el) => el.textContent === 'Recent Offense');
    expect(mIdx).toBeLessThan(rIdx);
  });

  it('shows team badge for non-Even advantage teams', () => {
    render(<FactorList factors={makeFactors()} />);
    // KC badge from Market Edge row
    const kcBadges = screen.getAllByText('KC');
    expect(kcBadges.length).toBeGreaterThan(0);
  });

  it('renders "Key edge" status label for DECISIVE factor', () => {
    render(<FactorList factors={makeFactors()} />);
    expect(screen.getByText('Key edge')).toBeInTheDocument();
  });

  it('renders "Notable" status label for MODERATE factor', () => {
    render(<FactorList factors={makeFactors()} />);
    expect(screen.getByText('Notable')).toBeInTheDocument();
  });

  it('renders "Even" status label for NEUTRAL factor (not a team badge)', () => {
    render(<FactorList factors={makeFactors()} />);
    // "Even" appears as the status label, not as a team advantage badge
    expect(screen.getByText('Even')).toBeInTheDocument();
    // But "Even" should NOT appear inside a team badge element
    // The badge is only rendered when !isEven, so no badge span for the neutral row
    const badges = screen.queryAllByText('Even');
    // Should be exactly one instance (the status label), not a team badge
    expect(badges).toHaveLength(1);
  });

  it('renders the headline and full explanation inline with no second dropdown', () => {
    render(<FactorList factors={makeFactors()} />);
    // The reasoning is visible immediately — no "why does this matter?" toggle exists.
    expect(screen.queryByText(/why does this matter/i)).not.toBeInTheDocument();
    expect(screen.getByText('The market leans KC.')).toBeInTheDocument();
    expect(screen.getByText(/KC favored by 6\.5/)).toBeInTheDocument();
  });

  it('does not render an explanation paragraph when the field is missing (no crash)', () => {
    const factors = makeFactors();
    delete factors[0].explanation;
    delete factors[0].headline;
    render(<FactorList factors={factors} />);
    // The row still renders (name + bar), just without a reasoning paragraph.
    expect(screen.getByText('Market Edge')).toBeInTheDocument();
    expect(screen.queryByText(/KC favored by 6\.5/)).not.toBeInTheDocument();
  });

  it('renders with empty factors array without crashing', () => {
    render(<FactorList factors={[]} />);
    expect(screen.getByText(/factors to victory/i)).toBeInTheDocument();
  });
});
