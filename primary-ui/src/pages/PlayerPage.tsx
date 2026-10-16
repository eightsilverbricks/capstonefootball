import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import Header from '@/components/Header';
import SignInGate, { GatePreview } from '@/components/auth/SignInGate';
import Footer from '@/components/Footer';
import { getEspnLogoUrl, getTeamColors } from '@/data/nflData';
import { getTeam } from '@/data/teams';
import { useRosters } from '@/data/rosters';
import { usePredictions } from '@/hooks/usePredictions';
import { explainPosition } from '@/lib/positions';
import { isFinal } from '@/lib/gameStatus';
import { formatKickoff } from '@/lib/slate';
import NotFound from './NotFound';

/** Headshot, position explained, rank at position, last 5 games, injury, next game (§7). */
export default function PlayerPage() {
  const { id = '' } = useParams();
  const { rosters, error } = useRosters();
  const { predictions } = usePredictions();
  const player = rosters?.players[id];
  const next = useMemo(() => {
    if (!player) return null;
    return predictions
      .filter((g) => (g.home_team === player.team || g.away_team === player.team) && !isFinal(g))
      .sort((a, b) => a.week - b.week)[0] ?? null;
  }, [predictions, player]);

  if (rosters && !player) return <NotFound />;
  const team = player ? getTeam(player.team) : null;
  const c = player ? getTeamColors(player.team) : null;

  return (
    <div className="min-h-screen">
      <Header />
      {!rosters && <main className="tm-wrap"><p className="gr-muted" style={{ padding: '40px 0' }}>{error ? "Couldn't load this player." : 'Loading…'}</p></main>}
      {player && team && c && (
        <>
          <section className="tm-head pl-head" style={{ backgroundImage: `linear-gradient(90deg, ${c.primary}F2, ${c.secondary}B3)` }}>
            <div className="tm-wrap tm-head-in">
              {player.headshot ? <img className="pl-shot" src={player.headshot} alt="" width={120} height={120} /> : <img src={getEspnLogoUrl(player.team)} alt="" width={96} height={96} />}
              <div>
                <h1>{player.name}</h1>
                <p>{player.pos} · <Link to={`/team/${team.abbr}`} style={{ color: '#fff', textDecoration: 'underline' }}>{team.city} {team.name}</Link>{player.injury ? ` · ${player.injury.status}` : ''}</p>
              </div>
            </div>
          </section>
          <SignInGate feature="player" preview={<div className="tm-wrap"><GatePreview shape="rows" /></div>}>
          <main className="tm-wrap tm-two">
            <div className="tm-stack">
              <section>
                <h2 className="hm-h2">What a {player.pos} does</h2>
                <p className="pl-text">{explainPosition(player.pos)}</p>
              </section>
              {(player.rank || player.season) && (
                <section>
                  <h2 className="hm-h2">This season</h2>
                  {player.rank && <p className="ro-rank">{player.rank}</p>}
                  {player.season && <p className="pl-text">{player.season} in {player.games} game{player.games === 1 ? '' : 's'}</p>}
                </section>
              )}
              <section>
                <h2 className="hm-h2">Last {player.last5.length || 5} games</h2>
                {player.last5.length === 0
                  ? <p className="gr-muted">{player.group === 'OL' ? "Linemen don't get box-score stats. He's a starter on the line." : 'No games yet this season.'}</p>
                  : player.last5.slice().reverse().map((g) => (
                    <div key={g.week} className="tm-row">
                      <div><b>Week {g.week}</b> <span className="gr-muted">vs {g.opp}</span></div>
                      <span className="tm-stat">{g.line ?? 'Played'}</span>
                    </div>
                  ))}
              </section>
            </div>
            <aside className="tm-stack">
              <section>
                <h2 className="hm-h2">Injury status</h2>
                <p className="pl-text">{player.injury ? `${player.injury.status} on this week's report.` : 'Not on the injury report.'}</p>
              </section>
              {next && (
                <section>
                  <h2 className="hm-h2">Next game</h2>
                  <Link className="tm-row" to={`/game/${next.season}/${next.week}/${next.away_team}/${next.home_team}`}>
                    <div><b>{next.away_team} @ {next.home_team}</b><div className="gr-muted tm-sub">{next.week_label ?? `Week ${next.week}`} · {next.weekday} {formatKickoff(next.gametime)}</div></div>
                    <span className="tm-stat">Clark: {next.predicted_winner}</span>
                  </Link>
                </section>
              )}
              <Link to={`/team/${team.abbr}/roster`} className="pill pill-line">Full {team.name} lineup</Link>
            </aside>
          </main>
          </SignInGate>
        </>
      )}
      <Footer />
    </div>
  );
}
