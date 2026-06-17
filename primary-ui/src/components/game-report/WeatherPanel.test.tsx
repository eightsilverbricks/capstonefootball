import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import WeatherPanel from './WeatherPanel';

// is_outdoor: true required to prevent isDome short-circuit
const OUTDOOR = { temp: 42, wind: 18, roof: 'open', is_outdoor: true };

describe('WeatherPanel', () => {
  it('returns null when weather is undefined', () => {
    const { container } = render(<WeatherPanel />);
    expect(container.firstChild).toBeNull();
  });

  it('renders temperature for outdoor game', () => {
    render(<WeatherPanel weather={OUTDOOR} />);
    expect(screen.getByText(/42°F/)).toBeInTheDocument();
  });

  it('renders wind speed for outdoor game', () => {
    render(<WeatherPanel weather={OUTDOOR} />);
    expect(screen.getByText(/18/)).toBeInTheDocument();
    expect(screen.getByText('mph')).toBeInTheDocument();
  });

  it('renders "Moderate wind" tier label at 18 mph', () => {
    render(<WeatherPanel weather={OUTDOOR} />);
    expect(screen.getByText(/Moderate wind/i)).toBeInTheDocument();
  });

  it('renders wind consequence when provided and weather is outdoor', () => {
    render(
      <WeatherPanel
        weather={{ ...OUTDOOR, is_notable: true }}
        windConsequence="Some passing game disruption likely."
      />
    );
    expect(screen.getByText(/passing game disruption/i)).toBeInTheDocument();
  });

  it('renders "Indoors" when roof is dome regardless of is_outdoor', () => {
    render(<WeatherPanel weather={{ temp: 72, wind: 0, roof: 'dome', is_outdoor: false }} />);
    expect(screen.getByText('Indoors')).toBeInTheDocument();
    expect(screen.getByText('No weather impact')).toBeInTheDocument();
  });

  it('renders "Indoors" when is_outdoor is falsy (default)', () => {
    // is_outdoor omitted → isDome = true
    render(<WeatherPanel weather={{ temp: 55, wind: 10, roof: 'open' }} />);
    expect(screen.getByText('Indoors')).toBeInTheDocument();
  });

  it('renders calm tier when wind is below 11 mph outdoors', () => {
    render(<WeatherPanel weather={{ temp: 60, wind: 5, roof: 'open', is_outdoor: true }} />);
    expect(screen.getByText('Calm')).toBeInTheDocument();
  });

  it('renders severe wind tier at 35 mph outdoors', () => {
    render(<WeatherPanel weather={{ temp: 30, wind: 35, roof: 'open', is_outdoor: true }} />);
    expect(screen.getByText(/Severe wind/i)).toBeInTheDocument();
  });

  it('tier chip carries a data-tier attribute so cue does not rely on color alone', () => {
    const { container } = render(<WeatherPanel weather={OUTDOOR} />);
    const tierChip = container.querySelector('[data-tier="moderate"]');
    expect(tierChip).not.toBeNull();
  });

  it('descriptive aria-label is present on the section', () => {
    render(<WeatherPanel weather={OUTDOOR} />);
    expect(screen.getByLabelText(/Weather: moderate wind/i)).toBeInTheDocument();
  });

  it('dome path uses indoor aria-label', () => {
    render(<WeatherPanel weather={{ temp: 72, wind: 0, roof: 'dome', is_outdoor: false }} />);
    expect(screen.getByLabelText(/indoor game/i)).toBeInTheDocument();
  });

  it('shows wet-conditions chip when summary mentions rain', () => {
    render(
      <WeatherPanel
        weather={{ temp: 55, wind: 12, roof: 'open', is_outdoor: true, is_notable: true, summary: 'Rain expected' }}
      />,
    );
    expect(screen.getByText(/Wet conditions/i)).toBeInTheDocument();
  });
});
