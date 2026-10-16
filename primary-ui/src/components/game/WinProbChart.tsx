import { useState, type PointerEvent } from 'react';
import { ApiPrediction } from '@/types/prediction';
import { getTeamColors } from '@/data/nflData';
import { OT_S, REGULATION_S, type WpPoint } from '@/lib/live';

const W = 600;
const H = 180;
const PAD_B = 18;
const QUARTERS = [900, 1800, 2700];
const pct = (p: number) => Math.round(p * 100);

/** "SEA 61%" for whichever side the line favours. */
function leaderLabel(game: ApiPrediction, homeProb: number): string {
  return homeProb >= 0.5 ? `${game.home_team} ${pct(homeProb)}%` : `${game.away_team} ${pct(1 - homeProb)}%`;
}

const isScore = (pt: WpPoint) => pt.play.scoring || /touchdown|field goal good/i.test(pt.play.play_type);

/**
 * Win-probability chart against game time. Before kickoff it shows Clark's
 * pregame number as a dashed line; the live line fills in quarter by quarter,
 * with scoring plays marked and a readout of any play under the pointer.
 */
export default function WinProbChart({ game, series = [] }: { game: ApiPrediction; series?: WpPoint[] }) {
  const [hover, setHover] = useState<WpPoint | null>(null);
  const last = series[series.length - 1];
  const span = Math.max(REGULATION_S, last ? Math.ceil((last.t - REGULATION_S) / OT_S) * OT_S + REGULATION_S : 0);
  const x = (t: number) => (t / span) * W;
  const y = (homeProb: number) => H - homeProb * H;
  const pre = y(game.home_win_prob);
  const line = series.map((pt) => `${x(pt.t).toFixed(1)},${y(pt.p).toFixed(1)}`).join(' ');
  const area = series.length > 1 ? `0,${H / 2} ${line} ${x(last.t).toFixed(1)},${H / 2}` : '';
  const hc = getTeamColors(game.home_team).primary;
  const ac = getTeamColors(game.away_team).primary;
  const shown = hover ?? last;

  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    if (series.length < 2) return;
    const box = e.currentTarget.getBoundingClientRect();
    const t = ((e.clientX - box.left) / box.width) * span;
    let best = series[0];
    for (const pt of series) if (Math.abs(pt.t - t) < Math.abs(best.t - t)) best = pt;
    setHover(best);
  };

  return (
    <div className="wp">
      {shown && (
        <div className="wp-read" aria-live="off">
          <b style={{ color: shown.p >= 0.5 ? hc : ac }}>{leaderLabel(game, shown.p)}</b>
          <span>{hover ? `Q${hover.play.quarter > 4 ? 'OT' : hover.play.quarter} ${hover.play.clock} · ${hover.play.note ?? hover.play.text}` : 'Now'}</span>
        </div>
      )}
      <svg viewBox={`0 0 ${W} ${H + PAD_B}`} width="100%" role="img"
        aria-label={`${game.home_team} win probability${last ? `, now ${leaderLabel(game, last.p)}` : ''}`}
        onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
        <rect x="0" y="0" width={W} height={H / 2} fill={hc} opacity=".06" />
        <rect x="0" y={H / 2} width={W} height={H / 2} fill={ac} opacity=".06" />
        {QUARTERS.map((q) => <line key={q} x1={x(q)} y1="0" x2={x(q)} y2={H} stroke="var(--rule)" strokeDasharray="2 4" />)}
        {span > REGULATION_S && <line x1={x(REGULATION_S)} y1="0" x2={x(REGULATION_S)} y2={H} stroke="var(--ink-3)" strokeDasharray="2 4" />}
        <line x1="0" y1={H / 2} x2={W} y2={H / 2} stroke="var(--rule)" />
        <line x1="0" y1={pre} x2={W} y2={pre} stroke="var(--clark-solid)" strokeDasharray="6 5" strokeWidth="2" opacity=".8" />
        <text x={W - 4} y={pre - 6} textAnchor="end" fontSize="11" fontWeight="700" fill="var(--clark-solid)">
          Clark: {game.predicted_winner} {pct(Math.max(game.home_win_prob, game.away_win_prob))}%
        </text>
        {area && <polygon points={area} fill={last.p >= 0.5 ? hc : ac} opacity=".12" />}
        {series.length > 1 && <polyline className="wp-line" fill="none" stroke={hc} strokeWidth="3" strokeLinejoin="round" points={line} />}
        {series.filter(isScore).map((pt) => (
          <circle key={pt.play.play_id} cx={x(pt.t)} cy={y(pt.p)} r="4" fill="var(--paper)" stroke={pt.play.offense === game.away_team ? ac : hc} strokeWidth="2.5" />
        ))}
        {last && !hover && <circle className="wp-now" cx={x(last.t)} cy={y(last.p)} r="5" fill={hc} />}
        {hover && (
          <>
            <line x1={x(hover.t)} y1="0" x2={x(hover.t)} y2={H} stroke="var(--ink-2)" strokeWidth="1" />
            <circle cx={x(hover.t)} cy={y(hover.p)} r="5" fill={hc} stroke="var(--paper)" strokeWidth="2" />
          </>
        )}
        <text x="4" y="14" fontSize="11" fill="var(--ink-3)">{game.home_team} 100%</text>
        <text x="4" y={H - 4} fontSize="11" fill="var(--ink-3)">{game.away_team} 100%</text>
        {['Q1', 'Q2', 'Q3', 'Q4'].map((q, i) => (
          <text key={q} x={x(i * 900 + 450)} y={H + 13} textAnchor="middle" fontSize="10.5" fontWeight="700" fill="var(--ink-3)">{q}</text>
        ))}
        {span > REGULATION_S && <text x={x(REGULATION_S + (span - REGULATION_S) / 2)} y={H + 13} textAnchor="middle" fontSize="10.5" fontWeight="700" fill="var(--ink-3)">OT</text>}
      </svg>
    </div>
  );
}
