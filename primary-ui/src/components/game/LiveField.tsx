import { useEffect, useState } from 'react';
import type { LiveGame } from '@/data/liveRepository';
import { getEspnLogoUrl, getTeamColors } from '@/data/nflData';
import { downAndDistance, fieldState, liveClock, secondsSince, type Drive } from '@/lib/live';

/** Field geometry: 600 × 150 units, 10-yard end zones, 5 units per yard. */
const W = 600;
const H = 150;
const END = 50;
const YD = 5;
const x = (yardsFromHomeGoal: number) => END + yardsFromHomeGoal * YD;
const LINES = [10, 20, 30, 40, 50, 60, 70, 80, 90];
/** After this long without a change the feed is probably behind. */
const STALE_S = 120;
const TICK_MS = 5000;

function useNow(ms: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), ms);
    return () => window.clearInterval(id);
  }, [ms]);
  return now;
}

function Timeouts({ team, left }: { team: string; left: number | null | undefined }) {
  if (left == null) return null;
  return (
    <span className="lf-to" aria-label={`${team}: ${left} timeout${left === 1 ? '' : 's'} left`}>
      {team}
      {[0, 1, 2].map((i) => <i key={i} className={i < left ? 'on' : ''} />)}
    </span>
  );
}

function freshness(age: number): string {
  if (!Number.isFinite(age)) return '';
  if (age < 10) return 'Updated just now';
  if (age < 60) return `Updated ${age}s ago`;
  return `Updated ${Math.round(age / 60)} min ago`;
}

/**
 * The live field: ball spot, line of scrimmage, line to gain, the current
 * drive's ground covered, red zone, timeouts and the last play. Home end zone
 * is on the left because ESPN measures the ball from the home goal line.
 */
export default function LiveField({ live, drive }: { live: LiveGame; drive: Drive | null }) {
  const now = useNow(TICK_MS);
  const field = fieldState(live);
  const home = getTeamColors(live.home_team);
  const away = getTeamColors(live.away_team);
  const age = secondsSince(live.updated_at, now);
  const stale = live.status === 'in' && age > STALE_S;
  const dd = downAndDistance(live);
  const offColor = field?.offense ? getTeamColors(field.offense).primary : 'var(--ink-3)';
  const driveStart = drive?.plays.find((p) => p.start_yard != null && !/kickoff/i.test(p.play_type))?.start_yard ?? null;
  const redZone = field && live.red_zone ? (field.direction === 1 ? [80, 100] : [0, 20]) : null;
  const current = live.drives?.length ? live.drives[live.drives.length - 1] : null;
  const driveText = current && !current.result ? current.description : null;

  return (
    <section className="gv-panel lf" aria-label="Field position">
      <div className="lf-top">
        <span className="lf-sit">
          {field?.offense && <img src={getEspnLogoUrl(field.offense)} alt="" width={26} height={26} />}
          <b>{dd ?? liveClock(live)}</b>
          {live.red_zone && <span className="lf-rz">Red zone</span>}
        </span>
        <span className="lf-tos">
          <Timeouts team={live.away_team} left={live.away_timeouts} />
          <Timeouts team={live.home_team} left={live.home_timeouts} />
        </span>
      </div>

      <svg className="lf-svg" viewBox={`0 0 ${W} ${H}`} width="100%" role="img"
        aria-label={dd ? `${field?.offense ?? ''} ${dd}` : 'Field'}>
        <rect x="0" y="0" width={W} height={H} rx="10" className="lf-grass" />
        {Array.from({ length: 10 }, (_, i) => (
          <rect key={i} x={x(i * 10)} y="0" width={YD * 10} height={H} className={i % 2 ? 'lf-stripe' : undefined} fill="transparent" />
        ))}
        <rect x="0" y="0" width={END} height={H} rx="10" fill={home.primary} />
        <rect x={END - 10} y="0" width="10" height={H} fill={home.primary} />
        <rect x={W - END} y="0" width={END} height={H} rx="10" fill={away.primary} />
        <rect x={W - END} y="0" width="10" height={H} fill={away.primary} />
        <text x={END / 2} y={H / 2} className="lf-ez" transform={`rotate(-90 ${END / 2} ${H / 2})`}>{live.home_team}</text>
        <text x={W - END / 2} y={H / 2} className="lf-ez" transform={`rotate(90 ${W - END / 2} ${H / 2})`}>{live.away_team}</text>
        {redZone && <rect x={x(redZone[0])} y="0" width={(redZone[1] - redZone[0]) * YD} height={H} className="lf-rzone" />}
        {LINES.map((yd) => (
          <g key={yd}>
            <line x1={x(yd)} y1="0" x2={x(yd)} y2={H} className="lf-line" />
            <text x={x(yd)} y={H - 12} className="lf-num">{yd <= 50 ? yd : 100 - yd}</text>
          </g>
        ))}
        <line x1={x(0)} y1="0" x2={x(0)} y2={H} className="lf-goal" />
        <line x1={x(100)} y1="0" x2={x(100)} y2={H} className="lf-goal" />

        {field && driveStart != null && driveStart !== field.ball && (
          <rect x={x(Math.min(driveStart, field.ball))} y={H / 2 - 9} width={Math.abs(field.ball - driveStart) * YD} height="18" rx="4"
            fill={offColor} opacity=".35" className="lf-drive" />
        )}
        {field && (
          <>
            <line x1={x(field.ball)} y1="6" x2={x(field.ball)} y2={H - 6} className="lf-los" />
            {field.toGain != null && <line x1={x(field.toGain)} y1="6" x2={x(field.toGain)} y2={H - 6} className="lf-gain" />}
            <g className="lf-ball" style={{ transform: `translateX(${x(field.ball)}px)` }}>
              <ellipse cx="0" cy={H / 2} rx="11" ry="7" fill="#8B4A1F" stroke="#fff" strokeWidth="1.5" />
              <line x1="-4" y1={H / 2} x2="4" y2={H / 2} stroke="#fff" strokeWidth="1.5" />
              {field.direction !== 0 && (
                <path d={field.direction === 1 ? `M16 ${H / 2 - 6} L26 ${H / 2} L16 ${H / 2 + 6} Z` : `M-16 ${H / 2 - 6} L-26 ${H / 2} L-16 ${H / 2 + 6} Z`}
                  fill={offColor} stroke="#fff" strokeWidth="1" />
              )}
            </g>
          </>
        )}
      </svg>

      <div className="lf-foot">
        {driveText && <p className="lf-drivetext"><b>{current?.team} drive:</b> {driveText}</p>}
        {live.last_play && <p className="lf-last"><b>Last play:</b> {live.last_play}</p>}
        <p className={`lf-fresh${stale ? ' stale' : ''}`}>
          {live.status === 'in' && <span className="live-dot" />}
          {stale ? `The live feed is ${Math.round(age / 60)} min behind. It catches up on its own.` : freshness(age)}
        </p>
      </div>
    </section>
  );
}
