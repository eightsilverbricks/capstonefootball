import React, { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { usePredictions } from '@/hooks/usePredictions';
import GameView from '@/components/game/GameView';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Card from '@/components/layout/Card';
import { RefreshCw } from 'lucide-react';

const GamePage: React.FC = () => {
  const { season, week, away, home } = useParams<{
    season: string; week: string; away: string; home: string;
  }>();
  const { predictions, loading, error, reload } = usePredictions();

  const game = useMemo(() => {
    if (!predictions.length) return null;
    return predictions.find(
      g =>
        String(g.season) === season &&
        String(g.week) === week &&
        g.away_team === away &&
        g.home_team === home,
    ) ?? null;
  }, [predictions, season, week, away, home]);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)', color: 'var(--text-primary)' }}>
      <Header />

      <main className="w-full mx-auto px-4" style={{ maxWidth: 'var(--content-max)' }}>
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-4" style={{ color: 'var(--text-tertiary)' }}>
            <RefreshCw className="w-7 h-7 animate-spin" />
            <p className="text-sm">Loading game</p>
          </div>
        )}

        {!loading && error && (
          <Card>
            <div className="pt-4 text-center">
              <p className="font-semibold mb-1">Couldn't load predictions</p>
              <p className="text-sm mb-4" style={{ color: 'var(--text-tertiary)' }}>{error}</p>
              <button
                onClick={reload}
                className="h-9 px-4 rounded-md text-sm font-semibold"
                style={{ background: 'var(--brand)', color: 'var(--brand-contrast)' }}
              >
                Retry
              </button>
            </div>
          </Card>
        )}

        {!loading && !error && !game && (
          <Card>
            <div className="pt-4 text-center">
              <p className="font-semibold mb-1">Game not found</p>
              <p className="text-sm mb-4" style={{ color: 'var(--text-tertiary)' }}>
                {away} @ {home} · Week {week} · {season}
              </p>
              <Link
                to="/games"
                className="inline-flex items-center h-9 px-4 rounded-md text-sm font-semibold no-underline"
                style={{ background: 'var(--brand)', color: 'var(--brand-contrast)' }}
              >
                Open games
              </Link>
            </div>
          </Card>
        )}

      </main>
      {!loading && !error && game && <GameView game={game} />}

      <Footer />
    </div>
  );
};

export default GamePage;
