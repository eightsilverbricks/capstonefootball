import { Link, useLocation } from 'react-router-dom';
import AccountMenu from './auth/AccountMenu';
import MobileTabBar from './layout/MobileTabBar';
import ScoreRail from './shell/ScoreRail';
import CommunityBar from './shell/CommunityBar';
import { useAuth } from '@/hooks/useAuth';
import { openAuthDialog } from '@/hooks/useAuthDialog';
import { usePredictions } from '@/hooks/usePredictions';
import { useUserPicks } from '@/hooks/useUserPicks';
import { useTheme } from '@/hooks/useTheme';
import { computeSeasonSummary } from '@/lib/seasonSummary';
import { isNavActive, PRIMARY_NAV } from './layout/nav';

const TODAY = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

function ThemeButton() {
  const { preference, setTheme } = useTheme();
  const isDark = preference === 'dark'
    || (preference === 'system' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  return (
    <button
      type="button"
      className="icon-btn"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? '☀️' : '🌙'}
    </button>
  );
}

function RecordStat() {
  const { predictions } = usePredictions();
  const { picks } = useUserPicks();
  const summary = computeSeasonSummary(picks, predictions);
  if (summary.resolvedCount === 0) return null;
  return (
    <Link to="/my-season" className="mast-stat">
      Record <b className="tabular-nums">{summary.wins}–{summary.losses}</b>
    </Link>
  );
}

/**
 * Site header: the Rail (this week's scores), the community bar, the masthead
 * (date · logo · account) and the section nav. Phones get the bottom tab bar.
 */
export default function Header() {
  const { pathname } = useLocation();
  const { isSignedIn } = useAuth();

  return (
    <>
      <ScoreRail />
      <CommunityBar />
      <header className="masthead">
        <div className="mast-top">
          <span className="mast-date">{TODAY.format(new Date())}</span>
          <Link to="/" className="wordmark" aria-label="Clark Index home">
            <img src="/brand/clark-logo.jpg" alt="" width={42} height={42} />
            <span>CLARK <b>INDEX</b></span>
          </Link>
          <div className="mast-right">
            <ThemeButton />
            {isSignedIn ? (
              <>
                <RecordStat />
                <AccountMenu />
              </>
            ) : (
              <>
                <button type="button" className="pill pill-line hidden sm:inline-flex" onClick={() => openAuthDialog('signin')}>
                  Sign in
                </button>
                <button type="button" className="pill pill-red" onClick={() => openAuthDialog('signup')}>
                  Create account
                </button>
              </>
            )}
          </div>
        </div>
        <nav className="secnav" aria-label="Main navigation">
          {PRIMARY_NAV.map(({ label, to }) => (
            <Link key={to} to={to} aria-current={isNavActive(pathname, to) ? 'page' : undefined}>
              {label}
            </Link>
          ))}
        </nav>
      </header>
      <MobileTabBar />
    </>
  );
}
