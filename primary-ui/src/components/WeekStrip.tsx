import { useEffect, useRef } from 'react';
import { weekShortLabel } from '@/lib/currentWeek';

interface WeekStripProps {
  availableWeeks: number[];
  selectedWeek: number;
  onChange: (week: number) => void;
  /** Your record per week, shown under past weeks. */
  records?: Record<number, string>;
}

/** Week tabs; the selected week stays centred and past weeks show your record. */
export default function WeekStrip({ availableWeeks, selectedWeek, onChange, records = {} }: WeekStripProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const c = scrollRef.current, b = activeRef.current;
    if (!c || !b) return;
    const offset = b.getBoundingClientRect().left - c.getBoundingClientRect().left - c.clientWidth / 2 + b.clientWidth / 2;
    c.scrollBy({ left: offset, behavior: 'smooth' });
  }, [selectedWeek]);

  return (
    <div ref={scrollRef} role="tablist" aria-label="Week" className="week-strip">
      {availableWeeks.map((week) => {
        const active = week === selectedWeek;
        return (
          <button key={week} ref={active ? activeRef : undefined} role="tab" aria-selected={active} onClick={() => onChange(week)}>
            {weekShortLabel(week)}
            {records[week] && <small>{records[week]}</small>}
          </button>
        );
      })}
    </div>
  );
}
