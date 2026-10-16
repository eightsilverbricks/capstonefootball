import { useMemo, useState } from 'react';
import type { LivePlay } from '@/data/liveRepository';
import { EMOJIS, type Counts, type Emoji, type PollChoice } from '@/data/socialRepository';
import { getTeam } from '@/data/teams';
import { getEspnLogoUrl } from '@/data/nflData';
import { isFinal } from '@/lib/gameStatus';
import {
  currentDrive, factorTracker, groupDrives, pickStanding, playDown, pollKey, winProbSeries,
  type Drive, type LiveAware, type TrackState,
} from '@/lib/live';
import WinProbChart from './WinProbChart';
import LiveField from './LiveField';
import LiveBox from './LiveBox';
import { explainPlay } from '@/lib/clarkVoice';

const nick = (t: string) => getTeam(t)?.name ?? t;
const pct = (p: number) => Math.round(p * 100);
const NO_DRIVES: never[] = [];
const ICON: Record<TrackState, string> = { yes: '✓', no: '✗', waiting: '…' };

export interface SocialProps {
  reactions: { counts: Counts<Emoji>; mine: Record<string, Emoji> };
  polls: { counts: Counts<PollChoice>; mine: Record<string, PollChoice> };
  react: (playId: string, emoji: Emoji) => void;
  castVote: (pollKey: string, choice: PollChoice) => void;
}

export function Reactions({ playId, social }: { playId: string; social: SocialProps }) {
  const counts = social.reactions.counts[playId] ?? {};
  return (
    <span className="lv-react">
      {EMOJIS.map((e) => (
        <button key={e} type="button" aria-pressed={social.reactions.mine[playId] === e}
          aria-label={`React ${e}`} onClick={() => social.react(playId, e)}>
          {e}{counts[e] ? <small>{counts[e]}</small> : null}
        </button>
      ))}
    </span>
  );
}

function Explain({ play }: { play: LivePlay }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="lv-explain" aria-expanded={open} onClick={() => setOpen((o) => !o)}>What happened?</button>
      {open && <span className="lv-explain-text">{explainPlay(play)}</span>}
    </>
  );
}

export function BigPlayCard({ play, social }: { play: LivePlay; social: SocialProps }) {
  return (
    <div className="lv-big">
      <div className="note">{play.note ?? play.text}</div>
      {play.note && <div className="txt">{play.text}</div>}
      <div className="meta">
        <span>Q{play.quarter} {play.clock}</span>
        <Explain play={play} />
        <Reactions playId={play.play_id} social={social} />
      </div>
    </div>
  );
}

const RESULT_TONE: Record<string, string> = { TD: 'td', FG: 'fg', Interception: 'to', Fumble: 'to', Turnover: 'to', 'In progress': 'live' };

/** One snap: clock, down and distance, what happened, yards. */
function PlayRow({ play }: { play: LivePlay }) {
  const down = playDown(play);
  const gain = /kickoff|punt|timeout|end of|extra point|field goal/i.test(play.play_type) ? null : play.yards;
  return (
    <div className={`lv-play${play.is_big ? ' big' : ''}`}>
      <span className="t">Q{play.quarter > 4 ? 'OT' : play.quarter} {play.clock}{down && <em>{down}</em>}</span>
      <span>{play.note && <b className="lv-note">{play.note} </b>}{play.text.trim()} <Explain play={play} /></span>
      {gain != null && <span className={`yd${gain > 0 ? ' pos' : gain < 0 ? ' neg' : ''}`}>{gain > 0 ? `+${gain}` : gain}</span>}
    </div>
  );
}

function DriveHead({ drive }: { drive: Drive }) {
  const summary = drive.description ?? `${drive.plays.length} plays, ${drive.yards} yds`;
  return (
    <>
      {drive.offense && <img src={getEspnLogoUrl(drive.offense)} alt="" width={20} height={20} />}
      <span className="who">{drive.offense ?? 'Drive'}</span>
      <span className="sum">{summary}{drive.start ? ` · from ${drive.start}` : ''}</span>
      <span className={`res ${RESULT_TONE[drive.result] ?? ''}`}>{drive.result}</span>
    </>
  );
}

function DriveRow({ drive, social }: { drive: Drive; social: SocialProps }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="lv-drive">
      {drive.big.slice().reverse().map((p) => <BigPlayCard key={p.play_id} play={p} social={social} />)}
      <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <DriveHead drive={drive} />
        <span className="chev" aria-hidden="true">{open ? '−' : '+'}</span>
      </button>
      {open && drive.plays.slice().reverse().map((p) => <PlayRow key={p.play_id} play={p} />)}
    </div>
  );
}

/** The drive happening now, every snap visible, newest first. */
function CurrentDrive({ drive, social }: { drive: Drive; social: SocialProps }) {
  const big = drive.big[drive.big.length - 1];
  return (
    <section className="gv-panel lv-now">
      <div className="gv-ph"><h2>This drive</h2><span className="gr-live"><span className="live-dot" />Live</span></div>
      <div className="gv-pb">
        <div className="lv-now-head"><DriveHead drive={drive} /></div>
        {big && <BigPlayCard play={big} social={social} />}
        <div className="lv-now-plays">
          {drive.plays.slice().reverse().map((p) => <PlayRow key={p.play_id} play={p} />)}
        </div>
      </div>
    </section>
  );
}

function FourthDownPoll({ game, social }: { game: LiveAware; social: SocialProps }) {
  const live = game.live;
  const key = live ? pollKey(live) : null;
  if (!live || !key) return null;
  const counts = social.polls.counts[key] ?? {};
  const total = (counts.go ?? 0) + (counts.kick ?? 0);
  const mine = social.polls.mine[key];
  const share = (c: PollChoice) => (total ? (counts[c] ?? 0) / total : 0);
  return (
    <section className="lv-poll" aria-live="polite">
      <h3>4th & {live.distance ?? '?'}{live.yard_line ? ` at ${live.yard_line}` : ''}. What should {live.possession ?? 'they'} do?</h3>
      <div className="opts">
        {(['go', 'kick'] as PollChoice[]).map((c) => (
          <button key={c} type="button" aria-pressed={mine === c} disabled={!!mine} onClick={() => social.castVote(key, c)}>
            {mine && <span className="bar" style={{ transform: `scaleX(${share(c)})`, width: '100%' }} />}
            <span>{c === 'go' ? 'Go for it' : 'Kick it'}{mine ? ` · ${pct(share(c))}%` : ''}</span>
          </button>
        ))}
      </div>
      <p className="lv-poll-n">{mine ? `${total} ${total === 1 ? 'fan has' : 'fans have'} voted` : 'Vote to see how other fans called it.'}</p>
    </section>
  );
}

/** Live tab: your pick, the field, 4th-down poll, win %, this drive, box score, Clark's calls, every drive. */
export default function LiveTab({ game, plays, userPick, social }: {
  game: LiveAware;
  plays: LivePlay[];
  userPick: { team: string; confidence: number } | null;
  social: SocialProps;
}) {
  const over = isFinal(game);
  const summaries = game.live?.drives ?? NO_DRIVES;
  const drives = useMemo(() => groupDrives(plays, over, summaries), [plays, over, summaries]);
  const now = currentDrive(drives, over);
  const earlier = now ? drives.slice(0, -1) : drives;
  const tracker = useMemo(() => factorTracker(game, plays), [game, plays]);
  const series = useMemo(() => winProbSeries(plays), [plays]);
  const started = plays.length > 0 || (game.live && game.live.status !== 'pre');
  const scoreNow = isFinal(game)
    ? { home_team: game.home_team, home_score: game.home_score ?? 0, away_score: game.away_score ?? 0 }
    : game.live ? game.live : null;
  const standing = userPick && scoreNow && started ? pickStanding(userPick.team, scoreNow) : null;
  const box = game.live?.box;

  return (
    <>
      {userPick && standing && (
        <div className={`lv-mine ${standing}`} aria-live="polite">
          <span>Your pick: {userPick.team} {pct(userPick.confidence)}%</span>
          <span>{isFinal(game) ? (standing === 'winning' ? 'Won ✓' : standing === 'losing' ? 'Lost ✗' : 'Tie') : `${standing} ●`}</span>
        </div>
      )}
      {game.live?.status === 'in' && <LiveField live={game.live} drive={now} />}
      <FourthDownPoll game={game} social={social} />
      <section className="gv-panel">
        <div className="gv-ph"><h2>Win probability</h2><span className="gr-muted">Dashed line = Clark before kickoff</span></div>
        <div className="gv-pb">
          <WinProbChart game={game} series={series} />
          {!started && <p className="gr-muted">The live line starts at kickoff.</p>}
        </div>
      </section>
      {now && <CurrentDrive drive={now} social={social} />}
      {box && Object.keys(box.teams).length > 0 && <LiveBox box={box} away={game.away_team} home={game.home_team} />}
      <section className="gv-panel">
        <div className="gv-ph"><h2>Clark's calls, live</h2><span className="gr-muted">Graded as the game happens</span></div>
        <ul className="gv-pb lv-track">
          {tracker.map((t) => (
            <li key={t.claim} className={t.state}>
              <span className="ic" aria-label={t.state === 'yes' ? 'on track' : t.state === 'no' ? 'off track' : 'waiting'}>{ICON[t.state]}</span>
              <div><b>{t.claim}</b><span>{t.now}</span></div>
            </li>
          ))}
        </ul>
      </section>
      <section className="gv-panel">
        <div className="gv-ph"><h2>{now ? 'Earlier drives' : 'Every drive'}</h2><span className="gr-muted">{drives.length ? `${drives.length} drive${drives.length === 1 ? '' : 's'} · newest first` : 'Newest first'}</span></div>
        <div className="gv-pb lv-feed">
          {drives.length === 0
            ? <p className="gr-muted">Plays show up here within seconds of the snap, starting at kickoff of {nick(game.away_team)} at {nick(game.home_team)}.</p>
            : earlier.length === 0
              ? <p className="gr-muted">The opening drive is above. Finished drives stack up here.</p>
              : earlier.slice().reverse().map((d) => <DriveRow key={d.id} drive={d} social={social} />)}
        </div>
      </section>
    </>
  );
}
