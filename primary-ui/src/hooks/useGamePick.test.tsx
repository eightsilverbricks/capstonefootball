import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGamePick } from './useGamePick';
import { __resetPicksForTests } from './useUserPicks';
import { ApiPrediction } from '@/types/prediction';

function game(partial: Partial<ApiPrediction> & { game_id: string }): ApiPrediction {
  return {
    season: 2024,
    week: 1,
    week_label: 'Week 1',
    home_team: 'HOME',
    away_team: 'AWAY',
    predicted_winner: 'HOME',
    home_win_prob: 0.6,
    away_win_prob: 0.4,
    confidence_label: 'Medium',
    confidence_score: 20,
    ...partial,
  } as ApiPrediction;
}

const GAME_A = game({ game_id: 'a', home_team: 'KC', away_team: 'BUF' });
const GAME_B = game({ game_id: 'b', home_team: 'SF', away_team: 'DAL' });

describe('useGamePick', () => {
  beforeEach(() => {
    __resetPicksForTests();
  });

  it('starts centred, with no side taken', () => {
    const { result } = renderHook(() => useGamePick(GAME_A));
    expect(result.current.draft.confidence).toBe(0.5);
    expect(result.current.hasPosition).toBe(false);
    expect(result.current.hasPicked).toBe(false);
  });

  it('reports a position once the slider moves off centre', () => {
    const { result } = renderHook(() => useGamePick(GAME_A));
    act(() => result.current.setDraft({ team: 'KC', confidence: 0.8 }));
    expect(result.current.hasPosition).toBe(true);
  });

  it('refuses to lock a pick with no side taken', () => {
    const { result } = renderHook(() => useGamePick(GAME_A));
    act(() => result.current.lock());
    expect(result.current.hasPicked).toBe(false);
  });

  // The guard that matters: a component instance reused for a different game
  // (a re-sorted or re-filtered slate) must not carry the previous game's
  // half-dragged slider — and definitely not its team.
  it('resets the draft when handed a different game', () => {
    const { result, rerender } = renderHook(({ g }) => useGamePick(g), {
      initialProps: { g: GAME_A },
    });

    act(() => result.current.setDraft({ team: 'KC', confidence: 0.9 }));
    expect(result.current.draft).toEqual({ team: 'KC', confidence: 0.9 });

    rerender({ g: GAME_B });

    expect(result.current.draft).toEqual({ team: 'SF', confidence: 0.5 });
    expect(result.current.hasPosition).toBe(false);
  });

  it('keeps the draft when re-rendered with the same game', () => {
    const { result, rerender } = renderHook(({ g }) => useGamePick(g), {
      initialProps: { g: GAME_A },
    });

    act(() => result.current.setDraft({ team: 'BUF', confidence: 0.75 }));
    rerender({ g: GAME_A });

    expect(result.current.draft).toEqual({ team: 'BUF', confidence: 0.75 });
  });

  it('exposes a distinct key per game', () => {
    const { result: a } = renderHook(() => useGamePick(GAME_A));
    const { result: b } = renderHook(() => useGamePick(GAME_B));
    expect(a.current.key).not.toBe(b.current.key);
  });
});
