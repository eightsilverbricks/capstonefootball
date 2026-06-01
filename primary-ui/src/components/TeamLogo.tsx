import React, { useState } from 'react';
import { getEspnLogoUrl, getTeamColors } from '@/data/nflData';

interface TeamLogoProps {
  abbr: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showRing?: boolean;
}

const SIZES = {
  sm:  'w-8 h-8 text-xs',
  md:  'w-12 h-12 text-sm',
  lg:  'w-16 h-16 text-base',
  xl:  'w-24 h-24 text-xl',
};

const IMG_SIZES = {
  sm:  32,
  md:  48,
  lg:  64,
  xl:  96,
};

const TeamLogo: React.FC<TeamLogoProps> = ({ abbr, size = 'md', className = '', showRing = false }) => {
  const [failed, setFailed] = useState(false);
  const colors = getTeamColors(abbr);
  const sizeClass = SIZES[size];
  const px = IMG_SIZES[size];

  const ringStyle = showRing
    ? { boxShadow: `0 0 0 2px ${colors.primary}` }
    : {};

  if (!failed) {
    return (
      <img
        src={getEspnLogoUrl(abbr)}
        alt={abbr}
        width={px}
        height={px}
        className={`${sizeClass} rounded-full object-contain ${className}`}
        style={{ background: 'rgba(255,255,255,0.06)', ...ringStyle }}
        onError={() => setFailed(true)}
        loading="lazy"
      />
    );
  }

  // Fallback: colored circle with abbreviation
  return (
    <div
      className={`${sizeClass} rounded-full flex items-center justify-center font-bold ${className}`}
      style={{ backgroundColor: colors.primary, color: colors.text, ...ringStyle }}
    >
      {abbr.slice(0, 3)}
    </div>
  );
};

export default TeamLogo;
