import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { usePredictions } from '@/hooks/usePredictions';
import { useFanSentiment } from '@/hooks/useFanSentiment';
import { useSeasonMode } from '@/context/SeasonModeContext';
import { openAuthDialog } from '@/hooks/useAuthDialog';
import { resolveCurrentWeek } from '@/lib/currentWeek';
import { gameKey } from '@/lib/threeWaySignal';
import { formatKickoff } from '@/lib/slate';
import { isFinal } from '@/lib/gameStatus';
import { recordStrip, showcaseGame } from '@/lib/landingFeed';
import { getEspnLogoUrl, getTeamColors } from '@/data/nflData';
import { getTeam } from '@/data/teams';
import { stadiumImageUrl } from '@/data/stadiumImages';
import { FOUNDERS } from '@/data/founders';
import { ApiPrediction, getPredictedProbability } from '@/types/prediction';

const nick = (t: string) => getTeam(t)?.name ?? t;
const pct = (p: number) => Math.round(p * 100);

/** The avatar shows the group photo at 3× width; this centres one face (x as 0–100 of the photo) in the circle. */
const AVATAR_ZOOM = 3;
const faceOffset = (x: number) => Math.min(100, Math.max(0, ((x / 100) * AVATAR_ZOOM - 0.5) / (AVATAR_ZOOM - 1) * 100));

const STEPS = [
  { title: 'Read the Clark Report', body: 'Who Clark picks, the reasons in plain English, key players and injuries, and how the underdog wins.' },
  { title: 'Make your pick', body: 'Pick a winner and set how sure you are. Picks lock at kickoff.' },
  { title: 'Beat Clark', body: 'Every pick is graded. See your record next to Clark, the betting line, and every fanbase.' },
];

/** A real Clark Report, first reason open, the rest blurred behind sign-up. */
function ReportTeaser({ game }: { game: ApiPrediction }) {
  const a = getTeamColors(game.away_team).primary;
  const h = getTeamColors(game.home_team).primary;
  const photo = stadiumImageUrl(game.home_team, 1000);
  const wash = `linear-gradient(90deg, ${a}E6, ${a}88 45%, ${h}88 55%, ${h}E6)`;
  const factors = (game.factor_cards ?? []).filter((f) => f.headline).slice(0, 4);
  const [first, ...rest] = factors;
  const loser = game.predicted_winner === game.home_team ? game.away_team : game.home_team;
  const story = (game.football_story ?? game.explanation_summary ?? '')
    .replace(/^Clark picks [A-Z]{2,3} with an? \d+% chance to win\.\s*/, '');

  return (
    <div className="ld-report">
      <div className="ld-rh" style={{ backgroundImage: photo ? `${wash}, url("${photo}")` : wash }}>
        <span><img src={getEspnLogoUrl(game.away_team)} alt="" width={34} height={34} />{nick(game.away_team)}</span>
        <small>{isFinal(game) ? 'Final' : [game.weekday, formatKickoff(game.gametime)].filter(Boolean).join(' ')}</small>
        <span>{nick(game.home_team)}<img src={getEspnLogoUrl(game.home_team)} alt="" width={34} height={34} /></span>
      </div>
      <div className="ld-rb">
        <div className="gp-kicker">The Clark Report</div>
        <p className="ld-call">"I'm on the {nick(game.predicted_winner)}, {pct(getPredictedProbability(game))}%."{story && ` ${story}`}</p>
        {first && <div className="ld-f"><b>{first.headline}</b>{first.explanation && ` ${first.explanation}`}</div>}
        <div className="ld-gate">
          <div className="ld-blur" aria-hidden="true">
            {rest.map((f) => <div key={f.name} className="ld-f"><b>{f.headline}</b></div>)}
            {game.risk_factor && <div className="ld-f"><b>How the {nick(loser)} win:</b> {game.risk_factor}</div>}
            {rest.length === 0 && !game.risk_factor && <div className="ld-f"><b>Key players, injuries, and what would change Clark's mind.</b></div>}
          </div>
          <div className="ld-gate-cta">
            <button type="button" className="pill pill-red" onClick={() => openAuthDialog('signup')}>Create a free account to read it all</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** The signed-out front door: the pitch, a real report teaser, how it works, Clark's record, the crew. */
export default function LandingPage() {
  const { predictions } = usePredictions();
  const { config: seasonConfig } = useSeasonMode();
  const weeks = useMemo(() => [...new Set(predictions.map((g) => g.week))].sort((a, b) => a - b), [predictions]);
  const week = resolveCurrentWeek(weeks, { isDemo: seasonConfig.isDemo });
  const weekGames = useMemo(() => predictions.filter((g) => g.week === week), [predictions, week]);
  const weekKeys = useMemo(() => weekGames.map(gameKey), [weekGames]);
  const { sentiment } = useFanSentiment(weekKeys);

  const teaser = useMemo(() => showcaseGame(predictions, weekGames), [predictions, weekGames]);
  const stats = useMemo(() => recordStrip(predictions, weekGames, sentiment), [predictions, weekGames, sentiment]);

  return (
    <div className="min-h-screen">
      <Header />
      <main className="ld-wrap">
        <section className="ld-hero" aria-labelledby="ld-title">
          <div>
            <img className="ld-logo" src="/brand/clark-logo.jpg" alt="Clark Index logo" width={84} height={84} />
            <div className="gp-kicker">Free · No betting</div>
            <h1 id="ld-title" className="ld-h1">Every NFL game, explained in plain English. Then pick against Clark.</h1>
            <p className="ld-lede">Clark is our prediction model. For every game he tells you who he picks, why, and how the other team could win.</p>
            <div className="ld-ctas">
              <button type="button" className="pill pill-red" onClick={() => openAuthDialog('signup')}>Create free account</button>
              <Link to="/games" className="pill pill-line">See this week's games</Link>
            </div>
          </div>
          {teaser && <ReportTeaser game={teaser} />}
        </section>

        <section className="ld-steps" aria-label="How it works">
          {STEPS.map((s, i) => (
            <div key={s.title}>
              <div className="ld-n">{i + 1}</div>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </div>
          ))}
        </section>

        {stats.length > 0 && (
          <section className="ld-record" aria-label="Clark's record" style={{ gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))` }}>
            {stats.map((s) => <div key={s.id}><b>{s.value}</b><span>{s.label}</span></div>)}
          </section>
        )}

        <section className="ld-crew" aria-labelledby="ld-crew-title">
          <img className="ld-crew-art" src="/founders/group.jpg" alt="Illustration of Takuo, Nicholas and Zane in their team jerseys" width={460} height={307} loading="lazy" />
          <div>
            <div className="gp-kicker">Meet the crew</div>
            <h2 id="ld-crew-title" className="ld-h2">Three fans, one model, a lot of arguing.</h2>
            <div className="ld-cards">
              {FOUNDERS.map((f) => (
                <div key={f.id} className="ld-card">
                  <span className="ld-av" style={{ backgroundPosition: `${faceOffset(f.photoXPercent)}% 18%`, ['--team' as string]: getTeamColors(f.team).primary }} />
                  <b>{f.firstName}</b>
                  <span>{f.teamName} · #{f.number}</span>
                  <p>{f.line}</p>
                </div>
              ))}
            </div>
            <p className="gr-muted ld-note">We pick every game too. Beat us on the leaderboard.</p>
          </div>
        </section>

        <section className="ld-close">
          <h2 className="ld-h2">Make your picks for this week.</h2>
          <p>Free. No betting. Takes a minute.</p>
          <button type="button" className="pill pill-red" onClick={() => openAuthDialog('signup')}>Create free account</button>
        </section>
      </main>
      <Footer />
    </div>
  );
}
