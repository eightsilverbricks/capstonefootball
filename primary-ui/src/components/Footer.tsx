import React from 'react';
import { Link } from 'react-router-dom';
import ClarkLogo from './brand/ClarkLogo';

const FOOTER_LINKS = [
  { label: 'Games', to: '/games' },
  { label: 'My Season', to: '/my-season' },
  { label: 'About us', to: '/about' },
  { label: 'What this is', to: '/welcome' },
];

const Footer: React.FC = () => (
  <footer style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--bg)' }}>
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
        <div>
          <Link to="/" className="inline-block no-underline mb-3" aria-label="The Clark Index — home">
            <ClarkLogo size={28} />
          </Link>
          <p className="text-sm max-w-sm" style={{ color: 'var(--text-muted)' }}>
            Evidence-based NFL football intelligence. Built to explain the game, not predict it blindly.
          </p>

          <nav className="flex flex-wrap gap-x-5 gap-y-2 mt-4" aria-label="Footer navigation">
            {FOOTER_LINKS.map(({ label, to }) => (
              <Link
                key={to}
                to={to}
                className="text-xs no-underline transition-colors hover:text-[var(--text-primary)]"
                style={{ color: 'var(--text-tertiary)' }}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="text-xs md:text-right space-y-1" style={{ color: 'var(--text-muted)' }}>
          <p>Statistical model trained on 2018–2023 seasons · evaluated on 2024 season (285 games)</p>
          <p>Data sourced from nflfastR / nflverse · Not affiliated with the NFL</p>
          <p>For analysis and education only · Not gambling advice</p>
        </div>
      </div>
    </div>
  </footer>
);

export default Footer;
