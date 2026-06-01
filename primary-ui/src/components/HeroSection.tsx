import React from 'react';
import { ApiPrediction, getPredictedProbability } from '@/types/prediction';
import { getTeamColors } from '@/data/nflData';
import TeamLogo from './TeamLogo';
import { modelAccuracy } from '@/data/nflData';

interface HeroSectionProps {
  featuredGame: ApiPrediction | null;
  onViewReport: (game: ApiPrediction) => void;
  totalGames: number;
}

const HeroSection: React.FC<HeroSectionProps> = ({ featuredGame, onViewReport, totalGames }) => {
  const accuracyPct = ((modelAccuracy.season / modelAccuracy.seasonTotal) * 100).toFixed(1);

  return (
    <section className="relative overflow-hidden border-b border-white/8" style={{ background: '#0a0a12' }}>

      {/* Field texture overlay — subtle yard-line pattern */}
      <div
        className="absolute inset-0 opacity-[0.025] pointer-events-none"
        style={{
          backgroundImage: `repeating-linear-gradient(
            90deg,
            rgba(255,255,255,0.8) 0px,
            rgba(255,255,255,0.8) 1px,
            transparent 1px,
            transparent 60px
          )`,
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 py-12 lg:py-20">
        <div className="grid lg:grid-cols-2 gap-10 items-center">

          {/* ── Left: Headline + stats ── */}
          <div>
            <div className="mb-6">
              <p className="text-xs font-semibold tracking-widest text-white/30 uppercase mb-3">
                NFL Football Intelligence · 2024 Season Demo
              </p>
              <h1 className="font-serif text-4xl md:text-5xl text-white leading-tight mb-4">
                Understand{' '}
                <span
                  className="italic"
                  style={{ color: '#c8a96e' }}
                >
                  why
                </span>{' '}
                teams win.
              </h1>
              <p className="text-base text-white/50 leading-relaxed max-w-md">
                Every NFL matchup explained in plain English — the football reasons behind the numbers,
                not just the predictions. Built for fans and first-timers alike.
              </p>
            </div>

            {/* Stats row */}
            <div className="flex flex-wrap gap-6">
              <div>
                <div className="text-2xl font-bold text-white">{accuracyPct}%</div>
                <p className="text-xs text-white/30 mt-0.5">Model accuracy · 2024</p>
              </div>
              <div className="w-px bg-white/10" />
              <div>
                <div className="text-2xl font-bold text-white">{totalGames || 285}</div>
                <p className="text-xs text-white/30 mt-0.5">Games analyzed</p>
              </div>
              <div className="w-px bg-white/10" />
              <div>
                <div className="text-2xl font-bold" style={{ color: '#c8a96e' }}>6</div>
                <p className="text-xs text-white/30 mt-0.5">Football factors per game</p>
              </div>
            </div>
          </div>

          {/* ── Right: Featured game preview ── */}
          {featuredGame ? (
            <FeaturedPreview game={featuredGame} onViewReport={onViewReport} />
          ) : (
            <div className="rounded-xl border border-white/8 bg-white/[0.03] h-48 flex items-center justify-center">
              <p className="text-sm text-white/20">Loading featured matchup…</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

// ─── Featured game mini-preview ────────────────────────────────────────────────
const FeaturedPreview: React.FC<{
  game: ApiPrediction;
  onViewReport: (game: ApiPrediction) => void;
}> = ({ game, onViewReport }) => {
  const homeColors = getTeamColors(game.home_team);
  const awayColors = getTeamColors(game.away_team);
  const winnerColors = game.predicted_winner === game.home_team ? homeColors : awayColors;
  const winnerProb = (getPredictedProbability(game) * 100).toFixed(0);

  const isPlayoff = game.week >= 19;
  const PLAYOFF_LABELS: Record<number, string> = {
    19: 'Wild Card', 20: 'Divisional', 21: 'Conf. Championship', 22: 'Super Bowl',
  };
  const weekLabel = PLAYOFF_LABELS[game.week] ?? `Week ${game.week}`;

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{
        borderColor: `${winnerColors.primary}50`,
        background: `linear-gradient(135deg, ${awayColors.primary}12 0%, #0f0f1a 40%, ${homeColors.primary}12 100%)`,
      }}
    >
      {/* Label */}
      <div className="px-5 py-3 border-b border-white/8 flex items-center justify-between">
        <span className="text-xs font-semibold text-white/30 uppercase tracking-wider">
          Featured · {weekLabel} {game.season}
        </span>
        {isPlayoff && (
          <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ background: 'rgba(200,169,110,0.15)', color: '#c8a96e' }}>
            Playoffs
          </span>
        )}
      </div>

      {/* Teams */}
      <div className="p-5">
        <div className="flex items-center justify-between mb-5">
          {/* Away */}
          <div className="flex flex-col items-center gap-2">
            <TeamLogo abbr={game.away_team} size="lg" />
            <span className="text-sm font-bold text-white">{game.away_team}</span>
            <span className="text-xs text-white/40">{(game.away_win_prob * 100).toFixed(0)}%</span>
          </div>

          {/* Center */}
          <div className="text-center">
            <div
              className="text-4xl font-bold font-serif mb-1"
              style={{ color: winnerColors.secondary || '#c8a96e' }}
            >
              {winnerProb}%
            </div>
            <div className="text-xs text-white/40">{game.predicted_winner} favored</div>
          </div>

          {/* Home */}
          <div className="flex flex-col items-center gap-2">
            <TeamLogo abbr={game.home_team} size="lg" />
            <span className="text-sm font-bold text-white">{game.home_team}</span>
            <span className="text-xs text-white/40">{(game.home_win_prob * 100).toFixed(0)}%</span>
          </div>
        </div>

        {/* Probability bar */}
        <div className="h-1.5 rounded-full overflow-hidden flex mb-4">
          <div
            className="h-full"
            style={{ width: `${(game.away_win_prob * 100).toFixed(0)}%`, backgroundColor: awayColors.primary, opacity: game.predicted_winner !== game.home_team ? 1 : 0.35 }}
          />
          <div
            className="h-full"
            style={{ width: `${(game.home_win_prob * 100).toFixed(0)}%`, backgroundColor: homeColors.primary, opacity: game.predicted_winner === game.home_team ? 1 : 0.35 }}
          />
        </div>

        {/* Primary reason preview */}
        {game.football_story && (
          <p className="text-xs text-white/50 leading-relaxed mb-4 line-clamp-2">
            {game.football_story}
          </p>
        )}

        {/* CTA */}
        <button
          onClick={() => onViewReport(game)}
          className="w-full py-2.5 rounded-lg text-sm font-semibold transition-all hover:opacity-90"
          style={{
            background: `linear-gradient(135deg, ${winnerColors.primary}, ${winnerColors.primary}cc)`,
            color: winnerColors.text,
          }}
        >
          Read the Clark Report
        </button>
      </div>
    </div>
  );
};

export default HeroSection;
