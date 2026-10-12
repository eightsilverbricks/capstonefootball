import { Link } from 'react-router-dom';
import { getEspnLogoUrl } from '@/data/nflData';
import { getTeam } from '@/data/teams';
import { signed } from '@/lib/format';
import { SeasonSummary } from '@/lib/seasonSummary';
import { PickHighlight, SeasonHistory } from '@/lib/seasonHistory';
import { DivisionLine, Split, WeekLine, formatRecord } from '@/lib/seasonBreakdown';

const pct = (p: number) => Math.round(p * 100);
const nick = (t: string) => getTeam(t)?.name ?? t;

const CHART = { w: 640, h: 220, left: 36, right: 24, top: 20, bottom: 20 };

/** You vs Clark, correct picks per week on the games you picked. */
function WinsChart({ weeks }: { weeks: WeekLine[] }) {
  const graded = weeks.filter((w) => w.you.w + w.you.l > 0);
  if (graded.length === 0) return null;
  const max = Math.max(4, ...graded.map((w) => Math.max(w.you.w, w.clark.w)));
  const plotW = CHART.w - CHART.left - CHART.right;
  const plotH = CHART.h - CHART.top - CHART.bottom;
  const x = (i: number) => CHART.left + (graded.length === 1 ? plotW / 2 : (i / (graded.length - 1)) * plotW);
  const y = (v: number) => CHART.top + plotH - (v / max) * plotH;
  const line = (pick: (w: WeekLine) => number) => graded.map((w, i) => `${x(i)},${y(pick(w))}`).join(' ');
  const ticks = [0, Math.round(max / 2), max];

  return (
    <section className="ms-card">
      <div className="ms-ch">
        <h2>Wins by week</h2>
        <div className="ms-legend"><span><i className="you" />You</span><span><i className="clark" />Clark</span></div>
      </div>
      <div className="ms-cb">
        <svg viewBox={`0 0 ${CHART.w} ${CHART.h + 16}`} width="100%" role="img" aria-label="Correct picks by week, you and Clark">
          {ticks.map((t) => (
            <g key={t}>
              <line className="ms-grid" x1={CHART.left} x2={CHART.w - CHART.right} y1={y(t)} y2={y(t)} />
              <text className="ms-tick" x={CHART.left - 8} y={y(t) + 4} textAnchor="end">{t}</text>
            </g>
          ))}
          {graded.map((w, i) => <text key={w.week} className="ms-tick" x={x(i)} y={CHART.h + 10} textAnchor="middle">Wk {w.week}</text>)}
          <polyline className="ms-line-clark" points={line((w) => w.clark.w)} />
          <polyline className="ms-line-you" points={line((w) => w.you.w)} />
          {graded.map((w, i) => <circle key={w.week} className="ms-dot" cx={x(i)} cy={y(w.you.w)} r={4}><title>Week {w.week}: you {formatRecord(w.you)}, Clark {formatRecord(w.clark)}</title></circle>)}
        </svg>
      </div>
    </section>
  );
}

function Divisions({ lines }: { lines: DivisionLine[] }) {
  if (lines.length === 0) return null;
  return (
    <section className="ms-card">
      <div className="ms-ch"><h2>Record by division</h2><span>Games with a team from that division</span></div>
      <div className="ms-cb">
        {lines.map((d) => (
          <div key={d.division} className="ms-div">
            <span>{d.division}</span>
            <div className="ms-bar"><span className={d.rate < 0.5 ? 'bad' : ''} style={{ width: `${Math.max(4, pct(d.rate))}%` }} /></div>
            <b>{formatRecord(d.you)}</b>
          </div>
        ))}
      </div>
    </section>
  );
}

function Highlight({ h }: { h: PickHighlight }) {
  return (
    <div className="ms-pc">
      <img src={getEspnLogoUrl(h.yourTeam)} alt="" width={32} height={32} />
      <div>
        <div className="t">{nick(h.yourTeam)} · {pct(h.confidence)}%</div>
        <div className="m">Week {h.shortLabel} · {h.matchup} · {h.tag}</div>
      </div>
      <span className={`gr-chip ${h.correct ? 'win' : 'loss'}`}>{h.correct ? 'Correct' : 'Wrong'}</span>
    </div>
  );
}

interface SeasonOverviewProps {
  summary: SeasonSummary;
  history: SeasonHistory;
  weeks: WeekLine[];
  splits: Split[];
  divisions: DivisionLine[];
}

export default function SeasonOverview({ summary, history, weeks, splits, divisions }: SeasonOverviewProps) {
  if (summary.picksMade === 0) {
    return (
      <div className="clark-card ms-empty">
        <img src="/brand/clark-logo.jpg" alt="" />
        <p>"No picks yet? Come on. Pick a game and let's see if you can beat me."<small>Clark · picks lock at kickoff</small></p>
        <Link to="/games" className="pill pill-red">Make your first pick</Link>
      </div>
    );
  }
  const graded = summary.wins + summary.losses;
  const best = [...history.strongestCalls.slice(0, 2), ...history.biggestMisses.slice(0, 1)];

  return (
    <>
      <div className="ms-kpis">
        <div className="ms-kpi"><span>Record</span><b>{summary.wins}–{summary.losses}</b><small>{graded ? `${pct(summary.wins / graded)}% correct` : `${summary.pendingCount} waiting on results`}</small></div>
        <div className="ms-kpi"><span>Vs Clark</span><b className={summary.clarkDifferential >= 0 ? 'up' : 'down'}>{signed(summary.clarkDifferential)}</b><small>Points, on the games you picked</small></div>
        <div className="ms-kpi"><span>Season score</span><b>{signed(summary.seasonScore)}</b><small>{summary.picksMade} picks made</small></div>
        <div className="ms-kpi"><span>Streak</span><b>{summary.streak ? `${summary.streak.type}${summary.streak.count}` : '—'}</b><small>Longest win streak: {history.longestWinStreak}</small></div>
      </div>
      <div className="ms-two">
        <div className="ms-stack">
          <WinsChart weeks={weeks} />
          <Divisions lines={divisions} />
          {graded === 0 && <p className="gr-muted">Your picks are in. Charts fill in as games finish.</p>}
        </div>
        <aside className="ms-stack">
          {splits.length > 0 && (
            <section className="ms-card">
              <div className="ms-ch"><h2>Splits</h2></div>
              <div className="ms-cb">{splits.map((s) => <div key={s.id} className="ms-split"><span>{s.label}</span><b>{formatRecord(s.record)}</b></div>)}</div>
            </section>
          )}
          {best.length > 0 && (
            <section className="ms-card">
              <div className="ms-ch"><h2>Best and worst picks</h2></div>
              <div className="ms-cb">{best.map((h) => <Highlight key={h.key} h={h} />)}</div>
            </section>
          )}
        </aside>
      </div>
    </>
  );
}
