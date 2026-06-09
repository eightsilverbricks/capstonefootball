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

const WindArc: React.FC<{ windMph: number }> = ({ windMph }) => {
  const ratio = Math.min(windMph / 40, 1);
  const r = 28; const cx = 36; const cy = 36;
  const startAngle = Math.PI;
  const endAngle   = startAngle - Math.PI * ratio;
  const x1 = cx + r * Math.cos(startAngle);
  const y1 = cy + r * Math.sin(startAngle);
  const x2 = cx + r * Math.cos(endAngle);
  const y2 = cy + r * Math.sin(endAngle);
  const largeArc = Math.PI * ratio > Math.PI ? 1 : 0;

  const arcColor =
    windMph >= 31 ? '#ef4444'
    : windMph >= 21 ? '#f97316'
    : windMph >= 11 ? '#fbbf24'
    : 'rgba(255,255,255,0.18)';

  return (
    <svg width="72" height="40" viewBox="0 0 72 40" aria-hidden="true">
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none" stroke="var(--surface-overlay)" strokeWidth="4" strokeLinecap="round"
      />
      {ratio > 0.02 && (
        <path
          d={`M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 0 ${x2} ${y2}`}
          fill="none" stroke={arcColor} strokeWidth="4" strokeLinecap="round"
        />
      )}
      <circle cx={x2} cy={y2} r="3" fill={ratio > 0.02 ? arcColor : 'var(--surface-overlay)'} />
    </svg>
  );
};

const WeatherPanel: React.FC<WeatherPanelProps> = ({ weather, windConsequence }) => {
  if (!weather) return null;

  const isDome  = !weather.is_outdoor
    || weather.roof === 'dome'
    || weather.roof === 'closed'
    || weather.roof === 'retractable';
  const windMph = weather.wind ?? 0;
  const tempF   = weather.temp;

  const tier =
    isDome          ? 'dome'
    : windMph >= 31 ? 'severe'
    : windMph >= 21 ? 'high'
    : windMph >= 11 ? 'moderate'
    : 'calm';

  const tierLabel: Record<string, string> = {
    dome: 'Indoor game', calm: 'Calm', moderate: 'Moderate wind', high: 'High wind', severe: 'Severe wind',
  };
  const tierColor: Record<string, string> = {
    dome: 'var(--text-muted)', calm: 'var(--text-tertiary)',
    moderate: 'var(--status-moderate)', high: '#f97316', severe: '#ef4444',
  };
  const color = tierColor[tier];

  return (
    <section
      className="rounded-lg p-4"
      style={{ border: '1px solid var(--border-default)', background: 'var(--surface)' }}
      aria-label="Weather conditions"
    >
      <h3 className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
        Weather
      </h3>

      {isDome ? (
        <div className="flex items-center gap-3">
          <span className="text-2xl" aria-hidden="true">🏟</span>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Indoors</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>No weather impact</p>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-end gap-4 mb-3">
            <WindArc windMph={windMph} />
            <div className="flex flex-col gap-0.5 pb-1">
              {windMph > 0 && (
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-bold tabular-nums"
                    style={{ fontFamily: 'var(--font-display)', color }}>
                    {Math.round(windMph)}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>mph</span>
                </div>
              )}
              {tempF != null && (
                <span className="text-sm font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                  {Math.round(tempF)}°F
                </span>
              )}
            </div>
          </div>

          <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded mb-2"
            style={{ color, background: `${color}18`, border: `1px solid ${color}30` }}>
            {tierLabel[tier]}
          </span>

          {(windConsequence || (weather.is_notable && weather.summary)) && (
            <p className="text-xs leading-relaxed mt-2" style={{ color: 'var(--text-tertiary)' }}>
              {windConsequence || weather.summary}
            </p>
          )}
        </>
      )}

      {weather.surface && (
        <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <span className="text-[11px] capitalize" style={{ color: 'var(--text-muted)' }}>
            {weather.surface}{weather.roof && tier !== 'dome' ? ` · ${weather.roof}` : ''}
          </span>
        </div>
      )}
    </section>
  );
};

export default WeatherPanel;
