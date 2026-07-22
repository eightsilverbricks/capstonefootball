import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import StadiumScene from './StadiumScene';

describe('StadiumScene', () => {
  it('renders a field strip with yard-line ticks for outdoor venues', () => {
    const { container } = render(<StadiumScene isOutdoor accentColor="#00338D" />);
    const ticks = container.querySelectorAll('line');
    expect(ticks.length).toBe(9);
  });

  it('renders an enclosed roof glyph with no field ticks for dome venues', () => {
    const { container } = render(<StadiumScene isOutdoor={false} accentColor="#00338D" />);
    expect(container.querySelectorAll('line').length).toBe(0);
    // Two roof arcs + one field-tint rect
    expect(container.querySelectorAll('path').length).toBe(2);
  });

  it('is purely decorative (aria-hidden)', () => {
    const { container } = render(<StadiumScene isOutdoor accentColor="#00338D" />);
    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });
});
