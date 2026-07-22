import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import WeatherScene from './WeatherScene';

function mockMatchMedia(reduced: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: reduced,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

describe('WeatherScene', () => {
  beforeEach(() => mockMatchMedia(false));
  afterEach(() => vi.restoreAllMocks());

  it('renders nothing indoors, regardless of wind', () => {
    const { container } = render(<WeatherScene windMph={40} isOutdoor={false} accentColor="#00338D" />);
    expect(container.querySelector('svg')).toBeNull();
  });

  it('renders nothing outdoors when wind is calm', () => {
    const { container } = render(<WeatherScene windMph={5} isOutdoor accentColor="#00338D" />);
    expect(container.querySelector('svg')).toBeNull();
  });

  it('renders wind lines outdoors when wind is notable, scaling count with speed', () => {
    const moderate = render(<WeatherScene windMph={15} isOutdoor accentColor="#00338D" />);
    const severe = render(<WeatherScene windMph={35} isOutdoor accentColor="#00338D" />);
    const moderateLines = moderate.container.querySelectorAll('line').length;
    const severeLines = severe.container.querySelectorAll('line').length;
    expect(moderateLines).toBeGreaterThan(0);
    expect(severeLines).toBeGreaterThan(moderateLines);
  });

  it('never renders precipitation glyphs — wind lines only, no images or other shapes', () => {
    const { container } = render(<WeatherScene windMph={35} isOutdoor accentColor="#00338D" />);
    expect(container.querySelectorAll('circle, path, image').length).toBe(0);
  });

  it('freezes motion (no <animate> elements) when prefers-reduced-motion is set', () => {
    mockMatchMedia(true);
    const { container } = render(<WeatherScene windMph={35} isOutdoor accentColor="#00338D" />);
    expect(container.querySelectorAll('animate').length).toBe(0);
    expect(container.querySelectorAll('line').length).toBeGreaterThan(0);
  });

  it('animates when motion is not reduced', () => {
    const { container } = render(<WeatherScene windMph={35} isOutdoor accentColor="#00338D" />);
    expect(container.querySelectorAll('animate').length).toBeGreaterThan(0);
  });
});
