// ─── SlateFilter — confidence filter and slate counts in one control ─────────
// These used to be two stacked bands: a StatStrip showing how many high /
// medium / low games the week held, then a separate row of filter links
// repeating the same four labels. The counts *are* the filter, so this is one
// segmented control that both reports and acts.

import React from 'react';
import { ConfidenceFilter } from '@/types/prediction';

export interface FilterCount {
  id: ConfidenceFilter;
  label: string;
  count: number;
}

interface SlateFilterProps {
  counts: FilterCount[];
  active: ConfidenceFilter;
  onChange: (filter: ConfidenceFilter) => void;
}

const SlateFilter: React.FC<SlateFilterProps> = ({ counts, active, onChange }) => (
  <div
    role="group"
    aria-label="Filter the slate by Clark's confidence"
    className="flex flex-wrap"
    style={{ borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)' }}
  >
    {counts.map((item, index) => {
      const isActive = active === item.id;
      const isEmpty = item.count === 0 && item.id !== 'all';

      return (
        <button
          key={item.id}
          type="button"
          onClick={() => onChange(item.id)}
          disabled={isEmpty}
          aria-pressed={isActive}
          // Two-up on phones (four 7rem cells overflow a 375px screen and wrap
          // 3 + 1, stranding the last count on its own row), one row from sm.
          // Dividers follow the same split: column rules between the pairs on
          // mobile, a single row of rules once the cells sit side by side.
          className={[
            'w-1/2 sm:w-auto sm:flex-1 sm:min-w-[7rem] py-4 px-5',
            'flex flex-col gap-1 text-left transition-colors disabled:cursor-not-allowed',
            index % 2 === 1 ? 'border-l' : '',
            index >= 2 ? 'border-t sm:border-t-0' : '',
            index === 0 ? 'sm:border-l-0' : 'sm:border-l',
          ].join(' ')}
          style={{
            borderColor: 'var(--border-subtle)',
            // The active segment is marked with a gold underline rather than a
            // fill, so the row still reads as an editorial stat strip.
            boxShadow: isActive ? 'inset 0 -2px 0 0 var(--accent-gold)' : 'none',
            background: isActive ? 'var(--surface)' : 'transparent',
            opacity: isEmpty ? 0.35 : 1,
          }}
        >
          <span
            className="text-[10px] uppercase tracking-widest"
            style={{ color: isActive ? 'var(--text-secondary)' : 'var(--text-muted)' }}
          >
            {item.label}
          </span>
          <span
            className="font-bold tabular-nums leading-none"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.5rem,3vw,2.25rem)',
              color: isActive ? 'var(--accent-gold)' : 'var(--text-primary)',
            }}
          >
            {item.count}
          </span>
        </button>
      );
    })}
  </div>
);

export default SlateFilter;
