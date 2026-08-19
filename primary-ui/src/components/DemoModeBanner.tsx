import React from 'react';
import { FlaskConical } from 'lucide-react';
import { useSeasonMode } from '@/context/SeasonModeContext';
import { LIVE_SEASON } from '@/lib/season';

/**
 * Persistent marker that the numbers on screen are not the live season. Demo
 * mode changes every record and result on the site, so it must never be
 * possible to forget it is on — an unlabelled completed season looks exactly
 * like a live one that is going unusually well.
 */
const DemoModeBanner: React.FC = () => {
  const { config, setMode } = useSeasonMode();
  if (!config.isDemo) return null;

  return (
    <div
      className="w-full px-4 py-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[12.5px]"
      style={{ background: 'rgba(200,169,110,0.10)', borderBottom: '1px solid rgba(200,169,110,0.30)' }}
    >
      <FlaskConical size={14} style={{ color: 'var(--accent-gold)' }} />
      <span style={{ color: 'var(--text-secondary)' }}>
        Demo mode — showing the completed {config.season} season. Picks here don't count toward
        your {LIVE_SEASON} record.
      </span>
      <button
        onClick={() => setMode('live')}
        className="underline underline-offset-2"
        style={{ color: 'var(--accent-gold)' }}
      >
        Switch to {LIVE_SEASON}
      </button>
    </div>
  );
};

export default DemoModeBanner;
