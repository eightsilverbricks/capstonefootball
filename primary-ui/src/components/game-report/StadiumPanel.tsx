import React from 'react';
import { STADIUM_META, projectLatLng } from '@/data/stadiumMeta';
import { getTeamColors } from '@/data/nflData';

interface StadiumPanelProps {
  stadium?: string | null;
  surface?: string;
  roof?: string | null;
  location?: string;
  homeTeam?: string;
}

const ROOF_LABEL: Record<string, string> = {
  dome: 'Dome', closed: 'Closed roof', retractable: 'Retractable', outdoors: 'Open air', open: 'Open air',
};

const US_OUTLINE_PATH =
  'M 12 78 L 18 60 L 35 50 L 52 38 L 70 30 L 95 22 L 130 18 L 175 18 L 220 22 L 250 30 L 268 40 L 282 52 L 295 62 L 305 75 L 308 95 L 304 115 L 295 130 L 280 140 L 260 145 L 235 148 L 210 150 L 185 152 L 155 152 L 125 148 L 100 142 L 78 135 L 58 125 L 40 110 L 25 98 L 15 90 Z';

interface USMapProps {
  lat: number;
  lng: number;
  markerColor: string;
}

const USMap: React.FC<USMapProps> = ({ lat, lng, markerColor }) => {
  const W = 320, H = 160;
  const { x, y } = projectLatLng(lat, lng, W, H);
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height="auto"
      aria-hidden="true"
      style={{ display: 'block' }}
    >
      <path
        d={US_OUTLINE_PATH}
        fill="var(--surface-overlay)"
        stroke="var(--border-emphasis)"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      <circle cx={x} cy={y} r="9" fill={markerColor} fillOpacity="0.2" />
      <circle cx={x} cy={y} r="5" fill={markerColor} fillOpacity="0.4" />
      <circle cx={x} cy={y} r="2.5" fill={markerColor} />
    </svg>
  );
};

const StadiumPanel: React.FC<StadiumPanelProps> = ({ stadium, surface, roof, location, homeTeam }) => {
  const meta = homeTeam ? STADIUM_META[homeTeam] : undefined;
  const city = location || meta?.city || null;
  const name = stadium || meta?.name || null;
  const roofLbl = roof ? (ROOF_LABEL[roof.toLowerCase()] ?? roof) : null;
  const surfLbl = surface ? surface.charAt(0).toUpperCase() + surface.slice(1) : null;

  if (!name && !city) return null;

  const teamColors = homeTeam ? getTeamColors(homeTeam) : null;
  const markerColor = teamColors?.primary || 'var(--accent-gold)';

  const fmtCapacity = (n: number) => `${(n / 1000).toFixed(1)}k`;
  const fmtElev = (n: number) => `${n.toLocaleString()} ft`;

  return (
    <section
      className="rounded-lg p-4"
      style={{ border: '1px solid var(--border-default)', background: 'var(--surface)' }}
      aria-label={`Venue: ${name ?? city ?? 'stadium'}`}
    >
      <h3 className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
        Venue
      </h3>

      {meta ? (
        <div
          data-testid="stadium-map"
          className="w-full rounded mb-3 overflow-hidden"
          style={{ background: 'var(--bg)', border: '1px solid var(--border-subtle)' }}
        >
          <USMap lat={meta.lat} lng={meta.lng} markerColor={markerColor} />
        </div>
      ) : (
        <div
          data-testid="stadium-fallback"
          className="w-full rounded mb-3 flex items-center justify-center"
          style={{ height: '64px', background: 'var(--surface-overlay)', border: '1px solid var(--border-subtle)' }}
          aria-hidden="true"
        >
          <span className="text-[11px] uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>
            {homeTeam ?? 'Stadium'}
          </span>
        </div>
      )}

      {name && (
        <p className="font-semibold text-sm leading-snug mb-0.5" style={{ color: 'var(--text-primary)' }}>
          {name}
        </p>
      )}
      {city && (
        <p className="text-xs mb-2" style={{ color: 'var(--text-tertiary)' }}>{city}</p>
      )}

      {meta && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[11px] tabular-nums"
          style={{ color: 'var(--text-tertiary)' }}>
          <span>Capacity {fmtCapacity(meta.capacity)}</span>
          <span style={{ color: 'var(--border-emphasis)' }}>·</span>
          <span>Elev {fmtElev(meta.elevation_ft)}</span>
        </div>
      )}

      {(surfLbl || roofLbl) && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {surfLbl && (
            <span className="text-[11px] px-2 py-0.5 rounded"
              style={{ background: 'var(--surface-raised)', color: 'var(--text-tertiary)', border: '1px solid var(--border-subtle)' }}>
              {surfLbl}
            </span>
          )}
          {roofLbl && (
            <span className="text-[11px] px-2 py-0.5 rounded"
              style={{ background: 'var(--surface-raised)', color: 'var(--text-tertiary)', border: '1px solid var(--border-subtle)' }}>
              {roofLbl}
            </span>
          )}
        </div>
      )}
    </section>
  );
};

export default StadiumPanel;
