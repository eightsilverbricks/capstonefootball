import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import HomeHighlights from './HomeHighlights';
import type { ApiPrediction } from '@/types/prediction';

const g = (o: Partial<ApiPrediction>): ApiPrediction => ({
  season: 2024, week: 1, week_label: 'Week 1',
  home_team: 'BUF', away_team: 'ARI',
  predicted_winner: 'BUF', home_win_prob: 0.7, away_win_prob: 0.3,
  confidence_label: 'High', confidence_score: 40,
  ...o,
});

const renderIn = (ui: React.ReactNode) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe('HomeHighlights', () => {
  it('renders the top-N games sorted by confidence and links each to its report', () => {
    const games = [
      g({ home_team: 'KC', away_team: 'CIN', home_win_prob: 0.55, away_win_prob: 0.45 }),
      g({ home_team: 'BUF', away_team: 'ARI', home_win_prob: 0.82, away_win_prob: 0.18, predicted_winner: 'BUF' }),
      g({ home_team: 'DAL', away_team: 'NYG', home_win_prob: 0.68, away_win_prob: 0.32 }),
    ];
    renderIn(<HomeHighlights games={games} limit={2} />);

    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(2);
    // Highest confidence (BUF 0.82) should be first.
    expect(links[0]).toHaveAttribute('href', '/game/2024/1/ARI/BUF');
    expect(screen.getByText('BUF 82%')).toBeInTheDocument();
  });

  it('renders nothing when there are no games', () => {
    const { container } = renderIn(<HomeHighlights games={[]} />);
    expect(container.querySelector('ul')).toBeNull();
  });
});
