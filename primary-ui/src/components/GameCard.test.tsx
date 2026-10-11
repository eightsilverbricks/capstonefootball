import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import GameCard from './GameCard';
import { ApiPrediction } from '@/types/prediction';
import { LIVE_SEASON } from '@/lib/season';

function game(partial: Partial<ApiPrediction> = {}): ApiPrediction {
  return {
    game_id: '2026_01_ARI_LAC',
    season: LIVE_SEASON,
    week: 1,
    week_label: 'Week 1',
    game_date: '2026-09-13',
    weekday: 'Sunday',
    gametime: '16:25',
    game_type: 'REG',
    home_team: 'LAC',
    away_team: 'ARI',
    predicted_winner: 'LAC',
    home_win_prob: 0.7877,
    away_win_prob: 0.2123,
    confidence_label: 'High',
    confidence_score: 57.5,
    ...partial,
  } as ApiPrediction;
}

function renderCard(g: ApiPrediction) {
  return render(
    <MemoryRouter>
      <GameCard game={g} />
    </MemoryRouter>,
  );
}

describe('GameCard', () => {
  it('shows the kickoff time for a game that has not been played', () => {
    renderCard(game());
    expect(screen.getByText('4:25 PM ET')).toBeInTheDocument();
  });

  it('offers the conviction slider before kickoff', () => {
    renderCard(game());
    expect(screen.getByText('Your pick')).toBeInTheDocument();
  });

  it('reports the final score once the game is played', () => {
    renderCard(game({ home_score: 14, away_score: 26, actual_winner: 'ARI' }));
    expect(screen.getByText(/ARI 26 — LAC 14/)).toBeInTheDocument();
  });

  it('closes picking on a played game', () => {
    renderCard(game({ home_score: 14, away_score: 26, actual_winner: 'ARI' }));
    expect(screen.queryByText('Your pick')).not.toBeInTheDocument();
    expect(screen.getByText('Final')).toBeInTheDocument();
  });
});
