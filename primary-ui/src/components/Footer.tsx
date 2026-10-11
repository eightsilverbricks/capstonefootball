import React from 'react';
import { Link } from 'react-router-dom';
import ClarkLogo from './brand/ClarkLogo';

const FOOTER_LINKS = [
  { label: 'Games', to: '/games' },
  { label: 'Teams', to: '/teams' },
  { label: 'Leaderboard', to: '/leaderboard' },
  { label: 'My season', to: '/my-season' },
  { label: 'About', to: '/about' },
  { label: 'Settings', to: '/settings' },
];

const Footer: React.FC = () => (
  <footer style={{ borderTop: '1px solid var(--divider)', background: 'var(--surface)' }}>
    <div className="mx-auto px-4 py-8 flex flex-col md:flex-row md:items-center justify-between gap-5" style={{ maxWidth: 'var(--content-max)' }}>
      <div className="flex flex-col gap-3">
        <Link to="/" className="no-underline" aria-label="The Clark Index home">
          <ClarkLogo size={24} />
        </Link>
        <nav className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Footer navigation">
          {FOOTER_LINKS.map(({ label, to }) => (
            <Link
              key={to}
              to={to}
              className="text-[13px] no-underline transition-colors hover:text-[var(--text-primary)]"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="text-[13px] md:text-right space-y-1" style={{ color: 'var(--text-tertiary)' }}>
        <p>Data from nflverse and ESPN. Not affiliated with the NFL.</p>
        <p>For entertainment only. No betting.</p>
      </div>
    </div>
  </footer>
);

export default Footer;
