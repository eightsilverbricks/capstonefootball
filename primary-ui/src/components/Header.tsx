import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import ClarkLogo from './brand/ClarkLogo';
import AccountMenu from './auth/AccountMenu';
import MobileTabBar from './layout/MobileTabBar';
import { useAuth } from '@/hooks/useAuth';
import { openAuthDialog } from '@/hooks/useAuthDialog';
import { usePredictions } from '@/hooks/usePredictions';
import { useUserPicks } from '@/hooks/useUserPicks';
import { computeSeasonSummary } from '@/lib/seasonSummary';
import { isNavActive, PRIMARY_NAV } from './layout/nav';

/** "Record 11–5" chip for signed-in users with at least one graded pick. */
const RecordChip: React.FC = () => {
  const { predictions } = usePredictions();
  const { picks } = useUserPicks();
  const summary = computeSeasonSummary(picks, predictions);
  if (summary.resolvedCount === 0) return null;

  return (
    <Link
      to="/my-season"
      className="hidden md:inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-[13px] no-underline transition-colors hover:bg-[var(--surface-hover)]"
      style={{ color: 'var(--text-tertiary)' }}
    >
      Record
      <span className="font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>
        {summary.wins}–{summary.losses}
      </span>
    </Link>
  );
};

/**
 * Site header: logo, the four primary destinations, and the account controls.
 * On phones the destinations move to the bottom tab bar (rendered here so
 * every page that renders <Header /> gets it).
 */
const Header: React.FC = () => {
  const { pathname } = useLocation();
  const { isSignedIn } = useAuth();

  return (
    <>
      <header
        className="sticky top-0 z-40"
        style={{ background: 'var(--surface)', borderBottom: '1px solid var(--divider)' }}
      >
        <div className="mx-auto flex items-center gap-6 px-4" style={{ maxWidth: 'var(--content-max)', height: 'var(--header-h)' }}>
          <Link to="/" className="no-underline shrink-0" aria-label="The Clark Index home">
            <ClarkLogo size={28} />
          </Link>

          <nav className="hidden md:flex items-stretch self-stretch gap-1" aria-label="Main navigation">
            {PRIMARY_NAV.map(({ label, to }) => {
              const active = isNavActive(pathname, to);
              return (
                <Link
                  key={to}
                  to={to}
                  className="relative flex items-center px-3 text-[15px] font-medium no-underline transition-colors hover:text-[var(--text-primary)]"
                  style={{ color: active ? 'var(--text-primary)' : 'var(--text-tertiary)' }}
                  aria-current={active ? 'page' : undefined}
                >
                  {label}
                  {active && (
                    <span
                      className="absolute left-3 right-3 bottom-0 h-[3px] rounded-t"
                      style={{ background: 'var(--brand)' }}
                      aria-hidden="true"
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            {isSignedIn ? (
              <>
                <RecordChip />
                <AccountMenu />
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => openAuthDialog('signin')}
                  className="h-9 px-2 sm:px-3 rounded-md text-sm font-medium whitespace-nowrap transition-colors hover:bg-[var(--surface-hover)]"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  onClick={() => openAuthDialog('signup')}
                  className="h-9 px-3.5 rounded-md text-sm font-semibold whitespace-nowrap transition-colors hover:bg-[var(--brand-hover)]"
                  style={{ background: 'var(--brand)', color: 'var(--brand-contrast)' }}
                >
                  Create account
                </button>
              </>
            )}
          </div>
        </div>
      </header>
      <MobileTabBar />
    </>
  );
};

export default Header;
