// ─── useGamePick — one game's pick interaction, in one place ──────────────────
// The conviction drag, the auth gate, and the stake maths are identical
// wherever a game can be picked (the slate grid, the week's lead card, the
// game page). Keeping them here means those surfaces can look completely
// different without the *behaviour* ever diverging — a bug fixed in the pick
// flow is fixed everywhere at once.

import { useCallback, useMemo, useState } from 'react';
import { ApiPrediction } from '@/types/prediction';
import { gameKey } from '@/lib/threeWaySignal';
import { useUserPicks, UserPick, stashPendingPick } from '@/hooks/useUserPicks';
import { useFanIdentity } from '@/hooks/useFanIdentity';
import { useAuth } from '@/hooks/useAuth';
import { openAuthDialog } from '@/hooks/useAuthDialog';
import { Pick } from '@/competition/types';
import { stakeFromConfidence } from '@/competition/scoring';

/** 0.5 is the slider's centre — a drafted pick with no side chosen yet. */
const NO_POSITION = 0.5;

export interface GamePickState {
  /** Stable identity for this game, shared with the picks store. */
  key: string;
  /** The locked-in pick, when there is one. */
  userPick: UserPick | undefined;
  hasPicked: boolean;
  /** Slider position before locking. */
  draft: Pick;
  setDraft: (pick: Pick) => void;
  /** True once the slider has moved off centre. */
  hasPosition: boolean;
  /** Locks the draft, routing through sign-up first when signed out. */
  lock: () => void;
  /** Releases a locked pick back into the slider, pre-seeded with its value. */
  changePick: () => void;
  /** Points riding on the locked pick, rounded for display. */
  stake: number;
}

export function useGamePick(game: ApiPrediction): GamePickState {
  const { picks, setPick, clearPick } = useUserPicks();
  const { team: fanTeam } = useFanIdentity();
  const { isSignedIn } = useAuth();

  const key = gameKey(game);
  const userPick = picks[key];

  const [draft, setDraft] = useState<Pick>(() => ({ team: game.home_team, confidence: NO_POSITION }));

  // If this component instance is ever handed a different game (a reused row
  // in a re-sorted list), the half-dragged slider from the previous game must
  // not carry over. Adjusting state during render is React's documented
  // alternative to a reset effect, and avoids rendering one stale frame.
  const [renderedKey, setRenderedKey] = useState(key);
  if (renderedKey !== key) {
    setRenderedKey(key);
    setDraft({ team: game.home_team, confidence: NO_POSITION });
  }

  const hasPosition = draft.confidence > NO_POSITION;

  const lock = useCallback(() => {
    if (draft.confidence <= NO_POSITION) return;
    const pick: UserPick = { team: draft.team, confidence: draft.confidence, fanTeam };

    // Picking is the moment the account actually matters — the gate lives here
    // rather than upfront on the slider. The pick is stashed and replayed once
    // the account exists, so nothing the user did is thrown away.
    if (!isSignedIn) {
      stashPendingPick(key, pick);
      openAuthDialog('signup');
      return;
    }
    setPick(key, pick);
  }, [draft, fanTeam, isSignedIn, key, setPick]);

  const changePick = useCallback(() => {
    if (userPick) setDraft({ team: userPick.team, confidence: userPick.confidence });
    clearPick(key);
  }, [clearPick, key, userPick]);

  const stake = useMemo(
    () => (userPick ? Math.round(stakeFromConfidence(userPick.confidence)) : 0),
    [userPick],
  );

  return {
    key,
    userPick,
    hasPicked: Boolean(userPick),
    draft,
    setDraft,
    hasPosition,
    lock,
    changePick,
    stake,
  };
}
