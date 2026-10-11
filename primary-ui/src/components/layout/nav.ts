/** Primary destinations — desktop header (CLARK_OVERHAUL_PLAN.md §7, Navigation). */
export interface NavItem {
  label: string;
  to: string;
}

export const PRIMARY_NAV: readonly NavItem[] = [
  { label: 'Home', to: '/' },
  { label: 'Games', to: '/games' },
  { label: 'Teams', to: '/teams' },
  { label: 'Leaderboard', to: '/leaderboard' },
];

/** Phone bottom tab bar. */
export const MOBILE_TABS: readonly NavItem[] = [
  { label: 'Home', to: '/' },
  { label: 'Games', to: '/games' },
  { label: 'Live', to: '/live' },
  { label: 'Teams', to: '/teams' },
  { label: 'Me', to: '/my-season' },
];

/** Section matching: /games is active on /game/…, /teams on /team/…. */
export function isNavActive(pathname: string, to: string): boolean {
  if (to === '/') return pathname === '/';
  if (to === '/games') return pathname === '/games' || pathname.startsWith('/game/');
  if (to === '/teams') return pathname === '/teams' || pathname.startsWith('/team/') || pathname.startsWith('/player/');
  if (to === '/my-season') return pathname === '/my-season' || pathname === '/settings';
  return pathname === to || pathname.startsWith(`${to}/`);
}
