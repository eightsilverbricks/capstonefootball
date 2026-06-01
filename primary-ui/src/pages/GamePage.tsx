import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePredictions } from '@/hooks/usePredictions';
import ClarkReport from '@/components/ClarkReport';
import TeamLogo from '@/components/TeamLogo';
import { ArrowLeft, RefreshCw } from 'lucide-react';

const PLAYOFF_LABELS: Record<number, string> = {
  19: 'Wild Card', 20: 'Divisional', 21: 'Conference Championship', 22: 'Super Bowl',
};

const GamePage: React.FC = () => {
  const { season, week, away, home } = useParams<{
    season: string; week: string; away: string; home: string;
  }>();
  const navigate = useNavigate();
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

  const weekNum = Number(week);
  const weekLabel = PLAYOFF_LABELS[weekNum] ?? `Week ${weekNum}`;
  const backWeek = week ?? '22';

  const handleBack = () => {
    // Go back if there's history, otherwise go home
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(`/?week=${backWeek}`);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: '#0a0a12' }}>
      {/* ── Top bar ── */}
      <div className="sticky top-0 z-30 border-b border-white/8 bg-[#0a0a12]/95 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back</span>
          </button>

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-white/40 min-w-0">
            {game ? (
              <>
                <TeamLogo abbr={game.away_team} size="sm" />
                <span className="font-semibold text-white/70 truncate">
                  {game.away_team} @ {game.home_team}
                </span>
                <span className="text-white/25 hidden sm:inline">· {weekLabel}</span>
              </>
            ) : (
              <span className="text-white/30">Loading…</span>
            )}
          </div>

          {/* Right: demo badge */}
          <span
            className="shrink-0 text-xs font-medium px-2.5 py-1 rounded-full border"
            style={{ borderColor: 'rgba(200,169,110,0.35)', color: '#c8a96e', background: 'rgba(200,169,110,0.08)' }}
          >
            2024
          </span>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <RefreshCw className="w-7 h-7 text-white/25 animate-spin" />
            <p className="text-sm text-white/35">Loading matchup…</p>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="rounded-xl border border-red-800/40 bg-red-950/20 p-6 text-center">
            <p className="text-white font-semibold mb-2">Couldn't load predictions</p>
            <p className="text-red-300/60 text-sm mb-4">{error}</p>
            <button
              onClick={reload}
              className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white text-sm rounded-lg"
            >
              Retry
            </button>
          </div>
        )}

        {/* Not found */}
        {!loading && !error && !game && (
          <div className="rounded-xl border border-white/8 p-8 text-center">
            <p className="text-white/50 mb-1">Matchup not found</p>
            <p className="text-sm text-white/30 mb-5">
              {away} @ {home} · Week {week} · {season}
            </p>
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 bg-white/8 hover:bg-white/12 text-white/60 text-sm rounded-lg"
            >
              Go home
            </button>
          </div>
        )}

        {/* The report */}
        {!loading && !error && game && (
          <ClarkReport game={game} />
        )}
      </div>
    </div>
  );
};

export default GamePage;
