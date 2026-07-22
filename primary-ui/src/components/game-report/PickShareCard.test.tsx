import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PickShareCard from './PickShareCard';
import type { ApiPrediction } from '@/types/prediction';

const game = (overrides: Partial<ApiPrediction> = {}): ApiPrediction => ({
  season: 2024,
  week: 1,
  week_label: 'Week 1',
  home_team: 'BUF',
  away_team: 'ARI',
  predicted_winner: 'BUF',
  home_win_prob: 0.73,
  away_win_prob: 0.27,
  confidence_label: 'High',
  confidence_score: 46,
  factor_cards: [
    {
      name: 'Momentum',
      advantage_team: 'BUF',
      raw_edge: 0.2,
      contribution_strength: 0.6,
      status: 'DECISIVE',
      headline: 'BUF are the team trending up.',
      explanation: "BUF come in playing the better football. They're 2-1 over their last three.",
      confident: true,
    },
  ],
  ...overrides,
});

describe('PickShareCard', () => {
  it('renders the team, conviction, and the Clark noticed insight', () => {
    render(
      <PickShareCard
        game={game()}
        pick={{ team: 'ARI', confidence: 0.85 }}
        vegas={{ team: 'BUF', prob: 0.7 }}
        fan={{ team: 'BUF', prob: 0.6 }}
        resolvedNet={null}
      />,
    );
    expect(screen.getByText('ARI')).toBeInTheDocument();
    expect(screen.getByText('85%')).toBeInTheDocument();
    expect(screen.getByText('BUF are the team trending up.')).toBeInTheDocument();
    expect(screen.getByText(/I'm on ARI at 85%/)).toBeInTheDocument();
  });

  it('shows a Cashed badge and the win line once resolved with a positive net', () => {
    render(
      <PickShareCard
        game={game({ actual_winner: 'ARI' })}
        pick={{ team: 'ARI', confidence: 0.85 }}
        vegas={{ team: 'BUF', prob: 0.7 }}
        fan={{ team: 'BUF', prob: 0.6 }}
        resolvedNet={35}
      />,
    );
    expect(screen.getByText('Cashed')).toBeInTheDocument();
    expect(screen.getByText(/cashed \+35/)).toBeInTheDocument();
  });

  it('shows a Missed badge for a resolved loss', () => {
    render(
      <PickShareCard
        game={game({ actual_winner: 'BUF' })}
        pick={{ team: 'ARI', confidence: 0.85 }}
        vegas={null}
        fan={{ team: 'BUF', prob: 0.6 }}
        resolvedNet={-35}
      />,
    );
    expect(screen.getByText('Missed')).toBeInTheDocument();
    expect(screen.getByText(/missed 35/)).toBeInTheDocument();
  });

  it('renders the season bragging layer when Clark differential and a streak are provided', () => {
    render(
      <PickShareCard
        game={game()}
        pick={{ team: 'ARI', confidence: 0.85 }}
        vegas={null}
        fan={{ team: 'BUF', prob: 0.6 }}
        resolvedNet={null}
        clarkDifferential={22}
        streak={{ type: 'W', count: 3 }}
      />,
    );
    expect(screen.getByText(/\+22 vs Clark this season/)).toBeInTheDocument();
    expect(screen.getByText('W3 streak')).toBeInTheDocument();
  });

  it('omits the bragging layer when neither differential nor a meaningful streak is given', () => {
    render(
      <PickShareCard
        game={game()}
        pick={{ team: 'ARI', confidence: 0.85 }}
        vegas={null}
        fan={{ team: 'BUF', prob: 0.6 }}
        resolvedNet={null}
        streak={{ type: 'W', count: 1 }}
      />,
    );
    expect(screen.queryByText(/vs Clark this season/)).not.toBeInTheDocument();
    expect(screen.queryByText(/streak/)).not.toBeInTheDocument();
  });

  it('always renders the Clark Index wordmark', () => {
    render(
      <PickShareCard
        game={game()}
        pick={{ team: 'ARI', confidence: 0.85 }}
        vegas={null}
        fan={{ team: 'BUF', prob: 0.6 }}
        resolvedNet={null}
      />,
    );
    // "Clark" also appears as the ThreeWayCompare row label, so assert
    // multiple matches rather than requiring a single unique node.
    expect(screen.getAllByText('Clark').length).toBeGreaterThan(0);
    expect(screen.getByText('Index')).toBeInTheDocument();
  });
});
