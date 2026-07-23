import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import FanIdentityPicker from './FanIdentityPicker';
import SeasonSummary from './SeasonSummary';

const NAV_LINKS = [
  { label: 'Home', to: '/' },
  { label: 'Games', to: '/games' },
  { label: 'My Season', to: '/my-season' },
  { label: 'About', to: '/about' },
];

const Header: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();

  return (
    <header
      className="sticky top-0 z-40 backdrop-blur-sm"
      style={{ background: 'rgba(9,9,9,0.92)', borderBottom: '1px solid var(--border-subtle)' }}
    >
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">

          {/* Wordmark — editorial, no decorative tile */}
          <Link to="/" className="flex items-baseline gap-2 no-underline">
            <span
              className="font-bold tracking-tight text-lg leading-none"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
            >
              Clark
            </span>
            <span
              className="text-lg leading-none italic"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--text-tertiary)' }}
            >
              Index
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
            {NAV_LINKS.map(({ label, to }) => {
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
                >
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* Right: season standing + fan identity + mobile toggle */}
          <div className="flex items-center gap-3">
            <SeasonSummary />
            <FanIdentityPicker />
            <span
              className="hidden sm:inline text-xs uppercase tracking-widest"
              style={{ color: 'var(--text-muted)' }}
            >
              Season 2024
            </span>
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
            {NAV_LINKS.map(({ label, to }) => {
              const active = pathname === to;
              return (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setMenuOpen(false)}
                  className="block px-3 py-2 text-sm rounded-md"
                  style={{ color: active ? 'var(--text-primary)' : 'var(--text-secondary)' }}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        )}
      </div>
    </header>
  );
};

export default Header;
