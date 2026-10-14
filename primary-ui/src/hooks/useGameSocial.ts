import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchPolls, fetchReactions, setReaction, subscribeGameSocial, vote,
  type Counts, type Emoji, type PollChoice,
} from '@/data/socialRepository';
import { useAuth } from '@/hooks/useAuth';
import { openAuthDialog } from '@/hooks/useAuthDialog';

const REFRESH_DEBOUNCE_MS = 400;

/** Big-play reactions and 4th-down poll votes for one game, live. */
export function useGameSocial(gameKey: string) {
  const { user } = useAuth();
  const uid = user?.id ?? null;
  const [reactions, setReactions] = useState<{ counts: Counts<Emoji>; mine: Record<string, Emoji> }>({ counts: {}, mine: {} });
  const [polls, setPolls] = useState<{ counts: Counts<PollChoice>; mine: Record<string, PollChoice> }>({ counts: {}, mine: {} });
  const timer = useRef<number>();

  const refresh = useCallback(() => {
    fetchReactions(gameKey, uid).then(setReactions).catch(() => {});
    fetchPolls(gameKey, uid).then(setPolls).catch(() => {});
  }, [gameKey, uid]);

  useEffect(() => {
    refresh();
    const unsubscribe = subscribeGameSocial(gameKey, () => {
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(refresh, REFRESH_DEBOUNCE_MS);
    });
    return () => { unsubscribe(); window.clearTimeout(timer.current); };
  }, [gameKey, refresh]);

  const react = useCallback(async (playId: string, emoji: Emoji) => {
    if (!uid) { openAuthDialog('signup'); return; }
    const next = reactions.mine[playId] === emoji ? null : emoji;
    setReactions((r) => {
      const mine = Object.fromEntries(Object.entries(r.mine).filter(([k]) => k !== playId));
      return { ...r, mine: next ? { ...mine, [playId]: next } : mine };
    });
    await setReaction(gameKey, playId, uid, next);
    refresh();
  }, [uid, gameKey, reactions.mine, refresh]);

  const castVote = useCallback(async (pollKey: string, choice: PollChoice) => {
    if (!uid) { openAuthDialog('signup'); return; }
    if (polls.mine[pollKey]) return;
    setPolls((p) => ({ ...p, mine: { ...p.mine, [pollKey]: choice } }));
    await vote(gameKey, pollKey, uid, choice);
    refresh();
  }, [uid, gameKey, polls.mine, refresh]);

  return { reactions, polls, react, castVote };
}
