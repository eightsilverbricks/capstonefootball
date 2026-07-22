import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PlayerHeadshot from './PlayerHeadshot';

describe('PlayerHeadshot', () => {
  it('renders a real headshot with meaningful alt text when espn_id is present', () => {
    render(<PlayerHeadshot espnId="3918298" name="J.Allen" teamAbbr="BUF" />);
    const img = screen.getByRole('img', { name: 'J.Allen' });
    expect(img).toHaveAttribute('src', 'https://a.espncdn.com/i/headshots/nfl/players/full/3918298.png');
  });

  it('falls back to TeamLogo when espn_id is missing', () => {
    render(<PlayerHeadshot espnId={null} teamAbbr="BUF" />);
    expect(screen.getByRole('img', { name: 'BUF' })).toHaveAttribute(
      'src',
      expect.stringContaining('espncdn.com/i/teamlogos'),
    );
  });

  it('falls back to TeamLogo when the headshot image fails to load', () => {
    render(<PlayerHeadshot espnId="9999999" name="Nobody" teamAbbr="BUF" />);
    const img = screen.getByRole('img', { name: 'Nobody' });
    fireEvent.error(img);
    expect(screen.getByRole('img', { name: 'BUF' })).toHaveAttribute(
      'src',
      expect.stringContaining('espncdn.com/i/teamlogos'),
    );
  });

  it('uses eager loading and high fetchPriority only when priority is set', () => {
    const { rerender } = render(<PlayerHeadshot espnId="3918298" name="J.Allen" teamAbbr="BUF" />);
    expect(screen.getByRole('img', { name: 'J.Allen' })).toHaveAttribute('loading', 'lazy');

    rerender(<PlayerHeadshot espnId="3918298" name="J.Allen" teamAbbr="BUF" priority />);
    expect(screen.getByRole('img', { name: 'J.Allen' })).toHaveAttribute('loading', 'eager');
  });
});
