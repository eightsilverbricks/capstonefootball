import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePredictions } from '@/hooks/usePredictions';
import { LIVE_SEASON } from '@/lib/season';

const pct = (p: number) => Math.round(p * 100);
const STEPS = [
  { t: 'Data', d: 'Every play of every game since 2006, plus injury reports and betting lines (free nflverse data).' },
  { t: 'Factors', d: 'Team form, offense and defense, home field, rest, injuries and the line, each weighed by how much it has mattered before.' },
  { t: 'Probability', d: 'A logistic regression turns the factors into one number: the chance each team wins.' },
  { t: 'Report', d: 'Clark explains the number in plain English, with the matchup that decides it and what would change his mind.' },
];

export function HowClarkWorks() {
  return (
    <ol className="ab-flow" aria-label="How Clark works">
      {STEPS.map((s, i) => (
        <li key={s.t}><span className="n">{i + 1}</span><b>{s.t}</b><p>{s.d}</p></li>
      ))}
    </ol>
  );
}

/** Every pick Clark has made this season, misses included (§7 About). */
export default function ClarkPublicRecord() {
  const { predictions } = usePredictions();
  const [missesOnly, setMissesOnly] = useState(false);
  const graded = useMemo(
    () => predictions.filter((g) => g.season === LIVE_SEASON && g.actual_winner).sort((a, b) => b.week - a.week),
    [predictions],
  );
  const wins = graded.filter((g) => g.actual_winner === g.predicted_winner).length;
  const rows = missesOnly ? graded.filter((g) => g.actual_winner !== g.predicted_winner) : graded;
  if (!graded.length) return null;

  return (
    <div className="ab-record">
      <div className="ab-record-head">
        <b>{wins}–{graded.length - wins}</b>
        <span>{pct(wins / graded.length)}% this season</span>
        <label className="ms-switch"><input type="checkbox" checked={missesOnly} onChange={(e) => setMissesOnly(e.target.checked)} /><span>Misses only</span></label>
      </div>
      <div className="ab-record-list" role="table" aria-label="Clark's picks this season">
        {rows.map((g) => {
          const right = g.actual_winner === g.predicted_winner;
          const prob = g.predicted_winner === g.home_team ? g.home_win_prob : g.away_win_prob;
          return (
            <Link key={g.game_id} role="row" to={`/game/${g.season}/${g.week}/${g.away_team}/${g.home_team}`} className="ab-rec-row">
              <span role="cell" className="gr-muted">Wk {g.week}</span>
              <span role="cell">{g.away_team} {g.away_score}–{g.home_score} {g.home_team}</span>
              <span role="cell">Clark: <b>{g.predicted_winner} {pct(prob)}%</b></span>
              <span role="cell" className={`gr-chip ${right ? 'win' : 'loss'}`}>{right ? 'Right' : 'Wrong'}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
