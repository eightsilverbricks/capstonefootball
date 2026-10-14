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

  const items = useMemo<Item[]>(() => [
    ...messages.map((msg) => ({ kind: 'msg' as const, at: msg.createdAt, msg })),
    ...plays.filter((p) => p.is_big).map((play) => ({ kind: 'play' as const, at: play.created_at, play })),
  ].sort((a, b) => a.at.localeCompare(b.at)), [messages, plays]);

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
      <div className="ch-list" ref={listRef} aria-live="polite">
        {items.length === 0 && <p className="gr-muted">No messages yet. {status === 'before' ? 'Chat opens 1 hour before kickoff.' : 'Say something!'}</p>}
        {items.map((it) => (it.kind === 'play'
          ? <BigPlayCard key={`p${it.play.play_id}`} play={it.play} social={social} />
          : <Message key={it.msg.id} msg={it.msg} author={authors[it.msg.userId] ?? it.msg.author}
              pick={picks[it.msg.userId]} mine={user?.id === it.msg.userId}
              onReport={() => { reportChat(it.msg.id); }} onDelete={() => { deleteChat(it.msg.id); setMessages((p) => p.filter((m) => m.id !== it.msg.id)); }} />))}
      </div>
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
