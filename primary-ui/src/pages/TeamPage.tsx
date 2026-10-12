import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { usePredictions } from '@/hooks/usePredictions';
import { getEspnLogoUrl, getTeamColors } from '@/data/nflData';
import { getTeam } from '@/data/teams';
import { stadiumImageUrl } from '@/data/stadiumImages';
import { gamePath } from '@/lib/homeFeed';
import { gameKey } from '@/lib/threeWaySignal';
import { formatKickoff } from '@/lib/slate';
import { divisionPlace, ordinal, teamNotes, teamOutlook, teamRecord, teamSchedule } from '@/lib/teamPage';
import NotFound from './NotFound';

const pct = (p: number) => Math.round(p * 100);
const nick = (t: string) => getTeam(t)?.name ?? t;

/** One team: record and division place, Clark's outlook, schedule, injuries and key players. */
export default function TeamPage() {
  const { abbr = '' } = useParams();
  const team = getTeam(abbr.toUpperCase());
  const { predictions, loading } = usePredictions();
  const code = team?.abbr ?? '';

  const schedule = useMemo(() => teamSchedule(code, predictions), [code, predictions]);
  const record = useMemo(() => teamRecord(code, predictions), [code, predictions]);
  const place = useMemo(() => divisionPlace(code, predictions), [code, predictions]);
  const outlook = useMemo(() => teamOutlook(schedule), [schedule]);
  const notes = useMemo(() => teamNotes(code, schedule), [code, schedule]);

  if (!team) return <NotFound />;

  const c = getTeamColors(team.abbr);
  const photo = stadiumImageUrl(team.abbr, 1600);
  const wash = `linear-gradient(90deg, ${c.primary}F2 0%, ${c.primary}B3 55%, ${c.secondary}99 100%)`;
  const meta = [
    record.w + record.l > 0 ? `${record.w}–${record.l}` : null,
    place ? `${ordinal(place)} in ${team.conference} ${team.division}` : `${team.conference} ${team.division}`,
  ].filter(Boolean).join(' · ');

  return (
    <div className="min-h-screen">
      <Header />
      <section className="tm-head" style={{ backgroundImage: photo ? `${wash}, url("${photo}")` : wash }}>
        <div className="tm-wrap tm-head-in">
          <img src={getEspnLogoUrl(team.abbr)} alt="" width={96} height={96} />
          <div>
            <h1>{team.city} {team.name}</h1>
            <p>{meta}</p>
          </div>
        </div>
      </section>

      <main className="tm-wrap tm-two">
        <div className="tm-stack">
          <section className="clark-card tm-outlook">
            <img src="/brand/clark-logo.jpg" alt="" />
            <p>
              {outlook.remaining > 0
                ? `"I have the ${team.name} favored in ${outlook.favoredIn} of their ${outlook.remaining} remaining games on the board. That works out to about ${outlook.expectedWins.toFixed(1)} more wins."`
                : `"That's every ${team.name} game on the board graded."`}
              <small>Clark is {outlook.clark.w}–{outlook.clark.l} picking {team.name} games this season</small>
            </p>
          </section>

          {notes.players.length > 0 && (
            <section>
              <h2 className="hm-h2">Key players</h2>
              {notes.players.map((p) => (
                <div key={p.name} className="tm-row">
                  <div><b>{p.name}</b> <span className="gr-muted">{p.position}</span><div className="gr-muted tm-sub">{p.role}</div></div>
                  <span className="tm-stat">{p.stat_line}</span>
                </div>
              ))}
            </section>
          )}

          <section>
            <h2 className="hm-h2">Injuries</h2>
            {notes.injuries.length === 0
              ? <p className="gr-muted tm-pad">No injuries listed for the {team.name}' next game.</p>
              : notes.injuries.map((i) => (
                <div key={i.name} className="tm-row">
                  <div><b>{i.name}</b> <span className="gr-muted">{i.position} · {i.injury}</span></div>
                  <span className={`gr-chip ${i.status === 'Out' ? 'loss' : ''}`}>{i.status}</span>
                </div>
              ))}
          </section>
        </div>

        <aside>
          <h2 className="hm-h2">Schedule</h2>
          {loading && <p className="gr-muted tm-pad">Loading schedule</p>}
          {schedule.map((r) => (
            <Link key={gameKey(r.game)} to={gamePath(r.game)} className="tm-game">
              <span className="tm-wk">Wk {r.game.week}</span>
              <span className="tm-opp"><img src={getEspnLogoUrl(r.opponent)} alt="" width={22} height={22} />{r.home ? 'vs' : 'at'} {nick(r.opponent)}</span>
              {r.result
                ? <span className={`gr-chip ${r.result.won ? 'win' : 'loss'}`}>{r.result.won ? 'W' : 'L'} {r.result.us}–{r.result.them}</span>
                : <span className="tm-next">{r.game.gametime ? formatKickoff(r.game.gametime) : ''}<small>Clark: {r.clarkPicksUs ? team.abbr : r.opponent} {pct(r.clarkPicksUs ? r.clarkProb : 1 - r.clarkProb)}%</small></span>}
            </Link>
          ))}
        </aside>
      </main>
      <Footer />
    </div>
  );
}
