import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import StadiumImage from './StadiumImage';

describe('StadiumImage', () => {
  it('renders a Wikimedia venue photo for a mapped team', () => {
    const { container } = render(<StadiumImage homeTeam="BUF" />);
    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img?.getAttribute('src')).toContain('Special:FilePath');
  });

  it('is decorative (aria-hidden, empty alt) when no alt is given', () => {
    const { container } = render(<StadiumImage homeTeam="KC" />);
    const img = container.querySelector('img');
    expect(img?.getAttribute('aria-hidden')).toBe('true');
    expect(img?.getAttribute('alt')).toBe('');
  });

  it('is a content image (real alt, not hidden) when alt is provided', () => {
    const { getByRole } = render(<StadiumImage homeTeam="KC" alt="Arrowhead Stadium — home venue" />);
    const img = getByRole('img', { name: 'Arrowhead Stadium — home venue' });
    expect(img.getAttribute('aria-hidden')).toBeNull();
  });

  it('renders the fallback for an unmapped team', () => {
    const { container, getByTestId } = render(
      <StadiumImage homeTeam="XXX" fallback={<span data-testid="fb">no photo</span>} />,
    );
    expect(container.querySelector('img')).toBeNull();
    expect(getByTestId('fb')).toBeInTheDocument();
  });

  it('swaps to the fallback when the photo fails to load', () => {
    const { container, getByTestId } = render(
      <StadiumImage homeTeam="BUF" fallback={<span data-testid="fb">no photo</span>} />,
    );
    const img = container.querySelector('img')!;
    fireEvent.error(img);
    expect(container.querySelector('img')).toBeNull();
    expect(getByTestId('fb')).toBeInTheDocument();
  });
});
