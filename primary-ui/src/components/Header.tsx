import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import ClarkLogo from './brand/ClarkLogo';
import FanIdentityPicker from './FanIdentityPicker';
import SeasonSummary from './SeasonSummary';
import AccountMenu from './auth/AccountMenu';
import { useAuth } from '@/hooks/useAuth';
import { openAuthDialog } from '@/hooks/useAuthDialog';

interface NavLink {
  label: string;
  to: string;
  /** Hidden until there's an account to hang a season off of. */
  requiresAccount?: boolean;
}

const NAV_LINKS: NavLink[] = [
  { label: 'Home', to: '/' },
  { label: 'Games', to: '/games' },
  { label: 'My Season', to: '/my-season', requiresAccount: true },
  { label: 'About', to: '/about' },
];

const Header: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();
  const { isSignedIn } = useAuth();

  const links = NAV_LINKS.filter((link) => isSignedIn || !link.requiresAccount);

  return (
    <header
      className="sticky top-0 z-40 backdrop-blur-sm"
      style={{ background: 'rgba(9,9,9,0.92)', borderBottom: '1px solid var(--border-subtle)' }}
    >
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-14 gap-3">
          <Link to="/" className="no-underline shrink-0" aria-label="The Clark Index — home">
            <ClarkLogo size={26} />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
            {links.map(({ label, to }) => {
              const active = pathname === to;
              return (
                <Link
                  key={to}
                  to={to}
                  className="px-3 py-1.5 text-sm rounded-md transition-colors"
                  style={{
                    color: active ? 'var(--text-primary)' : 'var(--text-tertiary)',
                    background: active ? 'var(--surface-raised)' : 'transparent',
                  }}
                  aria-current={active ? 'page' : undefined}
                >
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* Right rail — swaps entirely on auth state */}
          <div className="flex items-center gap-2 sm:gap-3">
            {isSignedIn ? (
              <>
                <SeasonSummary />
                <AccountMenu />
              </>
            ) : (
              <>
                <FanIdentityPicker />
                <button
                  type="button"
                  onClick={() => openAuthDialog('signin')}
                  className="hidden sm:inline text-sm px-2 py-1.5 rounded-md transition-colors hover:text-[var(--text-primary)]"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  onClick={() => openAuthDialog('signup')}
                  className="text-xs font-semibold uppercase tracking-wide px-3 py-2 rounded-md transition-opacity hover:opacity-90 whitespace-nowrap"
                  style={{ background: 'var(--accent-gold)', color: '#111' }}
                >
                  Get started
                </button>
              </>
            )}

            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-1.5 rounded-md"
              style={{ color: 'var(--text-tertiary)' }}
              aria-label="Toggle navigation"
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        {menuOpen && (
          <nav
            className="md:hidden py-3 space-y-1"
            style={{ borderTop: '1px solid var(--border-subtle)' }}
            aria-label="Mobile navigation"
          >
            {links.map(({ label, to }) => {
              const active = pathname === to;
              return (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setMenuOpen(false)}
                  className="block px-3 py-2 text-sm rounded-md"
                  style={{ color: active ? 'var(--text-primary)' : 'var(--text-secondary)' }}
                  aria-current={active ? 'page' : undefined}
                >
                  {label}
                </Link>
              );
            })}
            {!isSignedIn && (
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  openAuthDialog('signin');
                }}
                className="block w-full text-left px-3 py-2 text-sm rounded-md"
                style={{ color: 'var(--text-secondary)' }}
              >
                Sign in
              </button>
            )}
          </nav>
        )}
      </div>
    </header>
  );
};

export default Header;
