import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import WinProbBar from './WinProbBar';

const BASE = {
  awayTeam: 'KC',
  homeTeam: 'BUF',
  awayProb: 0.62,
  homeProb: 0.38,
  predictedWinner: 'KC',
};

describe('WinProbBar', () => {
  it('renders both team abbreviations', () => {
    render(<WinProbBar {...BASE} />);
    expect(screen.getByText(/KC/)).toBeInTheDocument();
    expect(screen.getByText(/BUF/)).toBeInTheDocument();
  });

  it('displays rounded percentages for each team', () => {
    render(<WinProbBar {...BASE} />);
    expect(screen.getByText(/62%/)).toBeInTheDocument();
    expect(screen.getByText(/38%/)).toBeInTheDocument();
  });

  it('renders the "win probability" label', () => {
    render(<WinProbBar {...BASE} />);
    expect(screen.getByText('win probability')).toBeInTheDocument();
  });

  it('applies full opacity to the winning team segment', () => {
    const { container } = render(<WinProbBar {...BASE} />);
    const segments = container.querySelectorAll('[style*="opacity"]');
    const opaque = Array.from(segments).find(
      (el) => (el as HTMLElement).style.opacity === '1'
    );
    expect(opaque).toBeTruthy();
  });

  it('handles 50/50 split without crashing', () => {
    render(<WinProbBar {...BASE} awayProb={0.5} homeProb={0.5} />);
    expect(screen.getAllByText(/50%/)).toHaveLength(2);
  });

  it('handles home team as predicted winner', () => {
    render(
      <WinProbBar {...BASE} awayProb={0.35} homeProb={0.65} predictedWinner="BUF" />
    );
    expect(screen.getByText(/65%/)).toBeInTheDocument();
  });
});
