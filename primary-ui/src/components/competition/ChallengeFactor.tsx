import React, { useState } from 'react';
import { useCompetitionData } from '@/hooks/useCompetitionData';
import { ChevronDown, ChevronUp, ArrowBigUp, Trophy } from 'lucide-react';

interface ChallengeFactorProps {
  gameId: string;
  factorName: string;
}

/**
 * Community "Challenge a Factor" thread attached to a single factor card.
 * Lists mock challenges sorted by upvotes with a Top Challenge badge, an upvote
 * button, and a submission box. All ephemeral/local state for this pass.
 */
const ChallengeFactor: React.FC<ChallengeFactorProps> = ({ gameId, factorName }) => {
  const { challengesFor, addChallenge, upvoteChallenge } = useCompetitionData();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');

  const items = challengesFor(gameId, factorName);

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    addChallenge(gameId, factorName, text);
    setDraft('');
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
                onClick={() => upvoteChallenge(c.id)}
                className="flex flex-col items-center shrink-0 rounded px-1.5 py-0.5 transition-colors"
                style={{ background: 'var(--surface)', border: '1px solid var(--border-subtle)' }}
                aria-label={`Upvote challenge by ${c.submitter}`}
              >
                <ArrowBigUp className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} />
                <span className="text-[10px] tabular-nums" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>
                  {c.upvotes}
                </span>
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span aria-hidden="true" className="text-xs">{c.avatar}</span>
                  <span className="text-[11px] font-semibold" style={{ color: 'var(--text-secondary)' }}>{c.submitter}</span>
                  {c.isTopChallenge && (
                    <span className="inline-flex items-center gap-1 text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded"
                      style={{ color: 'var(--accent-gold)', background: 'var(--accent-gold-dim)' }}>
                      <Trophy className="w-2.5 h-2.5" /> Top
                    </span>
                  )}
                </div>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>{c.text}</p>
              </div>
            </div>
          ))}

          {items.length === 0 && (
            <p className="text-xs pt-2" style={{ color: 'var(--text-muted)' }}>
              No challenges yet. Make the first case against this factor.
            </p>
          )}

          {/* Submission */}
          <div className="mt-2 flex flex-col gap-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={240}
              rows={2}
              placeholder="Push back on this factor with evidence…"
              className="w-full rounded-md px-3 py-2 text-xs outline-none resize-none"
              style={{ background: 'var(--surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
            />
            <button
              onClick={submit}
              disabled={!draft.trim()}
              className="self-end px-3 py-1.5 rounded-md text-[11px] font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: 'var(--accent-gold)', color: '#1a1408' }}
            >
              Post challenge
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default ChallengeFactor;
