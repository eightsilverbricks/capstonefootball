import React from 'react';
import { PlayerContext } from '@/types/prediction';

interface PlayerMatchupCardProps {
  awayTeam: string;
  homeTeam: string;
  awayPlayers?: PlayerContext;
  homePlayers?: PlayerContext;
}

function fmtSigned(v?: number | null, digits = 3): string | null {
  if (v == null || Number.isNaN(v)) return null;
  return (v >= 0 ? '+' : '') + v.toFixed(digits);
}

function fmtFixed(v?: number | null, digits = 2): string | null {
  if (v == null || Number.isNaN(v)) return null;
  return v.toFixed(digits);
}

interface StatRowProps {
  label: string;
  awayValue: string | null;
  homeValue: string | null;
  awayBetter?: boolean;
  homeBetter?: boolean;
}

const StatRow: React.FC<StatRowProps> = ({ label, awayValue, homeValue, awayBetter, homeBetter }) => {
  if (awayValue == null && homeValue == null) return null;
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-baseline gap-3 text-xs">
      <span
        className="tabular-nums text-right"
        style={{
          color: awayBetter ? 'var(--text-primary)' : 'var(--text-tertiary)',
          fontWeight: awayBetter ? 600 : 400,
          textDecoration: awayBetter ? 'underline' : 'none',
          textDecorationColor: 'var(--accent-gold)',
          textUnderlineOffset: '3px',
          textDecorationThickness: '1.5px',
        }}
      >
        {awayValue ?? '—'}
      </span>
      <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
        {label}
      </span>
      <span
        className="tabular-nums text-left"
        style={{
          color: homeBetter ? 'var(--text-primary)' : 'var(--text-tertiary)',
          fontWeight: homeBetter ? 600 : 400,
          textDecoration: homeBetter ? 'underline' : 'none',
          textDecorationColor: 'var(--accent-gold)',
          textUnderlineOffset: '3px',
          textDecorationThickness: '1.5px',
        }}
      >
        {homeValue ?? '—'}
      </span>
    </div>
  );
};

interface MatchupBlockProps {
  heading: string;
  awayTeam: string;
  homeTeam: string;
  awayName: string;
  homeName: string;
  rows: React.ReactNode;
}

const MatchupBlock: React.FC<MatchupBlockProps> = ({ heading, awayTeam, homeTeam, awayName, homeName, rows }) => (
  <div>
    <div className="flex items-center justify-between mb-2">
      <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
        {heading}
      </span>
    </div>
    <div className="grid grid-cols-[1fr_auto_1fr] items-baseline gap-3 mb-2">
      <div className="text-right">
        <p className="font-semibold text-sm leading-tight" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
          {awayName}
        </p>
        <p className="text-[10px] uppercase tracking-widest mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
          {awayTeam}
        </p>
      </div>
      <span className="text-[10px] uppercase tracking-widest pt-1" style={{ color: 'var(--text-muted)' }}>
        vs
      </span>
      <div className="text-left">
        <p className="font-semibold text-sm leading-tight" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
          {homeName}
        </p>
        <p className="text-[10px] uppercase tracking-widest mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
          {homeTeam}
        </p>
      </div>
    </div>
    <div className="flex flex-col gap-1">{rows}</div>
  </div>
);

const PlayerMatchupCard: React.FC<PlayerMatchupCardProps> = ({
  awayTeam, homeTeam, awayPlayers, homePlayers,
}) => {
  const awayQB = awayPlayers?.qb;
  const homeQB = homePlayers?.qb;
  const awayRB = awayPlayers?.rb;
  const homeRB = homePlayers?.rb;

  const hasQB = !!(awayQB?.name || homeQB?.name);
  const hasRB = !!(awayRB?.name || homeRB?.name);

  if (!hasQB && !hasRB) return null;

  const qbEpaAway = awayQB?.epa_per_att;
  const qbEpaHome = homeQB?.epa_per_att;
  const qbAwayBetter = qbEpaAway != null && qbEpaHome != null && qbEpaAway > qbEpaHome;
  const qbHomeBetter = qbEpaAway != null && qbEpaHome != null && qbEpaHome > qbEpaAway;

  const rbYpcAway = awayRB?.ypc;
  const rbYpcHome = homeRB?.ypc;
  const rbAwayBetter = rbYpcAway != null && rbYpcHome != null && rbYpcAway > rbYpcHome;
  const rbHomeBetter = rbYpcAway != null && rbYpcHome != null && rbYpcHome > rbYpcAway;

  return (
    <section
      className="rounded-lg p-4"
      style={{ border: '1px solid var(--border-default)', background: 'var(--surface)' }}
      aria-label="Key player matchups"
    >
      <h3 className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
        Players
      </h3>

      <div className="flex flex-col gap-5">
        {hasQB && (
          <MatchupBlock
            heading="Quarterback"
            awayTeam={awayTeam}
            homeTeam={homeTeam}
            awayName={awayQB?.name || '—'}
            homeName={homeQB?.name || '—'}
            rows={
              <>
                <StatRow
                  label="EPA/att"
                  awayValue={fmtSigned(qbEpaAway, 3)}
                  homeValue={fmtSigned(qbEpaHome, 3)}
                  awayBetter={qbAwayBetter}
                  homeBetter={qbHomeBetter}
                />
                <StatRow
                  label="CPOE"
                  awayValue={fmtSigned(awayQB?.cpoe, 1)}
                  homeValue={fmtSigned(homeQB?.cpoe, 1)}
                />
                <StatRow
                  label="Att"
                  awayValue={awayQB?.attempts != null ? String(awayQB.attempts) : null}
                  homeValue={homeQB?.attempts != null ? String(homeQB.attempts) : null}
                />
              </>
            }
          />
        )}

        {hasQB && hasRB && (
          <div style={{ borderTop: '1px solid var(--border-subtle)' }} />
        )}

        {hasRB && (
          <MatchupBlock
            heading="Lead back"
            awayTeam={awayTeam}
            homeTeam={homeTeam}
            awayName={awayRB?.name || '—'}
            homeName={homeRB?.name || '—'}
            rows={
              <>
                <StatRow
                  label="YPC"
                  awayValue={fmtFixed(rbYpcAway, 2)}
                  homeValue={fmtFixed(rbYpcHome, 2)}
                  awayBetter={rbAwayBetter}
                  homeBetter={rbHomeBetter}
                />
                <StatRow
                  label="Carries"
                  awayValue={awayRB?.carries != null ? String(awayRB.carries) : null}
                  homeValue={homeRB?.carries != null ? String(homeRB.carries) : null}
                />
                <StatRow
                  label="Rush EPA"
                  awayValue={fmtSigned(awayRB?.epa, 1)}
                  homeValue={fmtSigned(homeRB?.epa, 1)}
                />
              </>
            }
          />
        )}
      </div>
    </section>
  );
};

export default PlayerMatchupCard;
