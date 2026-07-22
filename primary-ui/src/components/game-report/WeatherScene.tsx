import React from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface WeatherSceneProps {
  windMph: number;
  isOutdoor: boolean;
  accentColor: string;
}

/**
 * Weather atmosphere layer — grounded ONLY in the fields the data actually
 * has (temp/wind/roof). There is no precipitation signal in game.weather, so
 * this deliberately does NOT render sun/rain/snow glyphs — that would be
 * fabricating a condition the data doesn't support. Wind is real, so wind
 * motion lines are the one atmospheric cue this renders, scaled by wind_mph.
 * Compositor-friendly (opacity/transform only) and frozen under
 * prefers-reduced-motion.
 */
const WeatherScene: React.FC<WeatherSceneProps> = ({ windMph, isOutdoor, accentColor }) => {
  const reducedMotion = useReducedMotion();
  if (!isOutdoor || windMph < 11) return null;

  const lineCount = windMph >= 31 ? 7 : windMph >= 21 ? 5 : 3;
  const opacity = windMph >= 31 ? 0.4 : windMph >= 21 ? 0.3 : 0.2;

  return (
    <svg
      className="absolute inset-0 w-full h-full"
      viewBox="0 0 400 160"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      style={{ opacity }}
    >
      {Array.from({ length: lineCount }).map((_, i) => {
        const y = 20 + i * 16;
        const width = 40 + (i % 3) * 20;
        return (
          <line
            key={i}
            x1={-width}
            y1={y}
            x2={0}
            y2={y}
            stroke={accentColor}
            strokeWidth="2"
            strokeLinecap="round"
          >
            {!reducedMotion && (
              <animate
                attributeName="x1"
                values={`-${width};440;-${width}`}
                dur={`${5 - Math.min(windMph / 20, 3)}s`}
                repeatCount="indefinite"
                begin={`${i * 0.6}s`}
              />
            )}
            {!reducedMotion && (
              <animate
                attributeName="x2"
                values={`0;${440 + width};0`}
                dur={`${5 - Math.min(windMph / 20, 3)}s`}
                repeatCount="indefinite"
                begin={`${i * 0.6}s`}
              />
            )}
          </line>
        );
      })}
    </svg>
  );
};

export default WeatherScene;
