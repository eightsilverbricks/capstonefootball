// ─── useChallenges — real community pushback on a game's factors ─────────────
// One load per Clark Report, shared by every factor card on the page: the RPC
// returns the whole game's thread, and each card filters to its own factor.
//
// Posting and voting write straight to Supabase and then re-read, rather than
// patching a local copy. Vote counts are derived from rows (see schema.sql), so
// re-reading is the only way to show a number that is actually true.

import { useCallback, useEffect, useState } from 'react';
import {
  Challenge,
  loadChallenges,
  postChallenge,
  toggleChallengeVote,
} from '@/data/challengesRepository';

export interface ChallengesData {
  /** Challenges against one factor, most-upvoted first. */
  forFactor: (factorName: string) => Challenge[];
  /** True for the highest-voted challenge within its own factor thread. */
  isTopChallenge: (challenge: Challenge) => boolean;
  post: (factorName: string, body: string) => Promise<string | null>;
  toggleVote: (challenge: Challenge) => Promise<string | null>;
  isLoading: boolean;
}

function byVotesThenAge(a: Challenge, b: Challenge): number {
  return b.votes - a.votes || a.createdAt.localeCompare(b.createdAt);
}

export function useChallenges(gameKey: string, userId: string | null): ChallengesData {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    const next = await loadChallenges(gameKey);
    setChallenges(next);
    setIsLoading(false);
  }, [gameKey]);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    void loadChallenges(gameKey).then((next) => {
      if (!active) return;
      setChallenges(next);
      setIsLoading(false);
    });
    return () => {
      active = false;
    };
  }, [gameKey]);

  const forFactor = useCallback(
    (factorName: string) =>
      challenges.filter((c) => c.factorName === factorName).sort(byVotesThenAge),
    [challenges],
  );

  const isTopChallenge = useCallback(
    (challenge: Challenge) => {
      const thread = challenges.filter((c) => c.factorName === challenge.factorName);
      if (thread.length < 2) return false; // "top of one" is not a distinction
      const top = [...thread].sort(byVotesThenAge)[0];
      return top.id === challenge.id && top.votes > 0;
    },
    [challenges],
  );

  const post = useCallback(
    async (factorName: string, body: string) => {
      if (!userId) return 'Sign in to challenge a factor.';
      const error = await postChallenge(userId, gameKey, factorName, body);
      if (!error) await refresh();
      return error;
    },
    [gameKey, userId, refresh],
  );

  const toggleVote = useCallback(
    async (challenge: Challenge) => {
      if (!userId) return 'Sign in to vote.';
      const error = await toggleChallengeVote(userId, challenge.id, challenge.viewerVoted);
      if (!error) await refresh();
      return error;
    },
    [userId, refresh],
  );

  return { forFactor, isTopChallenge, post, toggleVote, isLoading };
}
