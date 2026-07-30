import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import Bobblehead from './Bobblehead';
import BobbleheadRow from './BobbleheadRow';
import { FOUNDERS, Founder } from '@/data/founders';
import { getTeamColors } from '@/data/nflData';

const zane = FOUNDERS.find((f) => f.id === 'zane') as Founder;

describe('Bobblehead', () => {
  afterEach(cleanup);

  it('describes the figure for screen readers', () => {
    render(<Bobblehead founder={zane} />);
    expect(
      screen.getByRole('img', { name: 'Zane Wolf bobblehead in a Bills number 17 jersey' }),
    ).toBeInTheDocument();
  });

  it('paints the jersey in the real team colors', () => {
    const { container } = render(<Bobblehead founder={zane} />);
    const colors = getTeamColors('BUF');
    const fills = [...container.querySelectorAll('[fill]')].map((el) => el.getAttribute('fill'));
    expect(fills).toContain(colors.primary);
    expect(fills).toContain(colors.secondary);
  });

  it('puts the jersey number on the torso and the first name on the base', () => {
    const { container } = render(<Bobblehead founder={zane} />);
    const text = [...container.querySelectorAll('text')].map((t) => t.textContent);
    expect(text).toContain('17');
    expect(text).toContain('ZANE');
  });

  it('staggers the bob so the figures do not move in lockstep', () => {
    const { container } = render(<Bobblehead founder={zane} index={2} />);
    const head = container.querySelector('.bobble-head') as HTMLElement;
    expect(head).toBeTruthy();
    expect(head.style.animationDelay).toBe('380ms');
  });

  it('draws the face by default when no photo is provided', () => {
    const { container } = render(<Bobblehead founder={zane} />);
    expect(container.querySelector('image')).toBeNull();
  });

  it('uses the photo cutout when the founder opts in', () => {
    const { container } = render(<Bobblehead founder={{ ...zane, photo: true }} />);
    const image = container.querySelector('image');
    expect(image).not.toBeNull();
    expect(image?.getAttribute('href')).toBe('/founders/zane.png');
  });

  it('falls back to the drawn face when the photo fails to load', () => {
    const { container } = render(<Bobblehead founder={{ ...zane, photo: true }} />);
    fireEvent.error(container.querySelector('image')!);
    expect(container.querySelector('image')).toBeNull();
    // The drawn face is back — the base nameplate is still there either way.
    expect([...container.querySelectorAll('text')].map((t) => t.textContent)).toContain('ZANE');
  });

  it('stays fluid so it can shrink on narrow screens', () => {
    const { container } = render(<Bobblehead founder={zane} size={120} />);
    const svg = container.querySelector('svg') as SVGElement;
    expect(svg.style.width).toBe('100%');
    expect(svg.style.maxWidth).toBe('120px');
  });
});

describe('BobbleheadRow', () => {
  afterEach(cleanup);

  it('renders all three founders in jersey order', () => {
    render(<BobbleheadRow />);
    const figures = screen.getAllByRole('img');
    expect(figures).toHaveLength(3);
    expect(figures[0]).toHaveAccessibleName(/Takuo Yamamoto.*Seahawks number 11/);
    expect(figures[1]).toHaveAccessibleName(/Nicholas Chan.*Giants number 6/);
    expect(figures[2]).toHaveAccessibleName(/Zane Wolf.*Bills number 17/);
  });

  it('shows names and fan lines when captions are on', () => {
    render(<BobbleheadRow />);
    expect(screen.getByText('Zane Wolf')).toBeInTheDocument();
    expect(screen.getByText('Bills Mafia — table included.')).toBeInTheDocument();
    expect(screen.getByText('Bills · Co-founder')).toBeInTheDocument();
  });

  it('drops the captions when asked', () => {
    render(<BobbleheadRow showCaptions={false} />);
    expect(screen.queryByText('Zane Wolf')).not.toBeInTheDocument();
    expect(screen.getAllByRole('img')).toHaveLength(3);
  });

  it('gives the centre figure more presence than the outer two', () => {
    const { container } = render(<BobbleheadRow size={100} showCaptions={false} />);
    const svgs = [...container.querySelectorAll('svg')];
    expect(svgs[0].style.maxWidth).toBe('100px');
    expect(svgs[1].style.maxWidth).toBe('115px');
    expect(svgs[2].style.maxWidth).toBe('100px');
  });
});
