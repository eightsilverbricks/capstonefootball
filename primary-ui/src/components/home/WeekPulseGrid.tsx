import React from 'react';
import { Link } from 'react-router-dom';
import { CloudLightning, Crosshair, Scale, Signpost, TrendingUp } from 'lucide-react';
import { PulseItem, PulseKind } from '@/lib/weekPulse';
import { gameKey } from '@/lib/threeWaySignal';

const ICONS: Record<PulseKind, React.ComponentType<{ className?: string }>> = {
  lock: Crosshair,
  contrarian: Signpost,
  weather: CloudLightning,
  coinFlip: Scale,
  roadPick: TrendingUp,
};

interface WeekPulseGridProps {
  items: PulseItem[];
}

/**
 * Four small reads on the week, each linking straight into the game it's about.
 * Which four you get depends on the slate — see lib/weekPulse.ts. A widget only
 * appears when the data genuinely supports it, so an unremarkable week shows
 * three cards rather than four filled with padding.
 */
const WeekPulseGrid: React.FC<WeekPulseGridProps> = ({ items }) => {
  if (items.length === 0) return null;

  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 list-none p-0 m-0">
      {items.map((item, i) => {
        const Icon = ICONS[item.kind];
        return (
          <li
            key={`${item.kind}:${gameKey(item.game)}`}
            className="rise-in"
            style={{ '--rise-delay': `${i * 70}ms` } as React.CSSProperties}
          >
            <Link
              to={`/game/${item.game.season}/${item.game.week}/${item.game.away_team}/${item.game.home_team}`}
              className="lift-card flex flex-col h-full gap-2 p-4 rounded-xl no-underline"
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border-subtle)',
                borderTop: `2px solid ${item.accent}`,
              }}
            >
              <span
                className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em]"
                style={{ color: item.accent }}
              >
                <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                {item.label}
              </span>

              <span
                className="font-bold tabular-nums leading-none"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(1.5rem, 3vw, 2rem)',
                  color: 'var(--text-primary)',
                }}
              >
                {item.value}
              </span>

              <span className="text-xs leading-snug mt-auto" style={{ color: 'var(--text-tertiary)' }}>
                {item.detail}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
};

export default WeekPulseGrid;
