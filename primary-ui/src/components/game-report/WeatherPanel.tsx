import React from 'react';

interface WeatherData {
  temp?: number | null;
  wind?: number | null;
  surface?: string;
  roof?: string | null;
  stadium?: string | null;
  is_outdoor?: boolean;
  is_notable?: boolean;
  summary?: string;
}

interface WeatherPanelProps {
  weather?: WeatherData;
  windConsequence?: string;
}

const WindArc: React.FC<{ windMph: number; color: string }> = ({ windMph, color }) => {
  const ratio = Math.min(windMph / 40, 1);
  const r = 28; const cx = 36; const cy = 36;
  const startAngle = Math.PI;
  const endAngle   = startAngle - Math.PI * ratio;
  const x1 = cx + r * Math.cos(startAngle);
  const y1 = cy + r * Math.sin(startAngle);
  const x2 = cx + r * Math.cos(endAngle);
  const y2 = cy + r * Math.sin(endAngle);
  const largeArc = Math.PI * ratio > Math.PI ? 1 : 0;

  return (
    <svg width="72" height="40" viewBox="0 0 72 40" aria-hidden="true">
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none" stroke="var(--surface-overlay)" strokeWidth="4" strokeLinecap="round"
      />
      {ratio > 0.02 && (
        <path
          d={`M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 0 ${x2} ${y2}`}
          fill="none" stroke={color} strokeWidth="4" strokeLinecap="round"
        />
      )}
      <circle cx={x2} cy={y2} r="3" fill={ratio > 0.02 ? color : 'var(--surface-overlay)'} />
    </svg>
  );
};

const Thermometer: React.FC<{ tempF: number }> = ({ tempF }) => {
  const bulbColor =
    tempF <= 32 ? '#60a5fa'
    : tempF <= 50 ? '#7dd3fc'
    : tempF >= 85 ? '#f97316'
    : tempF >= 70 ? '#fbbf24'
    : 'var(--text-tertiary)';
  return (
    <svg width="10" height="14" viewBox="0 0 10 14" aria-hidden="true">
      <rect x="3.5" y="1" width="3" height="8" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1" />
      <circle cx="5" cy="11" r="2.5" fill={bulbColor} />
    </svg>
  );
};

const RoofIcon: React.FC<{ roof: string }> = ({ roof }) => {
  const closed = ['dome', 'closed', 'retractable'].includes(roof.toLowerCase());
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true">
      {closed
        ? <path d="M1 6 L6 2 L11 6 L11 10 L1 10 Z" fill="none" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" />
        : <path d="M1 6 L6 2 L11 6 M2 6 L2 10 M10 6 L10 10" fill="none" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" />}
    </svg>
  );
};

const SurfaceIcon: React.FC<{ surface: string }> = ({ surface }) => {
  const isGrass = surface.toLowerCase().includes('grass');
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true">
      {isGrass
        ? <path d="M2 10 L3 5 M5 10 L6 3 M8 10 L9 5 M10 10 L10 6" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
        : <rect x="1.5" y="3" width="9" height="7" fill="none" stroke="currentColor" strokeWidth="1" />}
    </svg>
  );
};

type Tier = 'dome' | 'calm' | 'moderate' | 'high' | 'severe';

const TIER_GLYPH: Record<Tier, string> = {
  dome: '▢', calm: '■', moderate: '▲', high: '▲', severe: '▲▲',
};
const TIER_LABEL: Record<Tier, string> = {
  dome: 'Indoor game', calm: 'Calm', moderate: 'Moderate wind', high: 'High wind', severe: 'Severe wind',
};
const TIER_COLOR: Record<Tier, string> = {
  dome: 'var(--text-tertiary)',
  calm: 'var(--text-tertiary)',
  moderate: 'var(--status-moderate)',
  high: '#fb923c',
  severe: '#ef4444',
};

function classifyTier(isDome: boolean, windMph: number): Tier {
  if (isDome) return 'dome';
  if (windMph >= 31) return 'severe';
  if (windMph >= 21) return 'high';
  if (windMph >= 11) return 'moderate';
  return 'calm';
}

const WeatherPanel: React.FC<WeatherPanelProps> = ({ weather, windConsequence }) => {
  if (!weather) return null;

  const isDome  = !weather.is_outdoor
    || weather.roof === 'dome'
    || weather.roof === 'closed'
    || weather.roof === 'retractable';
  const windMph = weather.wind ?? 0;
  const tempF   = weather.temp;

  const tier = classifyTier(isDome, windMph);
  const color = TIER_COLOR[tier];
  const glyph = TIER_GLYPH[tier];
  const label = TIER_LABEL[tier];

  const summary = weather.summary ?? '';
  const isWet = /rain|snow|sleet|shower|storm/i.test(summary);

  const ariaLabel = isDome
    ? 'Weather: indoor game, no impact'
    : `Weather: ${label.toLowerCase()}${windMph ? `, ${Math.round(windMph)} miles per hour` : ''}${tempF != null ? `, ${Math.round(tempF)} degrees Fahrenheit` : ''}`;

  return (
    <section
      className="rounded-lg p-4"
      style={{ border: '1px solid var(--border-default)', background: 'var(--surface)' }}
      aria-label={ariaLabel}
    >
      <h3 className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
        Weather
      </h3>

      {isDome ? (
        <div className="flex items-center gap-3">
          <span className="text-2xl" aria-hidden="true">🏟</span>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Indoors</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>No weather impact</p>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-end gap-4 mb-3">
            <WindArc windMph={windMph} color={color} />
            <div className="flex flex-col gap-1 pb-1">
              {windMph > 0 && (
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-bold tabular-nums"
                    style={{ fontFamily: 'var(--font-display)', color }}>
                    {Math.round(windMph)}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>mph</span>
                </div>
              )}
              {tempF != null && (
                <div className="flex items-center gap-1.5" style={{ color: 'var(--text-tertiary)' }}>
                  <Thermometer tempF={tempF} />
                  <span className="text-sm font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                    {Math.round(tempF)}°F
                  </span>
                </div>
              )}
            </div>
          </div>

          <span
            data-tier={tier}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded mb-2"
            style={{ color, background: `${color}18`, border: `1px solid ${color}30` }}
          >
            <span aria-hidden="true" className="font-mono leading-none">{glyph}</span>
            {label}
          </span>

          {isWet && (
            <span
              className="inline-block ml-1.5 text-xs font-semibold px-2 py-0.5 rounded mb-2"
              style={{ color: '#7dd3fc', background: 'rgba(125,211,252,0.10)', border: '1px solid rgba(125,211,252,0.25)' }}
            >
              Wet conditions
            </span>
          )}

          {(windConsequence || (weather.is_notable && weather.summary)) && (
            <p className="text-xs leading-relaxed mt-2" style={{ color: 'var(--text-secondary)' }}>
              {windConsequence || weather.summary}
            </p>
          )}
        </>
      )}

      {(weather.surface || (weather.roof && !isDome)) && (
        <div className="mt-3 pt-3 flex flex-wrap items-center gap-3"
          style={{ borderTop: '1px solid var(--border-subtle)' }}>
          {weather.surface && (
            <span className="inline-flex items-center gap-1.5 text-[11px] capitalize"
              style={{ color: 'var(--text-tertiary)' }}>
              <SurfaceIcon surface={weather.surface} />
              {weather.surface}
            </span>
          )}
          {weather.roof && !isDome && (
            <span className="inline-flex items-center gap-1.5 text-[11px] capitalize"
              style={{ color: 'var(--text-tertiary)' }}>
              <RoofIcon roof={weather.roof} />
              {weather.roof}
            </span>
          )}
        </div>
      )}
    </section>
  );
};

export default WeatherPanel;
