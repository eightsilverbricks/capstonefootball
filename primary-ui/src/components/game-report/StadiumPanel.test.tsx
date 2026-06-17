import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StadiumPanel from './StadiumPanel';

describe('StadiumPanel', () => {
  it('renders stadium name', () => {
    render(<StadiumPanel stadium="Highmark Stadium" homeTeam="BUF" />);
    expect(screen.getByText(/Highmark Stadium/i)).toBeInTheDocument();
  });

  it('derives city from homeTeam when location not provided', () => {
    render(<StadiumPanel stadium="Highmark Stadium" homeTeam="BUF" />);
    expect(screen.getByText(/Orchard Park/i)).toBeInTheDocument();
  });

  it('uses explicit location prop over homeTeam lookup', () => {
    render(
      <StadiumPanel stadium="Some Stadium" homeTeam="BUF" location="Buffalo, NY" />
    );
    expect(screen.getByText(/Buffalo, NY/i)).toBeInTheDocument();
  });

  it('renders roof label when provided', () => {
    render(<StadiumPanel stadium="Caesars" roof="dome" homeTeam="LV" />);
    expect(screen.getByText(/dome/i)).toBeInTheDocument();
  });

  it('renders surface when provided', () => {
    render(<StadiumPanel stadium="Highmark Stadium" homeTeam="BUF" surface="grass" />);
    expect(screen.getByText(/grass/i)).toBeInTheDocument();
  });

  it('renders without crashing when only homeTeam provided', () => {
    render(<StadiumPanel homeTeam="KC" />);
    expect(screen.getByText(/Kansas City/i)).toBeInTheDocument();
  });

  it('renders US map locator when home team has stadium meta', () => {
    render(<StadiumPanel homeTeam="KC" />);
    expect(screen.getByTestId('stadium-map')).toBeInTheDocument();
  });

  it('falls back to color block when home team has no meta', () => {
    render(<StadiumPanel homeTeam="XXX" stadium="Unknown Field" />);
    expect(screen.getByTestId('stadium-fallback')).toBeInTheDocument();
  });

  it('renders capacity and elevation when meta is available', () => {
    render(<StadiumPanel homeTeam="DEN" />);
    expect(screen.getByText(/Capacity/i)).toBeInTheDocument();
    expect(screen.getByText(/5,280 ft/i)).toBeInTheDocument();
  });

  it('descriptive aria-label is present', () => {
    render(<StadiumPanel homeTeam="KC" />);
    expect(screen.getByLabelText(/Venue: Arrowhead Stadium/i)).toBeInTheDocument();
  });
});
