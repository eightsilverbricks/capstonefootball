import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import WhyClark from './WhyClark';
import { computeModelRecord } from '@/lib/modelRecord';
import type { ApiPrediction } from '@/types/prediction';

const game = (overrides: Partial<ApiPrediction> = {}): ApiPrediction => ({
  game_id: 'HOU-KC',
  season: 2024,
  week: 20,
  week_label: 'Divisional',
  home_team: 'KC',
  away_team: 'HOU',
  predicted_winner: 'KC',
  home_win_prob: 0.822,
  away_win_prob: 0.178,
  confidence_label: 'High',
  confidence_score: 32,
  // The API ships these already suffixed — that's the point of the regression.
  home_last3_record: '2-1 last 3',
  away_last3_record: '2-1 last 3',
  home_last3_pts_for: 22.3,
  home_last3_pts_ag: 25.9,
  market_context: {
    market_used: true,
    market_favorite: 'KC',
    spread_line: 9.5,
    home_moneyline: -550,
    away_moneyline: 400,
    interpretation: '',
  },
  factor_cards: [
    {
      name: 'Defensive Edge',
      advantage_team: 'KC',
      raw_edge: 0.2,
      contribution_strength: 0.9,
      status: 'DECISIVE',
      confident: true,
      headline: 'KC bring the pass rush that matters here.',
      explanation: "KC's edge is about disruption: 39% of dropbacks.",
    },
  ],
  ...overrides,
});

const record = computeModelRecord([
  game({ actual_winner: 'KC' }),
  game({ game_id: 'x', actual_winner: 'HOU' }),
]);

function renderWhy(g: ApiPrediction = game()) {
  return render(
    <MemoryRouter>
      <WhyClark game={g} record={record} onPeek={() => {}} />
    </MemoryRouter>,
  );
}

describe('WhyClark', () => {
  afterEach(cleanup);

  it("strips the API's baked-in 'last 3' suffix so the label isn't doubled", () => {
    renderWhy();
    // Regression: rendered "2-1 last 3" beside a "KC LAST 3" label.
    expect(screen.queryByText(/last 3 last 3/i)).not.toBeInTheDocument();
    expect(screen.getAllByText('2-1').length).toBeGreaterThan(0);
  });

  it('names both teams on the form rows rather than a bare "Opp"', () => {
    renderWhy();
    expect(screen.getByText('KC last 3')).toBeInTheDocument();
    expect(screen.getByText('HOU last 3')).toBeInTheDocument();
  });

  it('shows the same game as raw numbers on one side and prose on the other', () => {
    renderWhy();
    expect(screen.getByText('82.2%')).toBeInTheDocument();
    expect(screen.getByText('KC −9.5')).toBeInTheDocument();
    expect(screen.getByText('KC bring the pass rush that matters here.')).toBeInTheDocument();
  });

  it('reports the record honestly, including the misses', () => {
    renderWhy();
    expect(screen.getByText(/Clark called 1 of 2 games last season/)).toBeInTheDocument();
    expect(screen.getByText(/including the 1 it got wrong/)).toBeInTheDocument();
  });

  it('degrades gracefully when the market block is missing', () => {
    renderWhy(game({ market_context: undefined }));
    expect(screen.queryByText(/Spread/i)).not.toBeInTheDocument();
    expect(screen.getByText('82.2%')).toBeInTheDocument();
  });
});
