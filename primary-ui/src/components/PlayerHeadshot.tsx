import React, { useState } from 'react';
import TeamLogo from '@/components/TeamLogo';
import { getTeamColors } from '@/data/nflData';

interface PlayerHeadshotProps {
  /** ESPN player id — when absent or the image 404s, falls back to TeamLogo. */
  espnId?: string | null;
  /** Player's display name, used as the image's accessible alt text. */
  name?: string | null;
  teamAbbr: string;
  size?: number;
  /** Only the single above-the-fold banner image should be eager + high priority. */
  priority?: boolean;
  className?: string;
}

/**
 * Real QB/RB headshot when an espn_id is available (see nfl-prediction's
 * build_player_context.py gsis_id -> espn_id join), gated per
 * CLARK_REPORT_AND_VIRALITY_PLAN.md C3. Same onError-fallback shape as
 * TeamLogo so a broken image never renders empty.
 */
const PlayerHeadshot: React.FC<PlayerHeadshotProps> = ({
  espnId, name, teamAbbr, size = 56, priority = false, className = '',
}) => {
  const [failed, setFailed] = useState(false);
  const colors = getTeamColors(teamAbbr);

  if (!espnId || failed) {
    return <TeamLogo abbr={teamAbbr} className={className} />;
  }

  return (
    <img
      src={`https://a.espncdn.com/i/headshots/nfl/players/full/${espnId}.png`}
      alt={name || teamAbbr}
      width={size}
      height={size}
      className={`rounded-full object-cover ${className}`}
      style={{ background: 'rgba(255,255,255,0.06)', boxShadow: `0 0 0 2px ${colors.primary}` }}
      loading={priority ? 'eager' : 'lazy'}
      // React 18 doesn't special-case fetchPriority (added in React 19), so
      // pass the real lowercase HTML attribute directly to avoid its
      // "does not recognize the fetchPriority prop" warning.
      {...{ fetchpriority: priority ? 'high' : 'auto' }}
      onError={() => setFailed(true)}
    />
  );
};

export default PlayerHeadshot;
