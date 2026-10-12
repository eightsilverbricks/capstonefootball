import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, RefreshCw } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import PreSeasonNotice from '@/components/PreSeasonNotice';
import SparkSlider from '@/components/picks/SparkSlider';
import { usePredictions } from '@/hooks/usePredictions';
import { useUserPicks } from '@/hooks/useUserPicks';
import { useFanSentiment } from '@/hooks/useFanSentiment';
import { useGamePick } from '@/hooks/useGamePick';
import { useAuth } from '@/hooks/useAuth';
import { useSeasonMode } from '@/context/SeasonModeContext';
import { resolveCurrentWeek } from '@/lib/currentWeek';
import { gameKey, computeFanbaseStandings } from '@/lib/threeWaySignal';
import { isFinal, isPickingClosed } from '@/lib/gameStatus';
import { formatKickoff } from '@/lib/slate';
import { confetti, toast } from '@/lib/fx';
import {
  FeedItem, LeadStory, clarkQuip, formatWL, gamePath, injuryItems, leadStory, moreItems, seasonRecords,
} from '@/lib/homeFeed';
import { getEspnLogoUrl, getTeamColors } from '@/data/nflData';
import { getTeam } from '@/data/teams';
import { stadiumImageUrl } from '@/data/stadiumImages';
import { ApiPrediction, getPredictedProbability } from '@/types/prediction';

const pct = (p: number) => Math.round(p * 100);
const nick = (t: string) => getTeam(t)?.name ?? t;

function LeadPick({ game }: { game: ApiPrediction }) {
  const pick = useGamePick(game);
  const { isSignedIn } = useAuth();
  if (isPickingClosed(game)) return null;
  if (pick.userPick) {
    return (
      <div className="hm-pick hm-pick-done">
        <img src={getEspnLogoUrl(pick.userPick.team)} alt="" width={28} height={28} />
        <span>You're on the <b>{nick(pick.userPick.team)}, {pct(pick.userPick.confidence)}%</b>.</span>
        <Link className="gr-link" to={gamePath(game)}>Change it</Link>
      </div>
    );
  }
  return (
    <div className="hm-pick">
      <div className="hm-pick-head"><b>Your pick</b><span className="gr-muted">Drag toward a team. Locks at kickoff.</span></div>
      <SparkSlider
        away={game.away_team}
        home={game.home_team}
        awayName={nick(game.away_team)}
        homeName={nick(game.home_team)}
        value={pick.draft}
        onChange={pick.setDraft}
        onRelease={(p, at) => {
          pick.lockAs(p);
          if (!isSignedIn) return;
          const c = getTeamColors(p.team);
          confetti([c.primary, '#ffffff', c.secondary], at.x, at.y);
          toast(`Locked: ${nick(p.team)} · ${pct(p.confidence)}%. Let's see if you beat Clark.`, getEspnLogoUrl(p.team));
        }}
      />
    </div>
  );
}

function Lead({ story }: { story: LeadStory }) {
  const { game } = story;
  const a = getTeamColors(game.away_team).primary;
  const h = getTeamColors(game.home_team).primary;
  const photo = stadiumImageUrl(game.home_team, 1200);
  const wash = `linear-gradient(105deg, ${a}D9 0 48%, ${h}D9 52% 100%)`;
  return (
    <article className="hm-lead">
      <Link to={gamePath(game)} className="hm-art" style={{ backgroundImage: photo ? `${wash}, url("${photo}")` : wash }}>
        <span className="clark-tag"><img src="/brand/clark-logo.jpg" alt="" />Clark: {game.predicted_winner} {pct(getPredictedProbability(game))}%</span>
        <img src={getEspnLogoUrl(game.away_team)} alt={nick(game.away_team)} width={130} height={130} />
        <span className="hm-at">at</span>
        <img src={getEspnLogoUrl(game.home_team)} alt={nick(game.home_team)} width={130} height={130} />
      </Link>
      <div className="gp-kicker hm-kicker">{story.kicker}</div>
      <Link to={gamePath(game)}><h1 className="hm-h1">{story.headline}</h1></Link>
      {story.dek && <p className="hm-dek">{story.dek}</p>}
      <div className="hm-byline">{story.byline}{!isFinal(game) && game.gametime ? ` · ${formatKickoff(game.gametime)}` : ''}</div>
      <LeadPick game={game} />
    </article>
  );
}

function Item({ item }: { item: FeedItem }) {
  return (
    <Link className="hm-item" to={gamePath(item.game)}>
      <div className="gp-kicker">{item.kicker}</div>
      <h3>{item.title}</h3>
      <p>{item.note}</p>
    </Link>
  );
}

function Finals({ games }: { games: ApiPrediction[] }) {
  const { picks } = useUserPicks();
  const finals = games.filter((g) => isFinal(g) && g.actual_winner);
  if (finals.length === 0) return null;
  return (
    <section>
      <h2 className="hm-h2">Final scores <Link to="/games">All games</Link></h2>
      {finals.slice(0, 6).map((g) => {
        const pick = picks[gameKey(g)];
        const mine = pick ? (pick.team === g.actual_winner ? 'win' : 'loss') : null;
        return (
          <Link key={gameKey(g)} className="hm-score" to={gamePath(g)}>
            <div className="hm-score-st"><span>Final</span>{mine && <span className={mine}>{mine === 'win' ? 'Your pick ✓' : 'Your pick ✗'}</span>}</div>
            {[g.away_team, g.home_team].map((t) => (
              <div key={t} className={`hm-score-row${t === g.actual_winner ? '' : ' lost'}`}>
                <img src={getEspnLogoUrl(t)} alt="" width={20} height={20} />{nick(t)}
                <b>{t === g.home_team ? g.home_score : g.away_score}</b>
              </div>
            ))}
          </Link>
        );
      })}
    </section>
  );
}

function Injuries({ games }: { games: ApiPrediction[] }) {
  const items = injuryItems(games);
  if (items.length === 0) return null;
  return (
    <section>
      <h2 className="hm-h2">Injuries</h2>
      {items.map((i) => (
        <Link key={i.key} className="hm-item" to={gamePath(i.game)}>
          <div className="gp-kicker">{i.team} · {i.status}</div>
          <h3>{i.name} ({i.injury})</h3>
          <p>{i.game.away_team} @ {i.game.home_team}</p>
        </Link>
      ))}
    </section>
  );
}

/** The signed-in front page: what's happening on the left, the Clark Report in the middle, you on the right. */
export default function HomeView() {
  const { predictions, loading, error, reload } = usePredictions();
  const { picks } = useUserPicks();
  const { user } = useAuth();
  const { config: seasonConfig } = useSeasonMode();

  const weeks = useMemo(() => [...new Set(predictions.map((g) => g.week))].sort((a, b) => a - b), [predictions]);
  const week = resolveCurrentWeek(weeks, { isDemo: seasonConfig.isDemo });
  const weekGames = useMemo(() => predictions.filter((g) => g.week === week), [predictions, week]);
  const keys = useMemo(() => predictions.map(gameKey), [predictions]);
  const { sentiment, fanbases } = useFanSentiment(keys);

  const story = useMemo(() => leadStory(weekGames, sentiment), [weekGames, sentiment]);
  const more = useMemo(() => moreItems(weekGames, story?.game ?? null), [weekGames, story]);
  const records = useMemo(() => seasonRecords(predictions, picks, sentiment), [predictions, picks, sentiment]);
  // Ranked by hit rate, which is the number shown beside each fanbase.
  const standings = useMemo(
    () => [...computeFanbaseStandings(predictions, fanbases)].sort((a, b) => b.correct / b.picks - a.correct / a.picks),
    [predictions, fanbases],
  );

  const picked = weekGames.filter((g) => picks[gameKey(g)]).length;
  const nextLock = weekGames.find((g) => !isPickingClosed(g) && !picks[gameKey(g)]);
  const myTeam = user?.favoriteTeam ?? null;

  return (
    <div className="min-h-screen">
      <Header />
      <main className="hm-wrap">
        <div className="mt-5"><PreSeasonNotice /></div>

        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3" style={{ color: 'var(--ink-3)' }}>
            <RefreshCw className="w-6 h-6 animate-spin" />
            <p className="text-sm">Loading this week</p>
          </div>
        )}

        {!loading && error && (
          <div className="clark-card my-8">
            <AlertCircle className="w-8 h-8 shrink-0" style={{ color: 'var(--loss)' }} />
            <p>Couldn't load this week.<small>{error}</small></p>
            <button type="button" className="pill pill-red ml-auto" onClick={reload}>Try again</button>
          </div>
        )}

        {!loading && !error && story && (
          <div className="hm-front">
            <div className="hm-col-l">
              <Finals games={weekGames} />
              <Injuries games={weekGames} />
            </div>

            <div className="hm-center">
              <Lead story={story} />
              {more.length > 0 && (
                <section>
                  <h2 className="hm-h2">More from this week</h2>
                  {more.map((item) => <Item key={item.key} item={item} />)}
                </section>
              )}
            </div>

            <aside className="hm-col-r">
              <Link to="/my-season" className="clark-card hm-says">
                <img src="/brand/clark-logo.jpg" alt="" />
                <p>"{clarkQuip(records)}"<small>Clark · see where you two disagreed</small></p>
              </Link>

              <section>
                <h2 className="hm-h2">Your week</h2>
                <div className="gp-stat"><span>Picked</span><b>{picked} of {weekGames.length}</b></div>
                <div className="gp-stat"><span>Next to pick</span><b>{nextLock ? `${nextLock.away_team} @ ${nextLock.home_team}` : 'All done'}</b></div>
                <div className="hm-vs3">
                  <div><b>{formatWL(records.you)}</b><span>You</span></div>
                  <div><b>{formatWL(records.clark)}</b><span>Clark</span></div>
                  <div><b>{formatWL(records.fans)}</b><span>Fans</span></div>
                </div>
                {nextLock && <Link to="/games" className="pill pill-red hm-cta">Make your picks</Link>}
              </section>

              {standings.length > 0 && (
                <section>
                  <h2 className="hm-h2">Fanbases <Link to="/leaderboard">All 32</Link></h2>
                  {standings.slice(0, 5).map((s, i) => (
                    <div key={s.team} className={`hm-rank${s.team === myTeam ? ' me' : ''}`}>
                      <span className="n">{i + 1}</span>
                      <img src={getEspnLogoUrl(s.team)} alt="" width={22} height={22} />
                      {nick(s.team)} fans
                      <span className="p">{pct(s.correct / s.picks)}%</span>
                    </div>
                  ))}
                </section>
              )}
            </aside>
          </div>
        )}

        {!loading && !error && !story && (
          <p className="py-16 text-center" style={{ color: 'var(--ink-3)' }}>No games this week.</p>
        )}
      </main>
      <Footer />
    </div>
  );
}
