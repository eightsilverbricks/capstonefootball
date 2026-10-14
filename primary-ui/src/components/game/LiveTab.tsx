import { useMemo, useState } from 'react';
import type { LivePlay } from '@/data/liveRepository';
import { EMOJIS, type Counts, type Emoji, type PollChoice } from '@/data/socialRepository';
import { getTeam } from '@/data/teams';
import { isFinal } from '@/lib/gameStatus';
import {
  factorTracker, groupDrives, pickStanding, pollKey, type Drive, type LiveAware, type TrackState,
} from '@/lib/live';
import WinProbChart from './WinProbChart';
import { explainPlay } from '@/lib/clarkVoice';

const nick = (t: string) => getTeam(t)?.name ?? t;
const pct = (p: number) => Math.round(p * 100);
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

function DriveRow({ drive, social }: { drive: Drive; social: SocialProps }) {
  const [open, setOpen] = useState(false);
  const routine = drive.plays.filter((p) => !p.is_big);
  return (
    <div className="lv-drive">
      {drive.big.slice().reverse().map((p) => <BigPlayCard key={p.play_id} play={p} social={social} />)}
      <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {drive.offense && <span>{drive.offense}</span>}
        <span>Drive: {drive.plays.length} plays, {drive.yards} yds</span>
        <span className={`res${drive.result === 'TD' ? ' td' : ''}`}>{drive.result}</span>
      </button>
      {open && routine.slice().reverse().map((p) => (
        <div className="lv-play" key={p.play_id}><span className="t">Q{p.quarter} {p.clock}</span><span>{p.text} <Explain play={p} /></span></div>
      ))}
    </div>
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
    </section>
  );
}

/** Live tab: your pick, 4th-down poll, win % vs Clark, the factor tracker, the play feed. */
export default function LiveTab({ game, plays, userPick, social }: {
  game: LiveAware;
  plays: LivePlay[];
  userPick: { team: string; confidence: number } | null;
  social: SocialProps;
}) {
  const over = isFinal(game);
  const drives = useMemo(() => groupDrives(plays, over), [plays, over]);
  const tracker = useMemo(() => factorTracker(game, plays), [game, plays]);
  const wp = useMemo(() => plays.map((p) => p.home_win_prob).filter((x): x is number => x != null), [plays]);
  const started = plays.length > 0 || (game.live && game.live.status !== 'pre');
  const scoreNow = isFinal(game)
    ? { home_team: game.home_team, home_score: game.home_score ?? 0, away_score: game.away_score ?? 0 }
    : game.live ? game.live : null;
  const standing = userPick && scoreNow && started ? pickStanding(userPick.team, scoreNow) : null;

  return (
    <>
      {userPick && standing && (
        <div className={`lv-mine ${standing}`} aria-live="polite">
          <span>Your pick: {userPick.team} {pct(userPick.confidence)}%</span>
          <span>{isFinal(game) ? (standing === 'winning' ? 'Won ✓' : standing === 'losing' ? 'Lost ✗' : 'Tie') : `${standing} ●`}</span>
        </div>
      )}
      <FourthDownPoll game={game} social={social} />
      <section className="gv-panel">
        <div className="gv-ph"><h2>Win probability</h2><span className="gr-muted">Dashed line = Clark before kickoff</span></div>
        <div className="gv-pb">
          <WinProbChart game={game} points={wp} />
          {!started && <p className="gr-muted">The live line starts at kickoff.</p>}
        </div>
      </section>
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
        <div className="gv-ph"><h2>Play by play</h2><span className="gr-muted">Newest first</span></div>
        <div className="gv-pb lv-feed">
          {drives.length === 0
            ? <p className="gr-muted">Plays show up here within seconds of the snap, starting at kickoff of {nick(game.away_team)} at {nick(game.home_team)}.</p>
            : drives.slice().reverse().map((d) => <DriveRow key={d.id} drive={d} social={social} />)}
        </div>
      </section>
    </>
  );
}
