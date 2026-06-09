import React from 'react';
import { getTeamColors } from '@/data/nflData';

interface WinProbBarProps {
  awayTeam: string;
  homeTeam: string;
  awayProb: number;
  homeProb: number;
  predictedWinner: string;
}

const WinProbBar: React.FC<WinProbBarProps> = ({
  awayTeam, homeTeam, awayProb, homeProb, predictedWinner,
}) => {
  const awayColors = getTeamColors(awayTeam);
  const homeColors = getTeamColors(homeTeam);
  const awayPct = Math.round(awayProb * 100);
  const homePct = Math.round(homeProb * 100);
  const awayWins = predictedWinner === awayTeam;
  const homeWins = predictedWinner === homeTeam;

  return (
    <div>
      <div className="flex justify-between items-baseline mb-2">
        <span
          className="text-xs font-semibold tracking-wide"
          style={{ color: awayWins ? (awayColors.secondary || '#f0f0f0') : 'var(--text-tertiary)' }}
        >
          {awayTeam} {awayPct}%
        </span>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>win probability</span>
        <span
          className="text-xs font-semibold tracking-wide"
          style={{ color: homeWins ? (homeColors.secondary || '#f0f0f0') : 'var(--text-tertiary)' }}
        >
          {homePct}% {homeTeam}
        </span>
      </div>

      <div
        className="relative h-2 rounded-full overflow-hidden flex"
        style={{ background: 'var(--surface-overlay)' }}
      >
        <div
          className="h-full"
          style={{
            width: `${awayPct}%`,
            backgroundColor: awayColors.primary,
            opacity: awayWins ? 1 : 0.25,
            transition: `width var(--duration-normal) var(--ease-out)`,
          }}
        />
        <div
          className="h-full"
          style={{
            width: `${homePct}%`,
            backgroundColor: homeColors.primary,
            opacity: homeWins ? 1 : 0.25,
            transition: `width var(--duration-normal) var(--ease-out)`,
          }}
        />
        {/* 50% mark */}
        <div
          className="absolute inset-y-0 w-px"
          style={{ left: '50%', backgroundColor: 'rgba(255,255,255,0.18)' }}
        />
      </div>
    </div>
  );
};

export default WinProbBar;
