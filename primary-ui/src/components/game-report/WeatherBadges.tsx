import React from 'react';
import { Thermometer, ThermometerSnowflake, ThermometerSun, Wind, Building2 } from 'lucide-react';

interface WeatherBadgesProps {
  tempF?: number | null;
  windMph?: number | null;
  isOutdoor: boolean;
  className?: string;
}

// Temperature bands mirror the vocabulary the API already uses in weather.summary
// ("freezing" / "cold" / "cool" / "hot") so the chips never disagree with the
// text elsewhere on the page.
function tempBand(t: number): { label: string; color: string; Icon: typeof Thermometer } {
  if (t <= 32) return { label: 'Freezing', color: '#60a5fa', Icon: ThermometerSnowflake };
  if (t <= 40) return { label: 'Cold',     color: '#7dd3fc', Icon: ThermometerSnowflake };
  if (t <= 55) return { label: 'Cool',     color: '#93c5fd', Icon: Thermometer };
  if (t >= 85) return { label: 'Hot',      color: '#f97316', Icon: ThermometerSun };
  if (t >= 70) return { label: 'Warm',     color: '#fbbf24', Icon: ThermometerSun };
  return { label: 'Mild', color: 'var(--text-secondary)', Icon: Thermometer };
}

function windTier(w: number): { label: string; color: string } {
  if (w >= 31) return { label: 'Severe wind', color: '#ef4444' };
  if (w >= 21) return { label: 'High wind',   color: '#fb923c' };
  if (w >= 11) return { label: 'Moderate',    color: 'var(--status-moderate)' };
  return { label: 'Breeze', color: 'var(--text-tertiary)' };
}

const Chip: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span
    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold tabular-nums"
    style={{
      background: 'rgba(9,9,9,0.55)',
      border: '1px solid var(--border-subtle)',
      color: 'var(--text-secondary)',
    }}
  >
    {children}
  </span>
);

/**
 * Compact, data-grounded weather chips for the game banner. Deliberately renders
 * ONLY what game.weather actually contains — temperature, wind, and indoor/roof
 * state. There is no precipitation or sky-cover field in the data, so this never
 * shows a sun/rain/snow "condition", which would be fabricating weather the model
 * never saw. Wind is only meaningful outdoors, so it's hidden for dome games.
 */
const WeatherBadges: React.FC<WeatherBadgesProps> = ({ tempF, windMph, isOutdoor, className = '' }) => {
  const hasTemp = typeof tempF === 'number';
  const hasWind = isOutdoor && typeof windMph === 'number' && windMph >= 1;

  if (!hasTemp && !hasWind && isOutdoor) return null;

  const band = hasTemp ? tempBand(tempF as number) : null;
  const wind = hasWind ? windTier(windMph as number) : null;

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`} aria-label="Weather conditions">
      {band && (
        <Chip>
          <band.Icon className="w-3.5 h-3.5" style={{ color: band.color }} aria-hidden="true" />
          <span style={{ color: 'var(--text-primary)' }}>{Math.round(tempF as number)}°F</span>
          <span style={{ color: band.color }}>{band.label}</span>
        </Chip>
      )}

      {wind && (
        <Chip>
          <Wind className="w-3.5 h-3.5" style={{ color: wind.color }} aria-hidden="true" />
          <span style={{ color: 'var(--text-primary)' }}>{Math.round(windMph as number)} mph</span>
          <span style={{ color: wind.color }}>{wind.label}</span>
        </Chip>
      )}

      {!isOutdoor && (
        <Chip>
          <Building2 className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} aria-hidden="true" />
          <span style={{ color: 'var(--text-secondary)' }}>Indoors</span>
        </Chip>
      )}
    </div>
  );
};

export default WeatherBadges;
