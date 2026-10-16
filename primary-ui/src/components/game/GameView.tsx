import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiPrediction, getPredictedProbability } from '@/types/prediction';
import { getEspnLogoUrl, getTeamColors } from '@/data/nflData';
import { getTeam } from '@/data/teams';
import { useGamePick } from '@/hooks/useGamePick';
import { useAuth } from '@/hooks/useAuth';
import { useFanSentiment } from '@/hooks/useFanSentiment';
import { usePredictions } from '@/hooks/usePredictions';
import { gameKey, getFanPick, getVegasPick } from '@/lib/threeWaySignal';
import { isFinal, isPickingClosed } from '@/lib/gameStatus';
import { confetti, toast } from '@/lib/fx';
import SparkSlider from '@/components/picks/SparkSlider';
import FactorList from '@/components/game-report/FactorList';
import KeyPlayersPanel from '@/components/game-report/KeyPlayersPanel';
import PlayerMatchupCard from '@/components/game-report/PlayerMatchupCard';
import WeatherPanel from '@/components/game-report/WeatherPanel';
import StadiumPanel from '@/components/game-report/StadiumPanel';
import GameHeader from './GameHeader';
import WinProbChart from './WinProbChart';
import ClarkReportArticle from './ClarkReportArticle';
import LiveTab from './LiveTab';
import ChatPanel from './ChatPanel';
import CommentsThread from './CommentsThread';
import RecapTab from './RecapTab';
import ShareButtons from './ShareButtons';
import AskClark from './AskClark';
import { useGamePlays } from '@/hooks/useGamePlays';
import { useGameSocial } from '@/hooks/useGameSocial';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { isLive, type LiveAware } from '@/lib/live';

type Tab = 'preview' | 'live' | 'chat' | 'recap';
const pct = (p: number) => Math.round(p * 100);
const nick = (t: string) => getTeam(t)?.name ?? t;

function PickPanel({ game }: { game: ApiPrediction }) {
  const pick = useGamePick(game);
  const { isSignedIn } = useAuth();
  const closed = isPickingClosed(game);
  const [editing, setEditing] = useState(false);

  const lock = (team: string, confidence: number, at: { x: number; y: number }) => {
    pick.lockAs({ team, confidence });
    setEditing(false);
    if (!isSignedIn) return; // sign-up opens; the pick is saved after
    const c = getTeamColors(team);
    confetti([c.primary, '#ffffff', c.secondary], at.x, at.y);
    toast(`Locked: ${nick(team)} · ${pct(confidence)}%. Let's see if you beat Clark.`, getEspnLogoUrl(team));
  };

  if (pick.userPick && !editing) {
    return (
      <section className="gv-panel">
        <div className="gv-ph"><h2>Your pick</h2>{!closed && <button type="button" className="gr-link" onClick={() => { pick.changePick(); setEditing(true); }}>Change pick</button>}</div>
        <div className="gv-pb gv-locked">
          <img src={getEspnLogoUrl(pick.userPick.team)} alt="" width={40} height={40} />
          <b>{nick(pick.userPick.team)} · {pct(pick.userPick.confidence)}%</b>
          <span>{closed ? 'Picks are locked for this game.' : 'Locked in. You can change it until kickoff.'}</span>
        </div>
        {isSignedIn && <div className="gv-pb" style={{ paddingTop: 0 }}><ShareButtons game={game} userPick={pick.userPick} /></div>}
      </section>
    );
  }
  if (closed) {
    return <section className="gv-panel"><div className="gv-ph"><h2>Your pick</h2></div><div className="gv-pb gr-muted">{isFinal(game) ? 'This game has been played, so picks are closed.' : 'Picks locked at kickoff.'}</div></section>;
  }
  return (
    <section className="gv-panel">
      <div className="gv-ph"><h2>Your pick</h2><span className="gr-muted">Locks at kickoff</span></div>
      <div className="gv-pb">
        <SparkSlider
          away={game.away_team}
          home={game.home_team}
          awayName={nick(game.away_team)}
          homeName={nick(game.home_team)}
          value={pick.draft}
          onChange={pick.setDraft}
          onRelease={(p, at) => lock(p.team, p.confidence, at)}
        />
      </div>
    </section>
  );
}

function ClarkReport({ game }: { game: ApiPrediction }) {
  const loser = game.predicted_winner === game.home_team ? game.away_team : game.home_team;
  const story = game.football_story ?? game.explanation_summary;
  return (
    <section className="gv-panel">
      <div className="gv-pb gv-report">
        <div className="gv-says">
          <img src="/brand/clark-logo.jpg" alt="" />
          <div>
            <div className="gp-kicker">The Clark Report</div>
            <h2>"I'm on the {nick(game.predicted_winner)}, {pct(getPredictedProbability(game))}%."</h2>
            {story && <p>{story}</p>}
          </div>
        </div>
        {(game.factor_cards?.length ?? 0) > 0 && (
          <div className="gv-factors"><FactorList factors={game.factor_cards ?? []} winner={game.predicted_winner} loser={loser} /></div>
        )}
        {game.risk_factor && (
          <div className="gv-upset">
            <h3>How the {nick(loser)} win</h3>
            <p>{game.risk_factor}</p>
          </div>
        )}
      </div>
    </section>
  );
}

function Sidebar({ game }: { game: ApiPrediction }) {
  const w = game.weather;
  return (
    <aside className="gv-side">
      {game.key_players?.length || game.injury_notes?.length ? (
        <KeyPlayersPanel awayTeam={game.away_team} homeTeam={game.home_team} players={game.key_players ?? []} injuries={game.injury_notes ?? []} />
      ) : (
        <PlayerMatchupCard awayTeam={game.away_team} homeTeam={game.home_team} awayPlayers={game.away_players} homePlayers={game.home_players} />
      )}
      <WeatherPanel weather={w} windConsequence="" />
      <StadiumPanel stadium={w?.stadium ?? game.stadium} surface={w?.surface} roof={w?.roof} location={game.location} homeTeam={game.home_team} />
      {game.market_note && <section className="gv-panel"><div className="gv-ph"><h2>Betting line</h2></div><div className="gv-pb">{game.market_note}</div></section>}
    </aside>
  );
}

/** Opens on Preview before kickoff, Live during the game, Recap after (§4). */
function defaultTab(game: LiveAware): Tab {
  if (isFinal(game)) return 'recap';
  return isLive(game) ? 'live' : 'preview';
}

/** The game page: scorebug header, then Preview · Live · Chat · Recap. */
export default function GameView({ game }: { game: LiveAware }) {
  const key = gameKey(game);
  const keys = useMemo(() => [key], [key]);
  const { sentiment } = useFanSentiment(keys);
  const { predictions } = usePredictions();
  const [tab, setTab] = useState<Tab>(() => defaultTab(game));
  const pick = useGamePick(game);
  const live = isLive(game);
  const { plays } = useGamePlays(key, game.season !== 2024 && (live || isFinal(game) || tab !== 'preview'), live);
  const social = useGameSocial(key);

  // Jump to Live the moment the game kicks off, unless the reader picked a tab.
  const [touched, setTouched] = useState(false);
  useEffect(() => { if (!touched) setTab(defaultTab(game)); }, [live, game.home_score, touched]); // eslint-disable-line react-hooks/exhaustive-deps

  const clarkRecord = useMemo(() => {
    const done = predictions.filter((g) => g.season === game.season && g.actual_winner);
    const wins = done.filter((g) => g.actual_winner === g.predicted_winner).length;
    return `${wins}–${done.length - wins}`;
  }, [predictions, game.season]);

  const tabs: { id: Tab; label: string }[] = [
    { id: 'preview', label: 'Preview' },
    { id: 'live', label: live ? '● Live' : 'Live' },
    { id: 'chat', label: 'Chat' },
    { id: 'recap', label: 'Recap' },
  ];
  const userPick = pick.userPick ? { team: pick.userPick.team, confidence: pick.userPick.confidence } : null;
  // On desktop the chat sits beside the Live tab; below that it's its own tab.
  // Only one ChatPanel is ever mounted, so there's one realtime channel per game.
  const wide = useMediaQuery('(min-width: 1024px)');
  const chatBeside = tab === 'live' && wide;
  const chat = <ChatPanel game={game} gameKey={key} plays={plays} social={social} />;

  return (
    <>
      <GameHeader game={game} vegas={getVegasPick(game)} fan={getFanPick(game, sentiment)} />
      <div className="gv-yourbar">
        <div className="gv-wrap">
          {pick.userPick
            ? <span>Your pick: <b>{nick(pick.userPick.team)} · {pct(pick.userPick.confidence)}%</b></span>
            : <span>You haven't picked this game.</span>}
          <span className="gr-muted">Clark this season: {clarkRecord}</span>
        </div>
      </div>
      <nav className="gv-tabs" aria-label="Game sections">
        <div className="gv-wrap" role="tablist">
          {tabs.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id}
              hidden={t.id === 'chat' && wide && tab === 'live'}
              onClick={() => { setTouched(true); setTab(t.id); }}>{t.label}</button>
          ))}
        </div>
      </nav>
      <div className="gv-wrap gv-layout">
        <div className="gv-main" key={tab}>
          {tab === 'preview' && (
            <>
              <PickPanel game={game} />
              {game.clark_report
                ? <ClarkReportArticle game={game} report={game.clark_report} record={clarkRecord} />
                : <ClarkReport game={game} />}
              <AskClark game={game} />
              <CommentsThread gameKey={key} />
            </>
          )}
          {tab === 'live' && <LiveTab game={game} plays={plays} userPick={userPick} social={social} />}
          {tab === 'chat' && chat}
          {tab === 'recap' && <RecapTab game={game} plays={plays} userPick={userPick} />}
        </div>
        {chatBeside
          ? <aside className="gv-side gv-chat-side">{chat}</aside>
          : <Sidebar game={game} />}
      </div>
      <p className="gv-wrap gv-foot">
        <Link to="/games">← All games</Link>
      </p>
    </>
  );
}
