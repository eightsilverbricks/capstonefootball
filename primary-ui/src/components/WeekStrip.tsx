import React, { useRef, useEffect } from 'react';

interface WeekStripProps {
  availableWeeks: number[];
  selectedWeek: number;
  onChange: (week: number) => void;
}

const PLAYOFF_LABELS: Record<number, string> = {
  19: 'Wild Card',
  20: 'Divisional',
  21: 'Conf. Champ.',
  22: 'Super Bowl',
};

function weekLabel(week: number): string {
  return PLAYOFF_LABELS[week] ?? `Wk ${week}`;
}

function isPlayoff(week: number): boolean {
  return week >= 19;
}

const WeekStrip: React.FC<WeekStripProps> = ({ availableWeeks, selectedWeek, onChange }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  // Scroll selected week into view on mount / change
  useEffect(() => {
    if (activeRef.current && scrollRef.current) {
      const container = scrollRef.current;
      const btn = activeRef.current;
      const containerRect = container.getBoundingClientRect();
      const btnRect = btn.getBoundingClientRect();
      const offset = btnRect.left - containerRect.left - containerRect.width / 2 + btnRect.width / 2;
      container.scrollBy({ left: offset, behavior: 'smooth' });
    }
  }, [selectedWeek]);

  // Split into regular + playoff
  const regular = availableWeeks.filter((w) => w < 19);
  const playoff = availableWeeks.filter((w) => w >= 19);

  return (
    <div className="border-b border-white/8 bg-[#0d0d18]">
      <div className="max-w-7xl mx-auto px-4">
        <div
          ref={scrollRef}
          className="flex items-center gap-0.5 overflow-x-auto py-3 scrollbar-none"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {/* Regular season weeks */}
          {regular.map((week) => {
            const active = week === selectedWeek;
            return (
              <button
                key={week}
                ref={active ? activeRef : undefined}
                onClick={() => onChange(week)}
                className={`shrink-0 px-2.5 py-1.5 rounded text-xs font-medium transition-all ${
                  active
                    ? 'bg-white text-[#0a0a12]'
                    : 'text-white/40 hover:text-white hover:bg-white/8'
                }`}
              >
                {weekLabel(week)}
              </button>
            );
          })}

          {/* Divider before playoffs */}
          {playoff.length > 0 && (
            <div className="shrink-0 mx-2 h-5 w-px bg-white/15" />
          )}

          {/* Playoff weeks */}
          {playoff.map((week) => {
            const active = week === selectedWeek;
            return (
              <button
                key={week}
                ref={active ? activeRef : undefined}
                onClick={() => onChange(week)}
                className={`shrink-0 px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                  active
                    ? 'text-[#0a0a12]'
                    : 'hover:text-white'
                }`}
                style={
                  active
                    ? { background: 'linear-gradient(135deg, #c8a96e, #e8c97e)' }
                    : { color: '#c8a96e', background: 'rgba(200,169,110,0.1)' }
                }
              >
                {weekLabel(week)}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default WeekStrip;
