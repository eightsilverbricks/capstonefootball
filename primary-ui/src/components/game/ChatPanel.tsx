import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import type { LivePlay } from '@/data/liveRepository';
import {
  POST_ERRORS, deleteChat, fetchAuthors, fetchChat, fetchGamePicks, postChat, reportChat, subscribeChat,
  type Author, type ChatMessage, type LiveStatus, type PickLookup,
} from '@/data/socialRepository';
import { getEspnLogoUrl, getTeamColors } from '@/data/nflData';
import { useAuth } from '@/hooks/useAuth';
import { openAuthDialog } from '@/hooks/useAuthDialog';
import type { LiveAware } from '@/lib/live';
import { applyShield, chatStream, isNearBottom, mergeMessages } from '@/lib/chat';
import { clarkChatLine } from '@/lib/clarkVoice';
import { toast } from '@/lib/fx';
import { BigPlayCard, type SocialProps } from './LiveTab';

const SHIELD_OPTIONS = [0, 15, 30, 60];
const SHIELD_KEY = 'clark.spoilerShield';
const HOUR_MS = 60 * 60 * 1000;
const MAX_LEN = 280;
const COUNT_FROM = 230;
/** When realtime drops, fall back to re-reading the chat this often. */
const POLL_MS = 15_000;
const pct = (p: number) => Math.round(p * 100);

function readShield(): number {
  try { return Number(localStorage.getItem(SHIELD_KEY)) || 0; } catch { return 0; }
}

type ChatWindow = 'before' | 'open' | 'after';
type LoadState = 'loading' | 'ready' | 'error';

/** Open from 1 hour before kickoff until 1 hour after the final whistle (§4 Tab 3). */
export function chatWindow(game: LiveAware, now = Date.now(), finalAt?: string | null): ChatWindow {
  const kickoff = game.kickoff_at ? Date.parse(game.kickoff_at) : null;
  if (game.live?.status !== 'in' && kickoff && now < kickoff - HOUR_MS) return 'before';
  const ended = finalAt ? Date.parse(finalAt) : game.live?.status === 'post' ? Date.parse(game.live.updated_at) : null;
  if (ended && now > ended + HOUR_MS) return 'after';
  return 'open';
}

function Message({ msg, author, pick, mine, reported, onReport, onDelete }: {
  msg: ChatMessage; author: Author | null; pick?: { team: string; confidence: number };
  mine: boolean; reported: boolean; onReport: () => void; onDelete: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const fav = author?.favoriteTeam;
  let action: React.ReactNode;
  if (mine) {
    action = (
      <button type="button" className={`ch-x${confirming ? ' warn' : ''}`} onBlur={() => setConfirming(false)}
        onClick={() => (confirming ? onDelete() : setConfirming(true))}>
        {confirming ? 'Tap again to delete' : 'Delete'}
      </button>
    );
  } else {
    action = reported
      ? <span className="ch-x done">Reported</span>
      : <button type="button" className="ch-x" onClick={onReport}>Report</button>;
  }
  return (
    <div className={`ch-msg${mine ? ' mine' : ''}`}>
      <span className="ch-av" aria-hidden="true">
        {fav ? <img src={getEspnLogoUrl(fav)} alt="" width={22} height={22} loading="lazy" /> : (author?.displayName ?? '?').slice(0, 1)}
      </span>
      <div>
        <div className="ch-who">
          <b>{author?.displayName ?? 'Fan'}</b>
          {pick && <span className="ch-pick">{pick.team} · {pct(pick.confidence)}%</span>}
          {action}
        </div>
        <div className="ch-body">{msg.body}</div>
      </div>
    </div>
  );
}

function emptyLine(load: LoadState, status: ChatWindow, room: string, total: number): string {
  if (status === 'before') return 'Chat opens 1 hour before kickoff.';
  if (total > 0 && room !== 'all') return `No ${room} fans have posted yet.`;
  if (status === 'after') return 'Nobody chatted during this game.';
  return load === 'ready' ? 'No messages yet. Start it off.' : '';
}

/** Live game chat for members. Big plays land in the stream with Clark's take. */
export default function ChatPanel({ game, gameKey, plays, social }: {
  game: LiveAware; gameKey: string; plays: LivePlay[]; social: SocialProps;
}) {
  const { user } = useAuth();
  const myId = user?.id ?? null;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [authors, setAuthors] = useState<Record<string, Author>>({});
  const [picks, setPicks] = useState<PickLookup>({});
  const [load, setLoad] = useState<LoadState>('loading');
  const [live, setLive] = useState<LiveStatus>('connecting');
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [reported, setReported] = useState<Set<number>>(() => new Set());
  const [room, setRoom] = useState<'all' | string>('all');
  const [shield, setShield] = useState(readShield);
  const [now, setNow] = useState(Date.now());
  const [unseen, setUnseen] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const following = useRef(true);
  const shown = useRef(0);
  const status = chatWindow(game);

  const addAuthors = (rows: ChatMessage[]) =>
    setAuthors((a) => ({ ...a, ...Object.fromEntries(rows.filter((r) => r.author).map((r) => [r.userId, r.author!])) }));

  const reload = useCallback(() => {
    return fetchChat(gameKey).then((rows) => {
      setMessages((prev) => mergeMessages(prev, rows));
      addAuthors(rows);
      setLoad('ready');
    });
  }, [gameKey]);

  useEffect(() => {
    let cancelled = false;
    setLoad('loading');
    reload().catch(() => { if (!cancelled) setLoad('error'); });
    fetchGamePicks(gameKey).then((p) => { if (!cancelled) setPicks(p); }).catch(() => { /* picks next to names are optional */ });
    const unsubscribe = subscribeChat(gameKey,
      (m) => setMessages((prev) => mergeMessages(prev, [m])),
      (id) => setMessages((prev) => prev.filter((x) => x.id !== id)),
      (s) => { if (!cancelled) setLive(s); });
    return () => { cancelled = true; unsubscribe(); };
  }, [gameKey, reload]);

  // Realtime down: keep the chat moving by re-reading it.
  useEffect(() => {
    if (live !== 'down' || status !== 'open') return undefined;
    const id = window.setInterval(() => { reload().catch(() => { /* next tick retries */ }); }, POLL_MS);
    return () => window.clearInterval(id);
  }, [live, status, reload]);

  // The spoiler shield releases items as they age, so re-check every few seconds.
  useEffect(() => {
    if (!shield) return undefined;
    const id = window.setInterval(() => setNow(Date.now()), 3000);
    return () => window.clearInterval(id);
  }, [shield]);
  const changeShield = (v: number) => {
    setShield(v);
    setNow(Date.now());
    try { localStorage.setItem(SHIELD_KEY, String(v)); } catch { /* per-viewer convenience only */ }
  };

  // Fill in names for people who posted after we loaded.
  useEffect(() => {
    const missing = [...new Set(messages.map((m) => m.userId))].filter((id) => !authors[id]);
    if (missing.length) fetchAuthors(missing).then((a) => setAuthors((prev) => ({ ...prev, ...a }))).catch(() => { /* shows "Fan" */ });
  }, [messages, authors]);

  const roomMessages = useMemo(
    () => (room === 'all' ? messages : messages.filter((m) => (authors[m.userId] ?? m.author)?.favoriteTeam === room)),
    [messages, authors, room],
  );
  const all = useMemo(() => chatStream(roomMessages, plays), [roomMessages, plays]);
  const items = applyShield(all, shield, now, myId);
  const held = all.length - items.length;

  // Fan mood: how this game's picks split between the two teams.
  const mood = useMemo(() => {
    const ps = Object.values(picks);
    const away = ps.filter((p) => p.team === game.away_team).length;
    return ps.length ? { away: away / ps.length, total: ps.length } : null;
  }, [picks, game.away_team]);

  // Follow the newest item unless the reader has scrolled up; then count what they're missing.
  useLayoutEffect(() => {
    const el = listRef.current;
    const added = items.length - shown.current;
    shown.current = items.length;
    if (!el || added <= 0) return;
    if (following.current) el.scrollTop = el.scrollHeight;
    else setUnseen((n) => n + added);
  }, [items.length]);

  const jumpToNewest = () => {
    const el = listRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    following.current = true;
    setUnseen(0);
  };
  const onScroll = () => {
    const el = listRef.current;
    if (!el) return;
    following.current = isNearBottom(el);
    if (following.current) setUnseen(0);
  };

  const send = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) { openAuthDialog('signup'); return; }
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setError('');
    const res = await postChat(gameKey, body);
    setSending(false);
    if (!res.ok) { setError(POST_ERRORS[res.error ?? 'offline'] ?? POST_ERRORS.offline); return; }
    setDraft('');
    following.current = true;
    if (res.id != null) {
      const author: Author = { handle: user.handle, displayName: user.displayName, favoriteTeam: user.favoriteTeam };
      setMessages((prev) => mergeMessages(prev, [{ id: res.id!, userId: user.id, body, createdAt: new Date().toISOString(), author }]));
      setAuthors((a) => ({ ...a, [user.id]: author }));
    }
    inputRef.current?.focus();
  };

  const report = async (id: number) => {
    setReported((s) => new Set(s).add(id));
    try {
      await reportChat(id);
      toast('Thanks. Three reports hides a message until a moderator looks.');
    } catch {
      setReported((s) => { const next = new Set(s); next.delete(id); return next; });
      toast("Couldn't send that report. Try again.");
    }
  };

  const remove = async (msg: ChatMessage) => {
    setMessages((p) => p.filter((m) => m.id !== msg.id));
    try {
      await deleteChat(msg.id);
    } catch {
      setMessages((p) => mergeMessages(p, [msg]));
      toast("Couldn't delete that message. Try again.");
    }
  };

  const total = messages.length;
  const empty = emptyLine(load, status, room, total);

  return (
    <section className="gv-panel ch" aria-label="Game chat">
      <div className="gv-ph">
        <h2>{status === 'after' ? 'Game-day chat' : 'Game chat'}</h2>
        <span className="gr-muted">
          {live === 'down' && status === 'open' ? 'Reconnecting · ' : ''}
          {total} {total === 1 ? 'message' : 'messages'}
        </span>
      </div>
      <div className="ch-bar">
        <div className="ch-rooms" role="tablist" aria-label="Chat room">
          {(['all', game.away_team, game.home_team] as const).map((r) => (
            <button key={r} type="button" role="tab" aria-selected={room === r} onClick={() => { setRoom(r); following.current = true; shown.current = 0; }}>
              {r === 'all' ? 'Everyone' : `${r} fans`}
            </button>
          ))}
        </div>
        <label className="ch-shield"><span aria-hidden="true">🛡️</span> Spoiler shield
          <select value={shield} onChange={(e) => changeShield(Number(e.target.value))} aria-label="How far behind live the chat runs">
            {SHIELD_OPTIONS.map((v) => <option key={v} value={v}>{v ? `${v}s behind` : 'Off'}</option>)}
          </select>
        </label>
      </div>
      {mood && mood.total >= 5 && (
        <div className="ch-mood" role="img" aria-label={`Fans picking ${game.away_team}: ${pct(mood.away)}%`}>
          <i style={{ width: `${mood.away * 100}%`, background: getTeamColors(game.away_team).primary }} />
          <i style={{ width: `${(1 - mood.away) * 100}%`, background: getTeamColors(game.home_team).primary }} />
        </div>
      )}
      <div className="ch-list" ref={listRef} onScroll={onScroll} aria-live="polite" aria-busy={load === 'loading'}>
        {load === 'loading' && <p className="gr-muted ch-empty">Loading chat…</p>}
        {load === 'error' && (
          <div className="ch-empty">
            <p className="gr-muted">Couldn't load the chat.</p>
            <button type="button" className="pill pill-line" onClick={() => { setLoad('loading'); reload().catch(() => setLoad('error')); }}>Try again</button>
          </div>
        )}
        {load === 'ready' && items.length === 0 && held === 0 && <p className="gr-muted ch-empty">{empty}</p>}
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
              pick={picks[it.msg.userId]} mine={myId === it.msg.userId} reported={reported.has(it.msg.id)}
              onReport={() => report(it.msg.id)} onDelete={() => remove(it.msg)} />))}
      </div>
      {unseen > 0 && (
        <button type="button" className="ch-jump" onClick={jumpToNewest}>↓ {unseen} new {unseen === 1 ? 'message' : 'messages'}</button>
      )}
      {held > 0 && (
        <div className="ch-held"><span aria-hidden="true">🛡️</span> <b>{held} held back</b> to match your delay · <button type="button" onClick={() => changeShield(0)}>Show anyway</button></div>
      )}
      {error && <div className="ch-note" role="alert">{error}</div>}
      {status === 'open' ? (
        <form className="ch-form" onSubmit={send}>
          <input ref={inputRef} value={draft} maxLength={MAX_LEN}
            onChange={(e) => { setDraft(e.target.value); if (error) setError(''); }}
            placeholder={user ? 'Say something…' : 'Sign in to chat'} aria-label="Chat message"
            onFocus={() => { if (!user) openAuthDialog('signup'); }} />
          {draft.length >= COUNT_FROM && <span className={`ch-count${draft.length >= MAX_LEN ? ' max' : ''}`}>{MAX_LEN - draft.length}</span>}
          <button className="ch-send" type="submit" disabled={sending || (!!user && !draft.trim())}>{sending ? 'Sending…' : 'Send'}</button>
        </form>
      ) : (
        <div className="ch-form gr-muted">{status === 'before' ? 'Chat opens 1 hour before kickoff.' : 'This chat is closed and saved.'}</div>
      )}
    </section>
  );
}
