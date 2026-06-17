import React from 'react';
import { getTeamColors } from '@/data/nflData';
import { Pick } from '@/competition/types';

interface ConfidenceSliderProps {
  awayTeam: string;
  homeTeam: string;
  pick: Pick;
  onChange: (pick: Pick) => void;
  disabled?: boolean;
}

// The control is anchored at the center (50/50 = no position). Distance from
// center is the confidence; the side you drag toward is the team you back.
// "lean" ∈ [0,100]: 100 = fully home, 0 = fully away, 50 = no position.
function pickToLean(pick: Pick, homeTeam: string): number {
  const delta = (pick.confidence - 0.5) * 100; // 0..50
  return pick.team === homeTeam ? 50 + delta : 50 - delta;
}

function leanToPick(lean: number, awayTeam: string, homeTeam: string): Pick {
  const team = lean >= 50 ? homeTeam : awayTeam;
  const confidence = 0.5 + Math.abs(lean - 50) / 100;
  return { team, confidence };
}

/**
 * Confidence slider — a visual sibling of WinProbBar. Team-color fills, a
 * center 50/50 tick, percentage labels outside the bar ends, and a draggable
 * thumb. A transparent native range input is overlaid for keyboard + pointer
 * accessibility.
 */
const ConfidenceSlider: React.FC<ConfidenceSliderProps> = ({
  awayTeam, homeTeam, pick, onChange, disabled = false,
}) => {
  const awayColors = getTeamColors(awayTeam);
  const homeColors = getTeamColors(homeTeam);

  const lean = Math.round(pickToLean(pick, homeTeam));
  const awayPct = 100 - lean;
  const homePct = lean;
  const backsHome = lean > 50;
  const backsAway = lean < 50;

  const handle = (raw: number) => {
    if (disabled) return;
    onChange(leanToPick(raw, awayTeam, homeTeam));
  };

  return (
    <div className={disabled ? 'opacity-70' : ''}>
      {/* Labels outside the bar ends — mirrors WinProbBar */}
      <div className="flex justify-between items-baseline mb-2">
        <span
          className="text-xs font-semibold tracking-wide tabular-nums"
          style={{ color: backsAway ? (awayColors.secondary || '#f0f0f0') : 'var(--text-tertiary)' }}
        >
          {awayTeam} {awayPct}%
        </span>
        <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
          your confidence
        </span>
        <span
          className="text-xs font-semibold tracking-wide tabular-nums"
          style={{ color: backsHome ? (homeColors.secondary || '#f0f0f0') : 'var(--text-tertiary)' }}
        >
          {homePct}% {homeTeam}
        </span>
      </div>

      {/* Track + thumb + overlaid range input */}
      <div className="relative h-5 flex items-center">
        <div
          className="relative h-2 w-full rounded-full overflow-hidden flex"
          style={{ background: 'var(--surface-overlay)' }}
        >
          <div
            className="h-full"
            style={{
              width: `${awayPct}%`,
              backgroundColor: awayColors.primary,
              opacity: backsAway ? 1 : 0.25,
              transition: `width var(--duration-fast) var(--ease-out)`,
            }}
          />
          <div
            className="h-full"
            style={{
              width: `${homePct}%`,
              backgroundColor: homeColors.primary,
              opacity: backsHome ? 1 : 0.25,
              transition: `width var(--duration-fast) var(--ease-out)`,
            }}
          />
          {/* 50% no-position mark */}
          <div
            className="absolute inset-y-0 w-px"
            style={{ left: '50%', backgroundColor: 'rgba(255,255,255,0.22)' }}
          />
        </div>

        {/* Thumb */}
        <div
          className="absolute w-3.5 h-3.5 rounded-full pointer-events-none"
          style={{
            left: `${lean}%`,
            transform: 'translateX(-50%)',
            background: 'var(--text-primary)',
            border: `2px solid ${backsHome ? homeColors.primary : backsAway ? awayColors.primary : 'var(--text-muted)'}`,
            boxShadow: '0 0 0 3px var(--bg)',
            transition: `left var(--duration-fast) var(--ease-out)`,
          }}
        />

        {/* Accessible interaction layer */}
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={lean}
          disabled={disabled}
          onChange={(e) => handle(Number(e.target.value))}
          aria-label={`Confidence slider: ${awayTeam} versus ${homeTeam}`}
          aria-valuetext={
            lean === 50
              ? 'No position, 50/50'
              : `${backsHome ? homeTeam : awayTeam} ${Math.max(awayPct, homePct)} percent confidence`
          }
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed m-0"
        />
      </div>
    </div>
  );
};

export default ConfidenceSlider;
