import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import WeatherBadges from './WeatherBadges';

describe('WeatherBadges', () => {
  it('renders temperature and wind chips for an outdoor game', () => {
    render(<WeatherBadges tempF={61} windMph={20} isOutdoor />);
    expect(screen.getByText('61°F')).toBeInTheDocument();
    expect(screen.getByText('20 mph')).toBeInTheDocument();
    expect(screen.getByText('Moderate')).toBeInTheDocument();  // 11–20 mph tier
  });

  it('escalates the wind label past the high/severe thresholds', () => {
    const { rerender } = render(<WeatherBadges tempF={50} windMph={25} isOutdoor />);
    expect(screen.getByText('High wind')).toBeInTheDocument();
    rerender(<WeatherBadges tempF={50} windMph={35} isOutdoor />);
    expect(screen.getByText('Severe wind')).toBeInTheDocument();
  });

  it('shows an Indoors chip and no wind chip for dome games', () => {
    render(<WeatherBadges tempF={72} windMph={0} isOutdoor={false} />);
    expect(screen.getByText('Indoors')).toBeInTheDocument();
    expect(screen.queryByText(/mph/)).not.toBeInTheDocument();
  });

  it('hides the wind chip when outdoor wind is calm', () => {
    render(<WeatherBadges tempF={70} windMph={0} isOutdoor />);
    expect(screen.getByText('70°F')).toBeInTheDocument();
    expect(screen.queryByText(/mph/)).not.toBeInTheDocument();
  });

  it('labels temperature bands using the same vocabulary as the data', () => {
    const { rerender } = render(<WeatherBadges tempF={20} windMph={5} isOutdoor />);
    expect(screen.getByText('Freezing')).toBeInTheDocument();
    rerender(<WeatherBadges tempF={92} windMph={5} isOutdoor />);
    expect(screen.getByText('Hot')).toBeInTheDocument();
  });

  it('never fabricates a precipitation/sky condition (data has none)', () => {
    render(<WeatherBadges tempF={40} windMph={15} isOutdoor />);
    ['Rain', 'Snow', 'Sunny', 'Clear', 'Cloudy', 'Storm'].forEach((word) => {
      expect(screen.queryByText(new RegExp(word, 'i'))).not.toBeInTheDocument();
    });
  });

  it('renders nothing for an outdoor game with no temp or wind data', () => {
    const { container } = render(<WeatherBadges tempF={null} windMph={null} isOutdoor />);
    expect(container.firstChild).toBeNull();
  });
});
