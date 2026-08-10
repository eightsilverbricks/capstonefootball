import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SlateFilter, { FilterCount } from './SlateFilter';

const COUNTS: FilterCount[] = [
  { id: 'all', label: 'Games', count: 16 },
  { id: 'high', label: 'High conf.', count: 4 },
  { id: 'medium', label: 'Medium conf.', count: 7 },
  { id: 'low', label: 'Low conf.', count: 0 },
];

describe('SlateFilter', () => {
  it('reports each bucket count alongside its label', () => {
    render(<SlateFilter counts={COUNTS} active="all" onChange={() => {}} />);
    expect(screen.getByText('Games')).toBeInTheDocument();
    expect(screen.getByText('16')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('marks only the active segment as pressed', () => {
    render(<SlateFilter counts={COUNTS} active="high" onChange={() => {}} />);
    expect(screen.getByRole('button', { name: /High conf/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /Games/ })).toHaveAttribute('aria-pressed', 'false');
  });

  it('reports the chosen filter', () => {
    const onChange = vi.fn();
    render(<SlateFilter counts={COUNTS} active="all" onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: /Medium conf/ }));
    expect(onChange).toHaveBeenCalledWith('medium');
  });

  // An empty bucket that still looks clickable leads straight to a blank page,
  // so those segments are disabled rather than merely dimmed.
  it('disables a bucket with no games and refuses to select it', () => {
    const onChange = vi.fn();
    render(<SlateFilter counts={COUNTS} active="all" onChange={onChange} />);

    const empty = screen.getByRole('button', { name: /Low conf/ });
    expect(empty).toBeDisabled();

    fireEvent.click(empty);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('never disables the all-games segment, so the filter is always escapable', () => {
    const emptyWeek: FilterCount[] = [
      { id: 'all', label: 'Games', count: 0 },
      { id: 'high', label: 'High conf.', count: 0 },
      { id: 'medium', label: 'Medium conf.', count: 0 },
      { id: 'low', label: 'Low conf.', count: 0 },
    ];
    render(<SlateFilter counts={emptyWeek} active="high" onChange={() => {}} />);
    expect(screen.getByRole('button', { name: /Games/ })).toBeEnabled();
  });
});
