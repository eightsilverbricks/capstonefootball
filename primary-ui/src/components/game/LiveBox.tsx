import type { BoxScore, LeaderKind } from '@/data/liveRepository';
import { getEspnLogoUrl, getTeamColors } from '@/data/nflData';
import PlayerLink from '@/components/PlayerLink';

interface Row {
  key: string;
  label: string;
  /** How a display value compares, so the bar can show who's ahead. Null: no bar. */
  score?: (v: string) => number | null;
  /** Fewer is better (turnovers, penalties). */
  lowerIsBetter?: boolean;
}

const lead = (v: string) => { const n = parseFloat(v); return Number.isFinite(n) ? n : null; };
/** "4-9" → 0.44 (conversions made over tries). */
const rate = (v: string) => {
  const [made, tries] = v.split('-').map(Number);
  return tries ? made / tries : null;
};
/** "28:14" → seconds. */
const clock = (v: string) => {
  const [m, s] = v.trim().split(':').map(Number);
  return Number.isFinite(m) && Number.isFinite(s) ? m * 60 + s : null;
};

const ROWS: Row[] = [
  { key: 'total_yards', label: 'Total yards', score: lead },
  { key: 'passing', label: 'Passing', score: lead },
  { key: 'rushing', label: 'Rushing', score: lead },
  { key: 'ypp', label: 'Yards per play', score: lead },
  { key: 'first_downs', label: '1st downs', score: lead },
  { key: 'third_down', label: '3rd down', score: rate },
  { key: 'red_zone', label: 'Red zone (TD-trips)', score: rate },
  { key: 'turnovers', label: 'Turnovers', score: lead, lowerIsBetter: true },
  { key: 'sacks', label: 'Sacked (yds lost)', score: lead, lowerIsBetter: true },
  { key: 'penalties', label: 'Penalties (yds)', score: lead, lowerIsBetter: true },
  { key: 'possession', label: 'Time of possession', score: clock },
];

const KINDS: { kind: LeaderKind; label: string }[] = [
  { kind: 'passing', label: 'Passing' },
  { kind: 'rushing', label: 'Rushing' },
  { kind: 'receiving', label: 'Receiving' },
];

function StatRow({ row, away, home, awayColor, homeColor }: {
  row: Row; away: string; home: string; awayColor: string; homeColor: string;
}) {
  const a = row.score?.(away) ?? null;
  const h = row.score?.(home) ?? null;
  const total = a != null && h != null ? a + h : 0;
  const awayShare = total > 0 ? a! / total : 0.5;
  const better = a == null || h == null || a === h ? null : (a > h) !== !!row.lowerIsBetter ? 'away' : 'home';
  return (
    <div className="lb-row">
      <b className={better === 'away' ? 'up' : undefined}>{away || '–'}</b>
      <div className="lb-mid">
        <span>{row.label}</span>
        <div className="lb-bar" aria-hidden="true">
          <i style={{ background: awayColor, transform: `scaleX(${awayShare})` }} />
          <i style={{ background: homeColor, transform: `scaleX(${1 - awayShare})` }} />
        </div>
      </div>
      <b className={better === 'home' ? 'up' : undefined}>{home || '–'}</b>
    </div>
  );
}

/** Team stats side by side, then each team's passing, rushing and receiving leader. */
export default function LiveBox({ box, away, home }: { box: BoxScore; away: string; home: string }) {
  const at = box.teams[away] ?? {};
  const ht = box.teams[home] ?? {};
  const ac = getTeamColors(away).primary;
  const hc = getTeamColors(home).primary;
  const hasLeaders = KINDS.some(({ kind }) => box.leaders[away]?.[kind] || box.leaders[home]?.[kind]);

  return (
    <section className="gv-panel">
      <div className="gv-ph"><h2>Box score</h2><span className="gr-muted">Updates every play</span></div>
      <div className="gv-pb lb">
        <div className="lb-head">
          <span><img src={getEspnLogoUrl(away)} alt="" width={22} height={22} />{away}</span>
          <span><img src={getEspnLogoUrl(home)} alt="" width={22} height={22} />{home}</span>
        </div>
        {ROWS.map((r) => (
          <StatRow key={r.key} row={r} away={at[r.key] ?? ''} home={ht[r.key] ?? ''} awayColor={ac} homeColor={hc} />
        ))}
        {hasLeaders && (
          <div className="lb-leaders">
            {KINDS.map(({ kind, label }) => (
              <div key={kind} className="lb-lead">
                <h3>{label}</h3>
                {[away, home].map((team) => {
                  const l = box.leaders[team]?.[kind];
                  return (
                    <p key={team} style={{ borderColor: team === away ? ac : hc }}>
                      {l ? <><PlayerLink name={l.name} team={team} /><span>{l.line}</span></> : <span className="gr-muted">{team}: none yet</span>}
                    </p>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
