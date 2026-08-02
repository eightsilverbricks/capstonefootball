import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import FoundersPortrait from './FoundersPortrait';
import { FOUNDERS } from '@/data/founders';

describe('FoundersPortrait', () => {
  afterEach(cleanup);

  it('renders the group photo with a real alt description', () => {
    render(<FoundersPortrait />);
    const img = screen.getByRole('img', { name: /Takuo Yamamoto, Nicholas Chan, and Zane Wolf/ });
    expect(img).toHaveAttribute('src', '/founders/group.jpg');
  });

  it('applies the slow zoom by default', () => {
    const { container } = render(<FoundersPortrait />);
    expect(container.querySelector('img')?.className).toContain('photo-zoom');
  });

  it('can turn the zoom off for small decorative uses', () => {
    const { container } = render(<FoundersPortrait animate={false} />);
    expect(container.querySelector('img')?.className).not.toContain('photo-zoom');
  });

  it('anchors each name label under the right founder using photoXPercent', () => {
    const { container } = render(<FoundersPortrait />);
    const labelNodes = container.querySelectorAll('[style*="translateX(-50%)"]');
    expect(labelNodes).toHaveLength(FOUNDERS.length);

    FOUNDERS.forEach((founder, i) => {
      expect(labelNodes[i]).toHaveStyle({ left: `${founder.photoXPercent}%` });
      expect(labelNodes[i].textContent).toContain(founder.name);
      expect(labelNodes[i].textContent).toContain(founder.teamName);
    });
  });

  it('gives screen readers one readable list instead of three disconnected fragments', () => {
    render(<FoundersPortrait />);
    expect(screen.getByText(/Takuo Yamamoto, Seahawks fan, Co-founder/)).toHaveClass('sr-only');
  });

  it('omits every label and the sr-only summary when showLabels is off', () => {
    render(<FoundersPortrait showLabels={false} />);
    FOUNDERS.forEach((founder) => {
      expect(screen.queryByText(founder.name)).not.toBeInTheDocument();
    });
    expect(screen.queryByText(/Co-founder/)).not.toBeInTheDocument();
  });
});
