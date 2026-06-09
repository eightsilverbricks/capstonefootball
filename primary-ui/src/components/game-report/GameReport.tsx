import React from 'react';
import { ApiPrediction, getPredictedProbability } from '@/types/prediction';
import { getTeamColors } from '@/data/nflData';
import TeamLogo from '@/components/TeamLogo';
import WinProbBar from './WinProbBar';
import FactorList from './FactorList';
import WeatherPanel from './WeatherPanel';
import StadiumPanel from './StadiumPanel';
import { AlertTriangle } from 'lucide-react';

interface GameReportProps {
  game: ApiPrediction;
}

const PLAYOFF_LABELS: Record<number, string> = {
  19: 'Wild Card', 20: 'Divisional', 21: 'Conference Championship', 22: 'Super Bowl',
};

const GameReport: React.FC<GameReportProps> = ({ game }) => {
  const winnerProb   = Math.round(getPredictedProbability(game) * 100);
  const winnerColors = getTeamColors(game.predicted_winner);
  const isPlayoff    = game.week >= 19;
  const weekLabel    = PLAYOFF_LABELS[game.week] ?? `Week ${game.week}`;
  const factors      = game.factor_cards ?? [];

  const weather = game.weather;
  const windMph = weather?.wind ?? 0;
  const isDome  = !weather?.is_outdoor
    || ['dome', 'closed', 'retractable'].includes((weather?.roof ?? '').toLowerCase());
  const windConsequence = (() => {
    if (isDome || windMph < 11) return '';
    if (windMph >= 31) return `Severe wind (${Math.round(windMph)} mph): passing game heavily compromised.`;
    if (windMph >= 21) return `High wind (${Math.round(windMph)} mph): passing efficiency significantly reduced.`;
    return `Moderate wind (${Math.round(windMph)} mph): minimal impact, deep routes may be affected.`;
  })();

  return (
    <article style={{ fontFamily: 'var(--font-data)' }}>

      {/* ── Matchup header — left-aligned, no centered hero, no gradients ── */}
      <header
        className="rounded-lg p-5 mb-4"
        style={{ background: 'var(--surface)', border: '1px solid var(--border-default)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <span
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: isPlayoff ? 'var(--accent-gold)' : 'var(--text-muted)' }}
          >
            {weekLabel} · {game.season}
          </span>
          <span
            className="text-xs px-2.5 py-1 rounded font-medium"
            style={{
              background: game.confidence_label === 'High'   ? 'rgba(74,222,128,0.08)'
                        : game.confidence_label === 'Medium' ? 'rgba(251,191,36,0.08)'
                        : 'var(--surface-raised)',
              color: game.confidence_label === 'High'   ? '#4ade80'
                   : game.confidence_label === 'Medium' ? '#fbbf24'
                   : 'var(--text-muted)',
              border: `1px solid ${
                game.confidence_label === 'High'   ? 'rgba(74,222,128,0.18)'
                : game.confidence_label === 'Medium' ? 'rgba(251,191,36,0.18)'
                : 'var(--border-subtle)'
              }`,
            }}
          >
            {game.confidence_label} confidence
          </span>
        </div>

        {/* Teams row — away left, win prob center, home right */}
        <div className="flex items-center justify-between gap-4 mb-5">
          {/* Away */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <TeamLogo abbr={game.away_team} size="lg" />
            <div className="min-w-0">
              <p className="font-bold text-lg leading-none"
                style={{ color: game.predicted_winner === game.away_team ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                {game.away_team}
              </p>
              {game.away_season_record && (
                <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                  {game.away_season_record}
                  {game.away_last3_record && (
                    <span style={{ color: 'var(--text-muted)' }}>
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
                color: winnerColors.secondary || winnerColors.primary || 'var(--accent-gold)',
              }}
            >
              {winnerProb}
              <span
                className="text-2xl align-super"
                style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-data)', fontWeight: 400 }}
              >
                %
              </span>
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-wider mt-1" style={{ color: 'var(--text-muted)' }}>
              {game.predicted_winner}
            </p>
          </div>

          {/* Home */}
          <div className="flex items-center gap-3 min-w-0 flex-1 justify-end">
            <div className="min-w-0 text-right">
              <p className="font-bold text-lg leading-none"
                style={{ color: game.predicted_winner === game.home_team ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                {game.home_team}
              </p>
              {game.home_season_record && (
                <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                  {game.home_season_record}
                  {game.home_last3_record && (
                    <span style={{ color: 'var(--text-muted)' }}>
                      {' '}· {game.home_last3_record.replace(' last 3', ' L3')}
                    </span>
                  )}
                </p>
              )}
            </div>
            <TeamLogo abbr={game.home_team} size="lg" />
          </div>
        </div>

        {/* Probability bar */}
        <WinProbBar
          awayTeam={game.away_team}
          homeTeam={game.home_team}
          awayProb={game.away_win_prob}
          homeProb={game.home_win_prob}
          predictedWinner={game.predicted_winner}
        />

        {game.confidence_label === 'Low' && (
          <div
            className="flex items-start gap-2 mt-4 px-3 py-2 rounded"
            style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.15)' }}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" aria-hidden="true" />
            <p className="text-xs" style={{ color: 'rgba(251,191,36,0.75)' }}>
              Close game — only a slight edge. Either outcome is plausible.
            </p>
          </div>
        )}
      </header>

      {/* ── Two-column body ── */}
      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: 'minmax(0,3fr) minmax(0,2fr)' }}
      >
        {/* Left — editorial lede + factors */}
        <div className="flex flex-col gap-4 min-w-0">
          {(game.football_story || game.explanation_summary) && (
            <div className="rounded-lg px-5 py-4"
              style={{ background: 'var(--surface)', border: '1px solid var(--border-default)' }}>
              <p className="leading-relaxed text-[15px] italic"
                style={{ fontFamily: 'var(--font-display)', color: 'var(--text-secondary)' }}>
                {game.football_story ?? game.explanation_summary}
              </p>
            </div>
          )}

          {factors.length > 0 && (
            <div className="rounded-lg px-5 py-4"
              style={{ background: 'var(--surface)', border: '1px solid var(--border-default)' }}>
              <FactorList factors={factors} />
            </div>
          )}

          {game.risk_factor && (
            <div className="rounded-lg px-4 py-3 flex items-start gap-2"
              style={{ background: 'var(--surface)', border: '1px solid var(--border-default)' }}>
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" aria-hidden="true" />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider mb-1"
                  style={{ color: 'var(--accent-gold)' }}>
                  Upset path
                </p>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {game.risk_factor}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right — context panels */}
        <div className="flex flex-col gap-4 min-w-0">
          <WeatherPanel weather={weather} windConsequence={windConsequence} />
          <StadiumPanel
            stadium={weather?.stadium ?? game.stadium}
            surface={weather?.surface}
            roof={weather?.roof}
            location={game.location}
            homeTeam={game.home_team}
          />
          {game.market_note && (
            <div className="rounded-lg p-4"
              style={{ background: 'var(--surface)', border: '1px solid var(--border-default)' }}>
              <h3 className="text-[11px] font-semibold uppercase tracking-widest mb-2"
                style={{ color: 'var(--text-muted)' }}>
                Market
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
                {game.market_note}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Footer ── */}
      <footer
        className="mt-4 rounded-lg px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-[11px]"
        style={{ background: 'var(--surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}
      >
        <span>Logistic regression · expanding-window backtest · 2024 season</span>
        <span style={{ color: 'var(--text-tertiary)' }}>71% model accuracy</span>
      </footer>
    </article>
  );
};

export default GameReport;
