import { describe, expect, it } from 'vitest';
import { isNavActive } from './nav';

describe('isNavActive', () => {
  it('matches home exactly', () => {
    expect(isNavActive('/', '/')).toBe(true);
    expect(isNavActive('/games', '/')).toBe(false);
  });

  it('treats a game page as part of Games', () => {
    expect(isNavActive('/game/2026/5/SEA/ARI', '/games')).toBe(true);
  });

  it('treats team and player pages as part of Teams', () => {
    expect(isNavActive('/team/BUF', '/teams')).toBe(true);
    expect(isNavActive('/player/00-123', '/teams')).toBe(true);
  });

  it('does not match a prefix of another word', () => {
    expect(isNavActive('/leaderboards-old', '/leaderboard')).toBe(false);
    expect(isNavActive('/leaderboard', '/leaderboard')).toBe(true);
  });
});
