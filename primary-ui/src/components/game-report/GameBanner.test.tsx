import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import GameBanner from './GameBanner';
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
  home_season_record: '0-0',
  away_season_record: '0-0',
  home_last3_record: '2-1 last 3',
  away_last3_record: '1-2 last 3',
  weather: {
    temp: 61, wind: 20, surface: 'grass', roof: 'outdoors',
    stadium: 'Highmark Stadium', is_outdoor: true, is_notable: true,
    summary: '61°F · 20 mph wind',
  },
  ...overrides,
});

describe('GameBanner', () => {
  it('renders both teams, records, and the win probability', () => {
    render(<GameBanner game={game()} />);
    // "BUF" also appears in WinProbBar's inline label, so assert multiple matches.
    expect(screen.getAllByText('BUF').length).toBeGreaterThan(0);
    expect(screen.getAllByText('ARI').length).toBeGreaterThan(0);
    expect(screen.getByText('73')).toBeInTheDocument();
  });

  it('shows the FINAL score once the game has an actual winner', () => {
    render(<GameBanner game={game({ actual_winner: 'BUF', home_score: 34, away_score: 28 })} />);
    expect(screen.getByText(/Final · ARI 28 — BUF 34/)).toBeInTheDocument();
  });

  it('shows the confidence label when the game has not resolved', () => {
    render(<GameBanner game={game()} />);
    expect(screen.getByText('High confidence')).toBeInTheDocument();
  });

  it('shows the low-confidence alert only for Low confidence games', () => {
    const { rerender } = render(<GameBanner game={game({ confidence_label: 'Low' })} />);
    expect(screen.getByText(/Close game/)).toBeInTheDocument();

    rerender(<GameBanner game={game({ confidence_label: 'High' })} />);
    expect(screen.queryByText(/Close game/)).not.toBeInTheDocument();
  });

  it('renders a real QB headshot when espn_id is present', () => {
    render(<GameBanner game={game({
      home_players: { qb: { name: 'J.Allen', espn_id: '3918298' } },
    })} />);
    const img = screen.getByRole('img', { name: 'J.Allen' });
    expect(img).toHaveAttribute('src', expect.stringContaining('3918298'));
    expect(img).toHaveAttribute('loading', 'eager'); // above-the-fold banner image
  });

  it('falls back to the team logo when espn_id is absent', () => {
    render(<GameBanner game={game({ home_players: { qb: { name: 'J.Allen' } } })} />);
    expect(screen.queryByRole('img', { name: 'J.Allen' })).not.toBeInTheDocument();
  });

  it('never uses a CSS gradient anywhere on the banner surface', () => {
    // Explicit regression guard for the user's decision to keep the
    // no-gradient design-system rule for this surface (plan C6).
    const { container } = render(<GameBanner game={game()} />);
    const styled = container.querySelectorAll('[style]');
    styled.forEach((el) => {
      const style = el.getAttribute('style') || '';
      expect(style.toLowerCase()).not.toContain('gradient');
    });
  });

  it('renders no wind layer and an Indoors badge for dome games', () => {
    const domeGame = game({
      weather: {
        temp: 72, wind: 0, surface: 'turf', roof: 'dome', stadium: 'Dome',
        is_outdoor: false, is_notable: false, summary: '72°F indoors',
      },
    });
    const { container } = render(<GameBanner game={domeGame} />);
    // Wind atmosphere is gated to outdoor games — no animated wind lines here.
    expect(container.querySelectorAll('line').length).toBe(0);
    // Indoor state is surfaced explicitly via the weather badge.
    expect(screen.getByText('Indoors')).toBeInTheDocument();
  });

  it('loads a real venue photo for the home team, with the SVG scene as fallback', () => {
    const { container } = render(<GameBanner game={game()} />);
    const photo = container.querySelector('img[src*="Special:FilePath"]');
    expect(photo).not.toBeNull();
    // Decorative background image — hidden from the a11y tree.
    expect(photo?.getAttribute('aria-hidden')).toBe('true');
  });

  it('shows data-grounded weather chips (temp + wind) for an outdoor game', () => {
    render(<GameBanner game={game()} />);
    expect(screen.getByText('61°F')).toBeInTheDocument();
    expect(screen.getByText('20 mph')).toBeInTheDocument();
  });

  it('surfaces the venue name in the banner', () => {
    render(<GameBanner game={game()} />);
    expect(screen.getByText(/Highmark Stadium/)).toBeInTheDocument();
  });
});
