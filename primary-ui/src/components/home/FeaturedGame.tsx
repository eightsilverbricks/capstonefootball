import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, MapPin, Wind } from 'lucide-react';
import TeamLogo from '@/components/TeamLogo';
import WinProbBar from '@/components/game-report/WinProbBar';
import { getHeroInsight } from '@/lib/heroInsight';
import { getTeamColors } from '@/data/nflData';
import { ApiPrediction } from '@/types/prediction';

interface FeaturedGameProps {
  game: ApiPrediction;
  /** True when this is the signed-in fan's own team playing. */
  isYourTeam?: boolean;
}

const gamePath = (g: ApiPrediction) => `/game/${g.season}/${g.week}/${g.away_team}/${g.home_team}`;

const TeamColumn: React.FC<{ abbr: string; record?: string | null; align: 'left' | 'right' }> = ({
  abbr,
  record,
  align,
}) => (
  <div className={`flex flex-col gap-2 min-w-0 ${align === 'right' ? 'items-end text-right' : 'items-start'}`}>
    <TeamLogo abbr={abbr} size="lg" />
    <div>
      <p
        className="font-bold leading-none"
        style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', color: 'var(--text-primary)' }}
      >
        {abbr}
      </p>
      {record && (
        <p className="text-[11px] tabular-nums mt-1" style={{ color: 'var(--text-muted)' }}>
          {record}
        </p>
      )}
    </div>
  </div>
);

/**
 * The week's headline matchup, given real estate. Personalized when we know
 * who you root for — your team's game outranks the model's marquee pick,
 * because that's the one you actually came to read.
 */
const FeaturedGame: React.FC<FeaturedGameProps> = ({ game, isYourTeam = false }) => {
  const insight = getHeroInsight(game);
  const homeColors = getTeamColors(game.home_team);
  const awayColors = getTeamColors(game.away_team);

  const kickoff = [game.weekday, game.gametime].filter(Boolean).join(' · ');
  const windy = game.weather?.wind != null && game.weather.wind >= 15;

  return (
    <article
      className="lift-card relative rounded-2xl overflow-hidden"
      style={{ background: 'var(--surface)', border: '1px solid var(--border-default)' }}
    >
      {/* Team-color wash across the top, away → home */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-32 pointer-events-none"
        style={{
          background: `linear-gradient(100deg, ${awayColors.primary}38 0%, transparent 42%, transparent 58%, ${homeColors.primary}38 100%)`,
        }}
      />

      <div className="relative p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <span
            className="text-[10px] uppercase tracking-[0.22em] px-2.5 py-1 rounded-full"
            style={
              isYourTeam
                ? { color: '#111', background: 'var(--accent-gold)' }
                : { color: 'var(--accent-gold)', border: '1px solid rgba(200,169,110,0.3)' }
            }
          >
            {isYourTeam ? 'Your team is playing' : 'Game of the week'}
          </span>
          <span
            className="text-[10px] uppercase tracking-[0.2em]"
            style={{ color: game.confidence_label === 'High' ? 'var(--accent-gold)' : 'var(--text-muted)' }}
          >
            {game.confidence_label} confidence
          </span>
        </div>

        {/* Matchup */}
        <div className="flex items-center justify-between gap-4 mb-7">
          <TeamColumn abbr={game.away_team} record={game.away_season_record} align="left" />
          <span
            className="text-[11px] uppercase tracking-[0.2em] shrink-0"
            style={{ color: 'var(--text-muted)' }}
          >
            at
          </span>
          <TeamColumn abbr={game.home_team} record={game.home_season_record} align="right" />
        </div>

        <WinProbBar
          awayTeam={game.away_team}
          homeTeam={game.home_team}
          awayProb={game.away_win_prob}
          homeProb={game.home_win_prob}
          predictedWinner={game.predicted_winner}
        />

        {insight && (
          <div className="mt-6">
            <p className="text-[10px] uppercase tracking-[0.2em] mb-2" style={{ color: 'var(--text-muted)' }}>
              What Clark keeps coming back to
            </p>
            <p
              className="font-bold leading-snug mb-2"
              style={{ fontFamily: 'var(--font-display)', fontSize: '1.35rem', color: 'var(--text-primary)' }}
            >
              {insight.headline}
            </p>
            {insight.line && (
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {insight.line}
              </p>
            )}
          </div>
        )}

        {/* Meta + CTA */}
        <div
          className="flex flex-wrap items-center justify-between gap-4 mt-7 pt-5"
          style={{ borderTop: '1px solid var(--border-subtle)' }}
        >
          <ul className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs list-none p-0 m-0" style={{ color: 'var(--text-muted)' }}>
            {kickoff && (
              <li className="flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5" aria-hidden="true" />
                {kickoff}
              </li>
            )}
            {game.weather?.stadium && (
              <li className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
                {game.weather.stadium}
              </li>
            )}
            {windy && (
              <li className="flex items-center gap-1.5" style={{ color: 'var(--status-moderate)' }}>
                <Wind className="w-3.5 h-3.5" aria-hidden="true" />
                {Math.round(game.weather!.wind!)} mph wind
              </li>
            )}
          </ul>

          <Link
            to={gamePath(game)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold uppercase tracking-wide no-underline"
            style={{ background: 'var(--accent-gold)', color: '#111' }}
          >
            Open the Clark Report
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
};

export default FeaturedGame;
