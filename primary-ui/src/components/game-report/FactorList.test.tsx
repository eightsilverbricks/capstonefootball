import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FactorList from './FactorList';
import type { FactorCard } from '@/types/prediction';

const makeFactors = (): FactorCard[] => [
  {
    name: 'Market Edge',
    advantage_team: 'KC',
    raw_edge: 1.4,
    contribution_strength: 0.82,
    status: 'DECISIVE',
    reason: 'KC favored by 6.5 — market edge is clear.',
    why_it_matters: 'Vegas lines encode injury news and public info.',
    football_translation: 'KC has a significant market advantage.',
  },
  {
    name: 'Recent Offense',
    advantage_team: 'BUF',
    raw_edge: 0.4,
    contribution_strength: 0.41,
    status: 'MODERATE',
    reason: 'BUF EPA +0.18 over last 3 games.',
    why_it_matters: 'Recent EPA reflects current offensive efficiency.',
    football_translation: 'BUF offense trending up.',
  },
  {
    name: 'Defensive Edge',
    advantage_team: 'Even',
    raw_edge: 0.0,
    contribution_strength: 0.05,
    status: 'NEUTRAL',
    reason: 'Defenses roughly equal over last 3 games.',
    why_it_matters: 'Neither defense has a clear advantage.',
    football_translation: 'Neutral defensive matchup.',
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

  it('renders reason text from backend for non-neutral factors', () => {
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

  it('shows expand toggle when why_it_matters is set', () => {
    render(<FactorList factors={makeFactors()} />);
    expect(screen.getAllByText(/why does this matter/i).length).toBeGreaterThan(0);
  });

  it('expands why_it_matters on toggle click', () => {
    render(<FactorList factors={makeFactors()} />);
    const toggle = screen.getAllByText(/why does this matter/i)[0];
    expect(screen.queryByText(/Vegas lines encode/)).not.toBeInTheDocument();
    fireEvent.click(toggle);
    expect(screen.getByText(/Vegas lines encode/)).toBeInTheDocument();
  });

  it('collapses detail on second click', () => {
    render(<FactorList factors={makeFactors()} />);
    const toggle = screen.getAllByText(/why does this matter/i)[0];
    fireEvent.click(toggle);
    fireEvent.click(screen.getByText(/Less/i));
    expect(screen.queryByText(/Vegas lines encode/)).not.toBeInTheDocument();
  });

  it('renders with empty factors array without crashing', () => {
    render(<FactorList factors={[]} />);
    expect(screen.getByText(/factors to victory/i)).toBeInTheDocument();
  });
});
