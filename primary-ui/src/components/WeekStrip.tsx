import React, { useRef, useEffect } from 'react';
import { weekShortLabel } from '@/lib/currentWeek';

interface WeekStripProps {
  availableWeeks: number[];
  selectedWeek: number;
  onChange: (week: number) => void;
}

/** Horizontal week selector — a plain tab row under the header. */
const WeekStrip: React.FC<WeekStripProps> = ({ availableWeeks, selectedWeek, onChange }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  // Keep the selected week centred in view.
  useEffect(() => {
    if (activeRef.current && scrollRef.current) {
      const container = scrollRef.current;
      const containerRect = container.getBoundingClientRect();
      const btnRect = activeRef.current.getBoundingClientRect();
      const offset = btnRect.left - containerRect.left - containerRect.width / 2 + btnRect.width / 2;
      container.scrollBy({ left: offset, behavior: 'smooth' });
    }
  }, [selectedWeek]);

  return (
    <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--divider)' }}>
      <div className="mx-auto px-4" style={{ maxWidth: 'var(--content-max)' }}>
        <div
          ref={scrollRef}
          role="tablist"
          aria-label="Week"
          className="flex items-stretch overflow-x-auto"
          style={{ scrollbarWidth: 'none' }}
        >
          {availableWeeks.map((week) => {
            const active = week === selectedWeek;
            return (
              <button
                key={week}
                ref={active ? activeRef : undefined}
                role="tab"
                aria-selected={active}
                onClick={() => onChange(week)}
                className="relative shrink-0 px-3 py-3 text-[13px] font-medium whitespace-nowrap transition-colors hover:text-[var(--text-primary)]"
                style={{ color: active ? 'var(--text-primary)' : 'var(--text-tertiary)' }}
              >
                {weekShortLabel(week)}
                {active && (
                  <span className="absolute left-2 right-2 bottom-0 h-[3px] rounded-t" style={{ background: 'var(--brand)' }} aria-hidden="true" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default WeekStrip;
