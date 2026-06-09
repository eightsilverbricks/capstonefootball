import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

const NAV_LINKS = [
  { label: 'Games', to: '/' },
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

          {/* Wordmark — solid token color, no gradient */}
          <Link to="/" className="flex items-center gap-2.5 no-underline">
            <div
              className="w-7 h-7 rounded flex items-center justify-center text-[11px] font-bold"
              style={{ background: 'var(--accent-gold)', color: '#090909' }}
            >
              CI
            </div>
            <span className="font-semibold tracking-tight text-base" style={{ color: 'var(--text-primary)' }}>
              The Clark Index
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

          {/* Right: badge + mobile toggle */}
          <div className="flex items-center gap-3">
            <span
              className="hidden sm:inline text-xs font-medium px-2.5 py-1 rounded"
              style={{
                color: 'var(--accent-gold)',
                background: 'rgba(200,169,110,0.08)',
                border: '1px solid rgba(200,169,110,0.2)',
              }}
            >
              2024
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
