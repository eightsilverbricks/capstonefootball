import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PlayerMatchupCard from './PlayerMatchupCard';

const awayPlayers = {
  qb: { name: 'J.Allen', attempts: 586, epa_per_att: 0.259, cpoe: 2.0 },
  rb: { name: 'J.Cook',  carries: 260, ypc: 4.93, epa: 19.5 },
};
const homePlayers = {
  qb: { name: 'P.Mahomes', attempts: 545, epa_per_att: 0.180, cpoe: 0.4 },
  rb: { name: 'I.Pacheco', carries: 90, ypc: 3.7, epa: 1.2 },
};

describe('PlayerMatchupCard', () => {
  it('renders QB names for both teams', () => {
    render(
      <PlayerMatchupCard
        awayTeam="BUF" homeTeam="KC"
        awayPlayers={awayPlayers} homePlayers={homePlayers}
      />,
    );
    expect(screen.getByText('J.Allen')).toBeInTheDocument();
    expect(screen.getByText('P.Mahomes')).toBeInTheDocument();
  });

  it('renders RB names for both teams', () => {
    render(
      <PlayerMatchupCard
        awayTeam="BUF" homeTeam="KC"
        awayPlayers={awayPlayers} homePlayers={homePlayers}
      />,
    );
    expect(screen.getByText('J.Cook')).toBeInTheDocument();
    expect(screen.getByText('I.Pacheco')).toBeInTheDocument();
  });

  it('formats EPA per attempt with a leading sign', () => {
    render(
      <PlayerMatchupCard
        awayTeam="BUF" homeTeam="KC"
        awayPlayers={awayPlayers} homePlayers={homePlayers}
      />,
    );
    expect(screen.getByText('+0.259')).toBeInTheDocument();
    expect(screen.getByText('+0.180')).toBeInTheDocument();
  });

  it('underlines the better QB EPA value (gold cue)', () => {
    const { container } = render(
      <PlayerMatchupCard
        awayTeam="BUF" homeTeam="KC"
        awayPlayers={awayPlayers} homePlayers={homePlayers}
      />,
    );
    const awayCell = Array.from(container.querySelectorAll('span'))
      .find(el => el.textContent === '+0.259');
    expect(awayCell).toBeDefined();
    expect(awayCell?.style.textDecoration).toContain('underline');
  });

  it('renders gracefully when no player data is supplied', () => {
    const { container } = render(
      <PlayerMatchupCard awayTeam="BUF" homeTeam="KC" />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders QB section even when RB is absent', () => {
    render(
      <PlayerMatchupCard
        awayTeam="BUF" homeTeam="KC"
        awayPlayers={{ qb: awayPlayers.qb }}
        homePlayers={{ qb: homePlayers.qb }}
      />,
    );
    expect(screen.getByText('Quarterback')).toBeInTheDocument();
    expect(screen.queryByText('Lead back')).toBeNull();
  });

  it('has descriptive aria-label', () => {
    render(
      <PlayerMatchupCard
        awayTeam="BUF" homeTeam="KC"
        awayPlayers={awayPlayers} homePlayers={homePlayers}
      />,
    );
    expect(screen.getByLabelText(/key player matchups/i)).toBeInTheDocument();
  });
});
