import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Compass } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

/**
 * A dead end should still feel like the site — header, footer, and real ways
 * out. Previously this rendered bare with an <a href> that triggered a full
 * page reload, throwing away the loaded app and the user's session state.
 */
const NotFound: React.FC = () => {
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)', color: 'var(--text-primary)' }}>
      <Header />

      <main className="flex-1 flex items-center justify-center px-4 py-20">
        <div className="max-w-md w-full text-center flex flex-col items-center gap-4">
          <span
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ background: 'var(--accent-gold-dim)', color: 'var(--accent-gold)' }}
          >
            <Compass className="w-6 h-6" aria-hidden="true" />
          </span>

          <h1
            className="font-bold leading-none"
            style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(3rem, 10vw, 5rem)', color: 'var(--text-primary)' }}
          >
            404
          </h1>

          <p className="text-lg" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-secondary)' }}>
            That play isn't in the book.
          </p>
          <p className="text-sm break-all" style={{ color: 'var(--text-muted)' }}>
            Nothing lives at <span style={{ fontFamily: 'var(--font-mono)' }}>{pathname}</span>.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
            <Link
              to="/"
              className="px-5 py-2.5 rounded-lg text-sm font-semibold uppercase tracking-wide no-underline"
              style={{ background: 'var(--accent-gold)', color: '#111' }}
            >
              Back home
            </Link>
            <Link
              to="/games"
              className="px-5 py-2.5 rounded-lg text-sm font-semibold uppercase tracking-wide no-underline"
              style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}
            >
              This week's games
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default NotFound;
