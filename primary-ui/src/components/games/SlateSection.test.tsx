import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SlateSection from './SlateSection';
import { groupBySlate } from '@/lib/slate';
import { ApiPrediction } from '@/types/prediction';

function game(partial: Partial<ApiPrediction> & { game_id: string }): ApiPrediction {
  return {
    season: 2024,
    week: 1,
    week_label: 'Week 1',
    game_date: '2024-09-08',
    weekday: 'Sunday',
    gametime: '13:00',
    game_type: 'REG',
    home_team: 'HOME',
    away_team: 'AWAY',
    predicted_winner: 'HOME',
    home_win_prob: 0.6,
    away_win_prob: 0.4,
    confidence_label: 'Medium',
    confidence_score: 20,
    ...partial,
  } as ApiPrediction;
}

function renderGroup(games: ApiPrediction[]) {
  const [group] = groupBySlate(games);
  return render(
    <MemoryRouter>
      <SlateSection group={group} />
    </MemoryRouter>,
  );
}

describe('SlateSection', () => {
  it('names the window and counts its games', () => {
    renderGroup([
      game({ game_id: 'a', home_team: 'KC', away_team: 'BUF' }),
      game({ game_id: 'b', home_team: 'SF', away_team: 'DAL' }),
    ]);

    expect(screen.getByRole('heading', { name: 'Sunday Early' })).toBeInTheDocument();
    expect(screen.getByText('2 games')).toBeInTheDocument();
  });

  it('says "game" rather than "games" for a lone matchup', () => {
    renderGroup([
      game({ game_id: 'a', weekday: 'Monday', gametime: '20:15', home_team: 'NYJ', away_team: 'SF' }),
    ]);
    expect(screen.getByText('1 game')).toBeInTheDocument();
  });

  it('shows the shared kickoff time when the window starts together', () => {
    renderGroup([
      game({ game_id: 'a', home_team: 'KC', away_team: 'BUF' }),
      game({ game_id: 'b', home_team: 'SF', away_team: 'DAL' }),
    ]);
    expect(screen.getAllByText('1:00 PM ET').length).toBeGreaterThan(0);
  });

  it('labels the section for assistive tech', () => {
    renderGroup([game({ game_id: 'a', home_team: 'KC', away_team: 'BUF' })]);
    const section = screen.getByRole('region', { name: 'Sunday Early' });
    expect(within(section).getByText('1 game')).toBeInTheDocument();
  });

  it('renders one card per game in the window', () => {
    const { container } = renderGroup([
      game({ game_id: 'a', home_team: 'KC', away_team: 'BUF' }),
      game({ game_id: 'b', home_team: 'SF', away_team: 'DAL' }),
      game({ game_id: 'c', home_team: 'MIA', away_team: 'NYJ' }),
    ]);
    expect(container.querySelectorAll('article')).toHaveLength(3);
  });
});
