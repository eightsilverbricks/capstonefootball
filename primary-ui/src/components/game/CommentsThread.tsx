import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  POST_ERRORS, fetchComments, postComment, reportComment, setUpvote, type Comment,
} from '@/data/socialRepository';
import { getEspnLogoUrl } from '@/data/nflData';
import { useAuth } from '@/hooks/useAuth';
import { openAuthDialog } from '@/hooks/useAuthDialog';

const MAX_LEN = 1000;
const pct = (p: number) => Math.round(p * 100);

function ago(iso: string): string {
  const mins = Math.max(1, Math.round((Date.now() - Date.parse(iso)) / 60000));
  if (mins < 60) return `${mins}m`;
  const hrs = Math.round(mins / 60);
  return hrs < 24 ? `${hrs}h` : `${Math.round(hrs / 24)}d`;
}

/** One thread per game under the Clark Report, sorted by upvotes, picks next to names (§4 Tab 1.8). */
export default function CommentsThread({ gameKey }: { gameKey: string }) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(() => { fetchComments(gameKey).then(setComments).catch(() => {}); }, [gameKey]);
  useEffect(load, [load, user?.id]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) { openAuthDialog('signup'); return; }
    if (!draft.trim() || sending) return;
    setSending(true);
    setError('');
    const res = await postComment(gameKey, draft.trim());
    setSending(false);
    if (res.ok) { setDraft(''); load(); } else setError(POST_ERRORS[res.error ?? 'offline'] ?? POST_ERRORS.offline);
  };

  const toggleVote = async (c: Comment) => {
    if (!user) { openAuthDialog('signup'); return; }
    setComments((list) => list.map((x) => (x.id === c.id ? { ...x, voted: !c.voted, upvotes: x.upvotes + (c.voted ? -1 : 1) } : x)));
    await setUpvote(c.id, user.id, !c.voted);
  };

  return (
    <section className="gv-panel" aria-labelledby="cm-h">
      <div className="gv-ph"><h2 id="cm-h">Comments</h2><span className="gr-muted">{comments.length}</span></div>
      <div className="gv-pb">
        <form className="cm-form" onSubmit={submit}>
          <textarea value={draft} maxLength={MAX_LEN} onChange={(e) => setDraft(e.target.value)}
            placeholder={user ? 'What do you think Clark got right or wrong?' : 'Sign in to comment'}
            aria-label="Write a comment" onFocus={() => { if (!user) openAuthDialog('signup'); }} />
          <div className="row">
            <span>{error ? <span role="alert" style={{ color: 'var(--loss)' }}>{error}</span> : `${draft.length}/${MAX_LEN}`}</span>
            <button className="cm-send" type="submit" disabled={sending || (!!user && !draft.trim())}>Post</button>
          </div>
        </form>
        {comments.length === 0
          ? <p className="gr-muted" style={{ marginTop: 14 }}>No comments yet. Be the first.</p>
          : (
            <ul className="cm-list">
              {comments.map((c) => (
                <li className="cm-item" key={c.id}>
                  <div className="cm-vote">
                    <button type="button" aria-pressed={c.voted} aria-label="Upvote" onClick={() => toggleVote(c)}>▲</button>
                    <span>{c.upvotes}</span>
                  </div>
                  <div>
                    <div className="ch-who">
                      {c.author.favoriteTeam && <img src={getEspnLogoUrl(c.author.favoriteTeam)} alt="" width={16} height={16} loading="lazy" />}
                      <b>{c.author.displayName}</b>
                      {c.pick && <span className="ch-pick">{c.pick.team} · {pct(c.pick.confidence)}%</span>}
                      <span className="gr-muted">{ago(c.createdAt)}</span>
                      {user && user.id !== c.userId && (
                        <button type="button" className="ch-x" style={{ opacity: 1 }} onClick={() => { reportComment(c.id); setComments((l) => l.filter((x) => x.id !== c.id)); }}>Report</button>
                      )}
                    </div>
                    <p className="cm-body">{c.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
      </div>
    </section>
  );
}
