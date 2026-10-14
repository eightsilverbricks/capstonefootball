import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import type { LivePlay } from '@/data/liveRepository';
import {
  POST_ERRORS, deleteChat, fetchAuthors, fetchChat, fetchGamePicks, postChat, reportChat, subscribeChat,
  type Author, type ChatMessage, type PickLookup,
} from '@/data/socialRepository';
import { getEspnLogoUrl } from '@/data/nflData';
import { useAuth } from '@/hooks/useAuth';
import { openAuthDialog } from '@/hooks/useAuthDialog';
import type { LiveAware } from '@/lib/live';
import { BigPlayCard, type SocialProps } from './LiveTab';
import { clarkChatLine } from '@/lib/clarkVoice';
import { getTeamColors } from '@/data/nflData';

const SHIELD_OPTIONS = [0, 15, 30, 60];
const SHIELD_KEY = 'clark.spoilerShield';

function readShield(): number {
  try { return Number(localStorage.getItem(SHIELD_KEY)) || 0; } catch { return 0; }
}

const HOUR_MS = 60 * 60 * 1000;
const MAX_LEN = 280;
const pct = (p: number) => Math.round(p * 100);

type ChatWindow = 'before' | 'open' | 'after';

/** Open from 1 hour before kickoff until 1 hour after the final whistle (§4 Tab 3). */
export function chatWindow(game: LiveAware, now = Date.now(), finalAt?: string | null): ChatWindow {
  const kickoff = game.kickoff_at ? Date.parse(game.kickoff_at) : null;
  if (game.live?.status !== 'in' && kickoff && now < kickoff - HOUR_MS) return 'before';
  const ended = finalAt ? Date.parse(finalAt) : game.live?.status === 'post' ? Date.parse(game.live.updated_at) : null;
  if (ended && now > ended + HOUR_MS) return 'after';
  return 'open';
}

type Item = { kind: 'msg'; at: string; msg: ChatMessage } | { kind: 'play'; at: string; play: LivePlay };

function Message({ msg, author, pick, mine, onReport, onDelete }: {
  msg: ChatMessage; author: Author | null; pick?: { team: string; confidence: number };
  mine: boolean; onReport: () => void; onDelete: () => void;
}) {
  const fav = author?.favoriteTeam;
  return (
    <div className="ch-msg">
      <span className="ch-av" aria-hidden="true">
        {fav ? <img src={getEspnLogoUrl(fav)} alt="" width={22} height={22} loading="lazy" /> : (author?.displayName ?? '?').slice(0, 1)}
      </span>
      <div>
        <div className="ch-who">
          <b>{author?.displayName ?? 'Fan'}</b>
          {pick && <span className="ch-pick">{pick.team} · {pct(pick.confidence)}%</span>}
          <button type="button" className="ch-x" onClick={mine ? onDelete : onReport}>{mine ? 'Delete' : 'Report'}</button>
        </div>
        <div className="ch-body">{msg.body}</div>
      </div>
    </div>
  );
}

/** Live game chat. Anyone reads; posting needs an account. Big plays land in the stream. */
export default function ChatPanel({ game, gameKey, plays, social }: {
  game: LiveAware; gameKey: string; plays: LivePlay[]; social: SocialProps;
}) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [authors, setAuthors] = useState<Record<string, Author>>({});
  const [picks, setPicks] = useState<PickLookup>({});
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const status = chatWindow(game);
  const [room, setRoom] = useState<'all' | string>('all');
  const [shield, setShield] = useState(readShield);
  const [now, setNow] = useState(Date.now());

  // The spoiler shield holds items back by N seconds, so re-check every few seconds.
  useEffect(() => {
    if (!shield) return;
    const id = window.setInterval(() => setNow(Date.now()), 3000);
    return () => window.clearInterval(id);
  }, [shield]);
  const changeShield = (v: number) => {
    setShield(v);
    try { localStorage.setItem(SHIELD_KEY, String(v)); } catch { /* per-viewer convenience only */ }
  };

  useEffect(() => {
    let cancelled = false;
    fetchChat(gameKey).then((rows) => {
      if (cancelled) return;
      setMessages(rows);
      setAuthors((a) => ({ ...a, ...Object.fromEntries(rows.filter((r) => r.author).map((r) => [r.userId, r.author!])) }));
    }).catch(() => {});
    fetchGamePicks(gameKey).then((p) => { if (!cancelled) setPicks(p); }).catch(() => {});
    const unsubscribe = subscribeChat(gameKey,
      (m) => setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m])),
      (id) => setMessages((prev) => prev.filter((x) => x.id !== id)));
    return () => { cancelled = true; unsubscribe(); };
  }, [gameKey]);

  // Fill in names for people who posted after we loaded.
  useEffect(() => {
    const missing = [...new Set(messages.map((m) => m.userId))].filter((id) => !authors[id]);
    if (missing.length) fetchAuthors(missing).then((a) => setAuthors((prev) => ({ ...prev, ...a }))).catch(() => {});
  }, [messages, authors]);

  const inRoom = (m: ChatMessage) => room === 'all' || (authors[m.userId] ?? m.author)?.favoriteTeam === room;
  const all = useMemo<Item[]>(() => [
    ...messages.filter(inRoom).map((msg) => ({ kind: 'msg' as const, at: msg.createdAt, msg })),
    ...plays.filter((p) => p.is_big).map((play) => ({ kind: 'play' as const, at: play.created_at, play })),
  ].sort((a, b) => a.at.localeCompare(b.at)), [messages, plays, room, authors]); // eslint-disable-line react-hooks/exhaustive-deps
  const cutoff = now - shield * 1000;
  const items = shield ? all.filter((it) => Date.parse(it.at) <= cutoff) : all;
  const held = all.length - items.length;

  // Fan mood: how this game's picks split between the two teams.
  const mood = useMemo(() => {
    const ps = Object.values(picks);
    const away = ps.filter((p) => p.team === game.away_team).length;
    return ps.length ? { away: away / ps.length, total: ps.length } : null;
  }, [picks, game.away_team]);

  // Stick to the bottom as new items arrive, unless the reader scrolled up.
  useEffect(() => {
    const el = listRef.current;
    if (el && el.scrollHeight - el.scrollTop - el.clientHeight < 160) el.scrollTop = el.scrollHeight;
  }, [items.length]);

  const send = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) { openAuthDialog('signup'); return; }
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setError('');
    const res = await postChat(gameKey, body);
    setSending(false);
    if (res.ok) setDraft('');
    else setError(POST_ERRORS[res.error ?? 'offline'] ?? POST_ERRORS.offline);
  };

  return (
    <section className="gv-panel ch" aria-label="Game chat">
      <div className="gv-ph">
        <h2>{status === 'after' ? 'Game-day chat' : 'Game chat'}</h2>
        <span className="gr-muted">{messages.length} messages</span>
      </div>
      <div className="ch-bar">
        <div className="ch-rooms" role="tablist" aria-label="Chat room">
          {(['all', game.away_team, game.home_team] as const).map((r) => (
            <button key={r} type="button" role="tab" aria-selected={room === r} onClick={() => setRoom(r)}>
              {r === 'all' ? 'Everyone' : `${r} fans`}
            </button>
          ))}
        </div>
        <label className="ch-shield">🛡️ Spoiler shield
          <select value={shield} onChange={(e) => changeShield(Number(e.target.value))} aria-label="How far behind live the chat runs">
            {SHIELD_OPTIONS.map((v) => <option key={v} value={v}>{v ? `${v}s behind` : 'Off'}</option>)}
          </select>
        </label>
      </div>
      {mood && mood.total >= 5 && (
        <div className="ch-mood" role="img" aria-label={`Fans picking ${game.away_team}: ${Math.round(mood.away * 100)}%`}>
          <i style={{ width: `${mood.away * 100}%`, background: getTeamColors(game.away_team).primary }} />
          <i style={{ width: `${(1 - mood.away) * 100}%`, background: getTeamColors(game.home_team).primary }} />
        </div>
      )}
      <div className="ch-list" ref={listRef} aria-live="polite">
        {items.length === 0 && <p className="gr-muted">No messages yet. {status === 'before' ? 'Chat opens 1 hour before kickoff.' : 'Say something!'}</p>}
        {items.map((it) => (it.kind === 'play'
          ? (
            <div key={`p${it.play.play_id}`} className="ch-playwrap">
              <BigPlayCard play={it.play} social={social} />
              <div className="ch-msg ch-clark">
                <span className="ch-av"><img src="/brand/clark-logo.jpg" alt="" width={30} height={30} /></span>
                <div><div className="ch-who"><b>Clark</b><span className="ch-pick">{game.predicted_winner} · the model</span></div>
                  <div className="ch-body">{clarkChatLine(it.play, game)}</div></div>
              </div>
            </div>
          )
          : <Message key={it.msg.id} msg={it.msg} author={authors[it.msg.userId] ?? it.msg.author}
              pick={picks[it.msg.userId]} mine={user?.id === it.msg.userId}
              onReport={() => { reportChat(it.msg.id); }} onDelete={() => { deleteChat(it.msg.id); setMessages((p) => p.filter((m) => m.id !== it.msg.id)); }} />))}
      </div>
      {held > 0 && (
        <div className="ch-held">🛡️ <b>{held} held back</b> to match your delay · <button type="button" onClick={() => changeShield(0)}>Show anyway</button></div>
      )}
      {error && <div className="ch-note" role="alert">{error}</div>}
      {status === 'open' ? (
        <form className="ch-form" onSubmit={send}>
          <input value={draft} maxLength={MAX_LEN} onChange={(e) => setDraft(e.target.value)}
            placeholder={user ? 'Say something…' : 'Sign in to chat'} aria-label="Chat message"
            onFocus={() => { if (!user) openAuthDialog('signup'); }} />
          <button className="ch-send" type="submit" disabled={sending || (!!user && !draft.trim())}>Send</button>
        </form>
      ) : (
        <div className="ch-form gr-muted">{status === 'before' ? 'Chat opens 1 hour before kickoff.' : 'This chat is closed and saved.'}</div>
      )}
    </section>
  );
}
