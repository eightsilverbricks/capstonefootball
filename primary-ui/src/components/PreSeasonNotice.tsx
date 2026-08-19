import React from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock, ArrowRight } from 'lucide-react';
import { useSeasonMode } from '@/context/SeasonModeContext';
import { DEMO_SEASON, daysUntilKickoff, isPreSeason } from '@/lib/season';

/**
 * Shown while the live season has not kicked off. Without it the site reads as
 * broken for the weeks before week 1: every record is 0-0, every pick is
 * pending, and nothing resolves — which is correct, but looks like a bug. This
 * says so plainly and points at demo mode, which is the thing that does work.
 */
const PreSeasonNotice: React.FC = () => {
  const { config, setMode } = useSeasonMode();

  // Nothing to explain once the season is under way, or while already in demo.
  if (config.isDemo || !isPreSeason()) return null;

  const days = daysUntilKickoff();

  return (
    <div
      className="rounded-xl px-4 py-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-[13px]"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        color: 'var(--text-secondary)',
      }}
    >
      <CalendarClock size={16} style={{ color: 'var(--accent-gold)' }} className="shrink-0" />
      <span>
        <strong style={{ color: 'var(--text-primary)' }}>
          {config.season} kicks off in {days} day{days === 1 ? '' : 's'}.
        </strong>{' '}
        These are real forecasts for games nobody has played, so records stay empty until
        results come in.
      </span>
      <button
        onClick={() => setMode('demo')}
        className="inline-flex items-center gap-1.5 ml-auto shrink-0 text-[12.5px]"
        style={{ color: 'var(--accent-gold)' }}
      >
        Try the {DEMO_SEASON} demo <ArrowRight size={13} />
      </button>
    </div>
  );
};

export default PreSeasonNotice;
