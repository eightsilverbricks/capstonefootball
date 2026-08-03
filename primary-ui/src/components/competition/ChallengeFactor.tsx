import React, { useState } from 'react';
import { ChallengesData } from '@/hooks/useChallenges';
import { MAX_CHALLENGE_LENGTH } from '@/data/challengesRepository';
import { useAuth } from '@/hooks/useAuth';
import { openAuthDialog } from '@/hooks/useAuthDialog';
import { ChevronDown, ChevronUp, ArrowBigUp, Trophy } from 'lucide-react';

interface ChallengeFactorProps {
  /** Loaded once per report by FactorList and shared across every factor row. */
  challenges: ChallengesData;
  factorName: string;
}

/**
 * Community "Challenge a Factor" thread attached to a single factor card.
 * Every challenge is a real post by a real account — the name shown is the
 * author's profile display name, resolved server-side, and each account's
 * upvote is a row so it can only ever count once.
 */
const ChallengeFactor: React.FC<ChallengeFactorProps> = ({ challenges, factorName }) => {
  const { isSignedIn } = useAuth();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const items = challenges.forFactor(factorName);

  const submit = async () => {
    if (!isSignedIn) {
      openAuthDialog('signup');
      return;
    }
    setBusy(true);
    const failure = await challenges.post(factorName, draft);
    setBusy(false);
    setError(failure);
    if (!failure) setDraft('');
  };

  const vote = async (challenge: (typeof items)[number]) => {
    if (!isSignedIn) {
      openAuthDialog('signup');
      return;
    }
    setError(await challenges.toggleVote(challenge));
  };

  return (
    <>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-center gap-1.5 py-2 text-[11px] transition-colors"
        style={{ borderTop: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}
        aria-expanded={open}
      >
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        Challenge this factor
        {items.length > 0 && (
          <span className="tabular-nums" style={{ color: 'var(--text-tertiary)' }}>({items.length})</span>
        )}
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1 flex flex-col gap-2"
          style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--surface-raised)' }}>
          {items.map(c => (
            <div key={c.id} className="flex items-start gap-2.5 pt-2">
              <button
                onClick={() => void vote(c)}
                className="flex flex-col items-center shrink-0 rounded px-1.5 py-0.5 transition-colors"
                style={{
                  background: 'var(--surface)',
                  border: `1px solid ${c.viewerVoted ? 'var(--accent-gold)' : 'var(--border-subtle)'}`,
                }}
                aria-pressed={c.viewerVoted}
                aria-label={`${c.viewerVoted ? 'Remove your upvote from' : 'Upvote'} the challenge by ${c.authorName}`}
              >
                <ArrowBigUp
                  className="w-3.5 h-3.5"
                  style={{ color: c.viewerVoted ? 'var(--accent-gold)' : 'var(--text-tertiary)' }}
                />
                <span className="text-[10px] tabular-nums" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>
                  {c.votes}
                </span>
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-[11px] font-semibold" style={{ color: 'var(--text-secondary)' }}>{c.authorName}</span>
                  {challenges.isTopChallenge(c) && (
                    <span className="inline-flex items-center gap-1 text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded"
                      style={{ color: 'var(--accent-gold)', background: 'var(--accent-gold-dim)' }}>
                      <Trophy className="w-2.5 h-2.5" /> Top
                    </span>
                  )}
                </div>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>{c.body}</p>
              </div>
            </div>
          ))}

          {items.length === 0 && (
            <p className="text-xs pt-2" style={{ color: 'var(--text-muted)' }}>
              {challenges.isLoading
                ? 'Loading challenges…'
                : 'No challenges yet. Make the first case against this factor.'}
            </p>
          )}

          {/* Submission */}
          <div className="mt-2 flex flex-col gap-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={MAX_CHALLENGE_LENGTH}
              rows={2}
              placeholder="Push back on this factor with evidence…"
              className="w-full rounded-md px-3 py-2 text-xs outline-none resize-none"
              style={{ background: 'var(--surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
            />
            {error && (
              <span className="text-[11px]" style={{ color: 'var(--stake-negative)' }} role="alert">
                {error}
              </span>
            )}
            <button
              onClick={() => void submit()}
              disabled={!draft.trim() || busy}
              className="self-end px-3 py-1.5 rounded-md text-[11px] font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: 'var(--accent-gold)', color: '#1a1408' }}
            >
              {busy ? 'Posting…' : isSignedIn ? 'Post challenge' : 'Post challenge — free account'}
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default ChallengeFactor;
