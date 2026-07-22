import React from 'react';
import { ApiPrediction, getPredictedProbability } from '@/types/prediction';
import { getTeamColors } from '@/data/nflData';
import { withAlpha, legibleTeamTextColor, SURFACE_HEX } from '@/lib/color';
import { STADIUM_META } from '@/data/stadiumMeta';
import TeamLogo from '@/components/TeamLogo';
import PlayerHeadshot from '@/components/PlayerHeadshot';
import WinProbBar from './WinProbBar';
import StadiumScene from './StadiumScene';
import StadiumImage from './StadiumImage';
import WeatherScene from './WeatherScene';
import WeatherBadges from './WeatherBadges';
import { AlertTriangle, MapPin } from 'lucide-react';

interface GameBannerProps {
  game: ApiPrediction;
}

const PLAYOFF_LABELS: Record<number, string> = {
  19: 'Wild Card', 20: 'Divisional', 21: 'Conference Championship', 22: 'Super Bowl',
};

/**
 * Layered game-page banner (Workstream C): a home-team-tinted surface with a
 * stylized stadium/weather illustration behind the matchup header — replaces
 * GameReport's previous flat header, same content, more atmosphere.
 *
 * Design-system note: the base tint is a FLAT translucent color (via
 * withAlpha), not a linear-gradient — the user explicitly declined the
 * gradient override proposed in the plan's C6, so the "no gradients"  rule
 * stays in force here too. Do not reintroduce a gradient on this surface.
 */
const GameBanner: React.FC<GameBannerProps> = ({ game }) => {
  const home = game.home_team;
  const away = game.away_team;
  const homeColors = getTeamColors(home);
  const winnerColors = getTeamColors(game.predicted_winner);

  const winnerProb = Math.round(getPredictedProbability(game) * 100);
  const isPlayoff = game.week >= 19;
  const weekLabel = PLAYOFF_LABELS[game.week] ?? `Week ${game.week}`;

  const weather = game.weather;
  const windMph = weather?.wind ?? 0;
  const isOutdoor = !!weather?.is_outdoor
    && !['dome', 'closed', 'retractable'].includes((weather?.roof ?? '').toLowerCase());

  // Flat home-team tint (no gradient) + a legible text color guard — several
  // teams' secondary colors (ATL/CIN black, CAR near-black, etc.) fail WCAG AA
  // directly on the dark surface; never render one of those as text.
  const tint = withAlpha(homeColors.primary, 0.14);
  const winnerTextColor = legibleTeamTextColor(winnerColors, SURFACE_HEX, 'var(--accent-gold)');

  const homeQb = game.home_players?.qb;
  const awayQb = game.away_players?.qb;

  const venueName = weather?.stadium ?? game.stadium ?? STADIUM_META[home]?.name ?? null;
  const venueCity = game.location ?? STADIUM_META[home]?.city ?? null;

  return (
    <header
      className="relative rounded-lg mb-4 overflow-hidden"
      style={{ background: 'var(--surface)', border: '1px solid var(--border-default)' }}
    >
      {/* Real venue photograph (Wikimedia) — falls back to the honest SVG scene
          if the file is missing or the network fails. */}
      <StadiumImage
        homeTeam={home}
        width={1000}
        className="absolute inset-0 w-full h-full object-cover"
        fallback={<StadiumScene isOutdoor={isOutdoor} accentColor={homeColors.primary} />}
      />

      {/* Legibility scrim over the photo — a single FLAT layer (the no-gradient
          rule for this surface still holds; see component note above). Kept light
          enough that the venue still reads; the text-shadow halo below carries the
          real legibility load per-glyph, so bright venue shots don't force a heavy
          full-image scrim. */}
      <div className="absolute inset-0" style={{ background: 'rgba(9,9,9,0.58)' }} aria-hidden="true" />

      {/* Base home-team tint layer — flat translucent color. */}
      <div className="absolute inset-0" style={{ background: tint }} aria-hidden="true" />

      {/* Weather atmosphere layer — wind lines only; gated to real data */}
      <WeatherScene windMph={windMph} isOutdoor={isOutdoor} accentColor={homeColors.primary} />

      {/* Content layer — a text-shadow HALO (not an opaque panel) keeps type
          legible over the photo so the venue stays visible behind it. The soft
          second shadow acts as a per-glyph scrim, rescuing the muted gray labels
          over bright venue shots without darkening the whole image. text-shadow
          is inherited, so every text child picks this up. */}
      <div
        className="relative z-10 p-5"
        style={{ textShadow: '0 1px 2px rgba(0,0,0,0.95), 0 0 10px rgba(0,0,0,0.7)' }}
      >
        <div className="flex items-center justify-between mb-4 pb-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <span
            className="text-xs font-semibold uppercase tracking-[0.2em]"
            style={{ color: isPlayoff ? 'var(--accent-gold)' : 'rgba(255,255,255,0.90)' }}
          >
            {weekLabel} · {game.season}
          </span>
          {game.actual_winner ? (
            <span
              className="text-xs font-semibold uppercase tracking-[0.2em] tabular-nums"
              style={{ color: game.predicted_winner === game.actual_winner ? 'var(--stake-positive)' : 'var(--stake-negative)' }}
            >
              Final · {game.away_team} {game.away_score} — {game.home_team} {game.home_score}
            </span>
          ) : (
            <span
              className="text-xs uppercase tracking-[0.2em]"
              style={{ color: 'rgba(255,255,255,0.90)' }}
            >
              {game.confidence_label} confidence
            </span>
          )}
        </div>

        {/* Teams row — away left, win prob center, home right */}
        <div className="flex items-center justify-between gap-4 mb-5">
          {/* Away */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {awayQb?.espn_id ? (
              <PlayerHeadshot espnId={awayQb.espn_id} name={awayQb.name} teamAbbr={away} size={56} priority />
            ) : (
              <TeamLogo abbr={away} size="lg" />
            )}
            <div className="min-w-0">
              <p className="font-bold text-lg leading-none"
                style={{ color: game.predicted_winner === away ? '#ffffff' : 'rgba(255,255,255,0.85)' }}>
                {away}
              </p>
              {game.away_season_record && (
                <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.85)' }}>
                  {game.away_season_record}
                  {game.away_last3_record && (
                    <span style={{ color: 'rgba(255,255,255,0.68)' }}>
                      {' '}· {game.away_last3_record.replace(' last 3', ' L3')}
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>

          {/* Win probability — display type */}
          <div className="flex flex-col items-center shrink-0">
            <div
              className="font-bold leading-none"
              style={{
                fontSize: 'clamp(2.5rem, 5vw, 4rem)',
                fontFamily: 'var(--font-display)',
                color: winnerTextColor,
              }}
            >
              {winnerProb}
              <span
                className="text-2xl align-super"
                style={{ color: 'rgba(255,255,255,0.80)', fontFamily: 'var(--font-data)', fontWeight: 400 }}
              >
                %
              </span>
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-wider mt-1" style={{ color: 'rgba(255,255,255,0.90)' }}>
              {game.predicted_winner}
            </p>
          </div>

          {/* Home */}
          <div className="flex items-center gap-3 min-w-0 flex-1 justify-end">
            <div className="min-w-0 text-right">
              <p className="font-bold text-lg leading-none"
                style={{ color: game.predicted_winner === home ? '#ffffff' : 'rgba(255,255,255,0.85)' }}>
                {home}
              </p>
              {game.home_season_record && (
                <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.85)' }}>
                  {game.home_season_record}
                  {game.home_last3_record && (
                    <span style={{ color: 'rgba(255,255,255,0.68)' }}>
                      {' '}· {game.home_last3_record.replace(' last 3', ' L3')}
                    </span>
                  )}
                </p>
              )}
            </div>
            {homeQb?.espn_id ? (
              <PlayerHeadshot espnId={homeQb.espn_id} name={homeQb.name} teamAbbr={home} size={56} priority />
            ) : (
              <TeamLogo abbr={home} size="lg" />
            )}
          </div>
        </div>

        {/* Probability bar */}
        <WinProbBar
          awayTeam={away}
          homeTeam={home}
          awayProb={game.away_win_prob}
          homeProb={game.home_win_prob}
          predictedWinner={game.predicted_winner}
        />

        {/* Data-grounded weather chips + venue caption */}
        <div className="flex flex-wrap items-center justify-between gap-2 mt-4">
          <WeatherBadges tempF={weather?.temp} windMph={windMph} isOutdoor={isOutdoor} />
          {venueName && (
            <span className="inline-flex items-center gap-1 text-[11px]" style={{ color: 'rgba(255,255,255,0.85)' }}>
              <MapPin className="w-3 h-3" aria-hidden="true" />
              {venueName}{venueCity ? ` · ${venueCity}` : ''}
            </span>
          )}
        </div>

        {game.confidence_label === 'Low' && (
          <div
            className="flex items-start gap-2 mt-4 px-3 py-2 rounded"
            style={{ background: 'rgba(251,191,36,0.10)', border: '1px solid rgba(251,191,36,0.22)' }}
          >
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: '#fde68a' }} aria-hidden="true" />
            <p className="text-xs" style={{ color: '#fde68a' }}>
              Close game — only a slight edge. Either outcome is plausible.
            </p>
          </div>
        )}
      </div>
    </header>
  );
};

export default GameBanner;
