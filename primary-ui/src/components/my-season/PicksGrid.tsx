import { Link } from 'react-router-dom';
import { WeekLine, PickRow, formatRecord } from '@/lib/seasonBreakdown';
import { gamePath } from '@/lib/homeFeed';
import { gameKey } from '@/lib/threeWaySignal';
import { getTeam } from '@/data/teams';

const nick = (t: string) => getTeam(t)?.name ?? t;
const LABEL = { w: 'correct', l: 'wrong', n: 'not graded yet' } as const;

/** Every pick as a square, one row per week. Each square links to its game. */
export default function PicksGrid({ weeks, rows }: { weeks: WeekLine[]; rows: PickRow[] }) {
  if (weeks.length === 0) {
    return <p className="gr-muted ms-pad">No picks yet. <Link to="/games" className="gr-link">Go pick some games</Link>.</p>;
  }
  return (
    <section className="ms-card">
      <div className="ms-ch"><h2>Every pick</h2><span>Green correct · red wrong · gray not graded yet</span></div>
      <div className="ms-cb">
        {weeks.map((w) => {
          const weekRows = rows.filter((r) => r.game.week === w.week);
          return (
            <div key={w.week} className="ms-weekrow">
              <span>Week {w.week}</span>
              <div className="ms-sqs">
                {weekRows.map((r, i) => (
                  <Link
                    key={gameKey(r.game)}
                    to={gamePath(r.game)}
                    className={`ms-sq ${w.squares[i]}`}
                    title={`${r.game.away_team} @ ${r.game.home_team}: you picked the ${nick(r.team)}, ${LABEL[w.squares[i]]}`}
                    aria-label={`${r.game.away_team} at ${r.game.home_team}, ${LABEL[w.squares[i]]}`}
                  />
                ))}
              </div>
              <span className="r">{formatRecord(w.you)}</span>
              <span className="c">Clark {formatRecord(w.clark)}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
