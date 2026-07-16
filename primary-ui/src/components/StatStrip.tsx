import React from 'react';

export interface StatStripItem {
  label: string;
  value: string;
  color?: string;
}

interface StatStripProps {
  items: StatStripItem[];
}

/**
 * The app's one shared stat treatment — an editorial number row, not a boxed
 * dashboard grid. Hairline dividers between cells, Fraunces numerals, muted
 * uppercase labels. Used identically on the homepage hero and My Season so
 * "a row of stats" always reads the same way across the app.
 */
const StatStrip: React.FC<StatStripProps> = ({ items }) => (
  <div
    className="flex flex-wrap"
    style={{ borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)' }}
  >
    {items.map((item, i) => (
      <div
        key={item.label}
        className="flex-1 min-w-[7rem] py-4 px-5 flex flex-col gap-1"
        style={{ borderLeft: i > 0 ? '1px solid var(--border-subtle)' : 'none' }}
      >
        <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
          {item.label}
        </span>
        <span
          className="font-bold tabular-nums leading-none"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(1.5rem,3vw,2.25rem)',
            color: item.color ?? 'var(--text-primary)',
          }}
        >
          {item.value}
        </span>
      </div>
    ))}
  </div>
);

export default StatStrip;
