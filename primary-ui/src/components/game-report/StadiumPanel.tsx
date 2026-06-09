import React from 'react';

interface StadiumPanelProps {
  stadium?: string | null;
  surface?: string;
  roof?: string | null;
  location?: string;
  homeTeam?: string;
}

const TEAM_CITIES: Record<string, string> = {
  ARI:'Glendale, AZ', ATL:'Atlanta, GA', BAL:'Baltimore, MD', BUF:'Orchard Park, NY',
  CAR:'Charlotte, NC', CHI:'Chicago, IL', CIN:'Cincinnati, OH', CLE:'Cleveland, OH',
  DAL:'Arlington, TX', DEN:'Denver, CO', DET:'Detroit, MI', GB:'Green Bay, WI',
  HOU:'Houston, TX', IND:'Indianapolis, IN', JAX:'Jacksonville, FL', KC:'Kansas City, MO',
  LAC:'Inglewood, CA', LAR:'Inglewood, CA', LV:'Las Vegas, NV', MIA:'Miami Gardens, FL',
  MIN:'Minneapolis, MN', NE:'Foxborough, MA', NO:'New Orleans, LA', NYG:'East Rutherford, NJ',
  NYJ:'East Rutherford, NJ', PHI:'Philadelphia, PA', PIT:'Pittsburgh, PA', SEA:'Seattle, WA',
  SF:'Santa Clara, CA', TB:'Tampa, FL', TEN:'Nashville, TN', WAS:'Landover, MD',
};

const ROOF_LABEL: Record<string, string> = {
  dome: 'Dome', closed: 'Closed roof', retractable: 'Retractable', outdoors: 'Open air', open: 'Open air',
};

const StadiumPanel: React.FC<StadiumPanelProps> = ({ stadium, surface, roof, location, homeTeam }) => {
  const city   = location || (homeTeam ? TEAM_CITIES[homeTeam] : null);
  const roofLbl = roof ? (ROOF_LABEL[roof.toLowerCase()] ?? roof) : null;
  const surfLbl = surface ? surface.charAt(0).toUpperCase() + surface.slice(1) : null;

  if (!stadium && !city) return null;

  return (
    <section
      className="rounded-lg p-4"
      style={{ border: '1px solid var(--border-default)', background: 'var(--surface)' }}
      aria-label="Venue"
    >
      <h3 className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
        Venue
      </h3>

      {/* Placeholder — v1 color block, swap for image in v2 */}
      <div
        className="w-full rounded mb-3 flex items-center justify-center"
        style={{ height: '64px', background: 'var(--surface-overlay)', border: '1px solid var(--border-subtle)' }}
        aria-hidden="true"
      >
        <span className="text-[11px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
          {homeTeam ?? 'Stadium'}
        </span>
      </div>

      {stadium && (
        <p className="font-semibold text-sm leading-snug mb-0.5" style={{ color: 'var(--text-primary)' }}>
          {stadium}
        </p>
      )}
      {city && (
        <p className="text-xs mb-2" style={{ color: 'var(--text-tertiary)' }}>{city}</p>
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
