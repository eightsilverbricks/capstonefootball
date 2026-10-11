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
  const renderList = () => render(<FactorList factors={makeFactors()} winner="KC" loser="BUF" />);

  it('splits factors by the team they help', () => {
    renderList();
    expect(screen.getByRole('heading', { name: 'Why Clark picks KC' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'What favors BUF' })).toBeInTheDocument();
    expect(screen.getByText(/KC favored by 6.5/)).toBeInTheDocument();
    expect(screen.getByText(/BUF EPA \+0\.18/)).toBeInTheDocument();
  });

  it('uses reader-facing factor names', () => {
    renderList();
    expect(screen.getAllByText('Betting line').length).toBeGreaterThan(0);
    expect(screen.queryByText('Market Edge')).not.toBeInTheDocument();
  });

  it('lists hedged reads by headline only, under About even', () => {
    renderList();
    expect(screen.getByRole('heading', { name: 'About even' })).toBeInTheDocument();
    expect(screen.getByText('Recent defense grades out close.')).toBeInTheDocument();
    expect(screen.queryByText('Defenses roughly equal over last 3 games.')).not.toBeInTheDocument();
  });

  it('keeps raw numbers in the Show the numbers drawer', () => {
    renderList();
    expect(screen.getByText('Show the numbers')).toBeInTheDocument();
    expect(screen.getByText('BUF hold a +0.18 EPA/play edge.')).toBeInTheDocument();
  });

  it('shows no status chips or per-factor threads', () => {
    renderList();
    expect(screen.queryByText('Key edge')).not.toBeInTheDocument();
    expect(screen.queryByText(/challenge this factor/i)).not.toBeInTheDocument();
  });
});
