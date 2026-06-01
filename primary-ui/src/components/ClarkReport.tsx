import React, { useState } from 'react';
import { ApiPrediction, FactorCard, getTopFactors, getPredictedProbability } from '@/types/prediction';
import { getTeamColors } from '@/data/nflData';
import TeamLogo from './TeamLogo';
import { Info, TrendingUp, AlertTriangle, ChevronDown, ChevronUp, Thermometer, Wind, Building2 } from 'lucide-react';

interface ClarkReportProps {
  game: ApiPrediction;
  compact?: boolean; // for hero preview vs full modal
}

// ─── Probability Bar ───────────────────────────────────────────────────────────
const ProbabilityBar: React.FC<{
  awayProb: number;
  homeProb: number;
  awayTeam: string;
  homeTeam: string;
  predictedWinner: string;
}> = ({ awayProb, homeProb, awayTeam, homeTeam, predictedWinner }) => {
  const awayColors = getTeamColors(awayTeam);
  const homeColors = getTeamColors(homeTeam);
  const awayPct = (awayProb * 100).toFixed(0);
  const homePct = (homeProb * 100).toFixed(0);

  return (
    <div className="w-full">
      {/* Labels */}
      <div className="flex justify-between text-xs text-white/50 mb-1.5">
        <span className={predictedWinner === awayTeam ? 'text-white font-medium' : ''}>
          {awayTeam} {awayPct}%
        </span>
        <span className={predictedWinner === homeTeam ? 'text-white font-medium' : ''}>
          {homeTeam} {homePct}%
        </span>
      </div>
      {/* Track */}
      <div className="h-2 rounded-full overflow-hidden flex">
        <div
          className="h-full transition-all duration-700"
          style={{ width: `${awayPct}%`, backgroundColor: awayColors.primary, opacity: predictedWinner === awayTeam ? 1 : 0.45 }}
        />
        <div
          className="h-full transition-all duration-700"
          style={{ width: `${homePct}%`, backgroundColor: homeColors.primary, opacity: predictedWinner === homeTeam ? 1 : 0.45 }}
        />
      </div>
      {/* Center tick */}
      <div className="relative h-2 -mt-2 pointer-events-none">
        <div className="absolute left-1/2 -translate-x-1/2 w-px h-full bg-white/30" />
      </div>
    </div>
  );
};

// ─── Factor Row ────────────────────────────────────────────────────────────────
const FactorRow: React.FC<{
  factor: FactorCard;
  homeTeam: string;
  awayTeam: string;
  rank: number;
  beginnerMode: boolean;
}> = ({ factor, homeTeam, awayTeam, rank, beginnerMode }) => {
  const [expanded, setExpanded] = useState(false);
  const advantageTeam = factor.advantage_team;
  const isEven = advantageTeam === 'Even';
  const isHome = advantageTeam === homeTeam;
  const homeColors = getTeamColors(homeTeam);
  const awayColors = getTeamColors(awayTeam);
  const advantageColors = isHome ? homeColors : awayColors;

  // Bar sizing: contribution_strength is 0–1, use it as bar fill %
  const fillPct = Math.min(factor.contribution_strength * 100, 100);
  // Direction: positive raw_edge = home has edge, negative = away
  const homeHasEdge = factor.raw_edge >= 0;

  const statusColors: Record<string, string> = {
    DECISIVE: 'text-emerald-400',
    MODERATE: 'text-amber-400',
    MINOR:    'text-white/40',
    NEUTRAL:  'text-white/30',
  };

  return (
    <div className="rounded-lg border border-white/8 overflow-hidden bg-white/[0.03]">
      {/* Main row */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-white/30 text-xs font-mono w-4 shrink-0">{rank}</span>
            <span className="font-semibold text-white text-sm">{factor.name}</span>
            <span className={`text-xs ${statusColors[factor.status] ?? 'text-white/30'}`}>
              {factor.status}
            </span>
          </div>
          {!isEven && (
            <div
              className="shrink-0 text-xs font-semibold px-2 py-0.5 rounded"
              style={{ backgroundColor: `${advantageColors.primary}25`, color: advantageColors.secondary || '#ffffff' }}
            >
              {advantageTeam} edge
            </div>
          )}
        </div>

        {/* Comparison bar */}
        <div className="mb-3">
          <div className="flex items-center gap-2">
            {/* Away side */}
            <span className="text-xs text-white/40 w-8 text-right shrink-0">{awayTeam}</span>
            <div className="flex-1 h-2 rounded-full bg-white/8 relative overflow-visible flex items-center">
              {isEven ? (
                <div className="w-full h-full bg-white/15 rounded-full" />
              ) : homeHasEdge ? (
                // Home has edge — bar grows from center-right
                <div className="w-full h-full flex items-center">
                  <div className="flex-1" />
                  <div
                    className="h-2 rounded-r-full transition-all duration-700"
                    style={{
                      width: `${fillPct / 2}%`,
                      backgroundColor: homeColors.primary,
                    }}
                  />
                </div>
              ) : (
                // Away has edge — bar grows from center-left
                <div className="w-full h-full flex items-center">
                  <div
                    className="h-2 rounded-l-full transition-all duration-700"
                    style={{
                      width: `${fillPct / 2}%`,
                      backgroundColor: awayColors.primary,
                    }}
                  />
                  <div className="flex-1" />
                </div>
              )}
              {/* Center divider */}
              <div className="absolute left-1/2 -translate-x-1/2 w-0.5 h-4 bg-white/20 rounded-full" />
            </div>
            {/* Home side */}
            <span className="text-xs text-white/40 w-8 shrink-0">{homeTeam}</span>
          </div>
          {!isEven && (
            <div className="flex justify-center mt-1">
              <span className="text-xs text-white/30">
                Edge magnitude: {factor.contribution_strength >= 0.7 ? 'large' : factor.contribution_strength >= 0.4 ? 'moderate' : 'small'}
              </span>
            </div>
          )}
        </div>

        {/* Primary reason — game-specific with real numbers */}
        <p className="text-sm text-white/75 leading-relaxed">
          {factor.reason ?? factor.football_translation}
        </p>
      </div>

      {/* Expandable: beginner education */}
      {(factor.why_it_matters || factor.football_translation) && (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-center gap-1 py-2 text-xs text-white/30 hover:text-white/60 border-t border-white/8 transition-colors"
          >
            {expanded ? (
              <><ChevronUp className="w-3 h-3" /> Less</>
            ) : (
              <><ChevronDown className="w-3 h-3" /> {beginnerMode ? 'Why does this matter?' : 'More context'}</>
            )}
          </button>
          {expanded && (
            <div className="px-4 pb-4 text-xs text-white/50 leading-relaxed bg-white/[0.02] border-t border-white/8">
              {beginnerMode ? factor.why_it_matters : factor.football_translation}
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ─── The Clark Report ──────────────────────────────────────────────────────────
const ClarkReport: React.FC<ClarkReportProps> = ({ game, compact = false }) => {
  const [beginnerMode, setBeginnerMode] = useState(true);

  const homeColors = getTeamColors(game.home_team);
  const awayColors = getTeamColors(game.away_team);
  const winnerProb = (getPredictedProbability(game) * 100).toFixed(0);
  const topFactors = getTopFactors(game, 3);
  const isPlayoff = game.week >= 19;

  const PLAYOFF_LABELS: Record<number, string> = {
    19: 'Wild Card',
    20: 'Divisional',
    21: 'Conf. Championship',
    22: 'Super Bowl',
  };
  const weekDisplay = PLAYOFF_LABELS[game.week] ?? `Week ${game.week}`;

  // Dynamic border color based on winner's team color
  const winnerColors = game.predicted_winner === game.home_team ? homeColors : awayColors;

  return (
    <div className="rounded-xl overflow-hidden border border-white/10 bg-[#0f0f1a]">

      {/* ── Matchup header ── */}
      <div
        className="relative p-6 pb-5"
        style={{
          background: `linear-gradient(135deg, ${awayColors.primary}15 0%, transparent 50%, ${homeColors.primary}15 100%)`,
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {/* Playoff badge */}
        {isPlayoff && (
          <div className="flex justify-center mb-4">
            <span
              className="text-xs font-semibold px-3 py-1 rounded-full"
              style={{
                background: 'linear-gradient(135deg, #c8a96e22, #e8c97e22)',
                color: '#c8a96e',
                border: '1px solid rgba(200,169,110,0.3)',
              }}
            >
              {weekDisplay} · {game.season}
            </span>
          </div>
        )}

        {/* Teams + logos */}
        <div className="flex items-center justify-between gap-4 mb-5">
          {/* Away team */}
          <div className="flex flex-col items-center gap-2 flex-1">
            <TeamLogo abbr={game.away_team} size={compact ? 'lg' : 'xl'} />
            <div className="text-center">
              <p className="font-bold text-white text-lg">{game.away_team}</p>
              <p className="text-xs text-white/40">Away</p>
            </div>
          </div>

          {/* Center: probability + week label */}
          <div className="flex flex-col items-center gap-1 flex-shrink-0 w-28">
            {!isPlayoff && (
              <span className="text-xs text-white/30">{weekDisplay} · {game.season}</span>
            )}
            <div
              className="text-3xl font-bold font-serif"
              style={{ color: winnerColors.secondary || '#c8a96e' }}
            >
              {winnerProb}%
            </div>
            <div className="text-xs text-white/50 text-center">
              {game.predicted_winner} favored
            </div>
          </div>

          {/* Home team */}
          <div className="flex flex-col items-center gap-2 flex-1 items-end">
            <TeamLogo abbr={game.home_team} size={compact ? 'lg' : 'xl'} />
            <div className="text-center">
              <p className="font-bold text-white text-lg">{game.home_team}</p>
              <p className="text-xs text-white/40">Home</p>
            </div>
          </div>
        </div>

        {/* Records + QB row */}
        <div className="flex items-start justify-between gap-2 mb-4">
          {/* Away team context */}
          <div className="flex-1 min-w-0 space-y-0.5">
            {game.away_season_record && (
              <p className="text-xs text-white/50 font-medium">{game.away_season_record}</p>
            )}
            {game.away_last3_record && (
              <p className="text-xs text-white/30">{game.away_last3_record}</p>
            )}
            {game.away_players?.qb?.name && (
              <p className="text-xs text-white/25">QB: {game.away_players.qb.name}</p>
            )}
          </div>

          {/* Weather chip — center */}
          {game.weather?.summary && (
            <div className="flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded bg-white/[0.04] border border-white/8 text-xs text-white/40">
              {game.weather.is_outdoor && game.weather.temp !== null && game.weather.temp !== undefined
                ? <Thermometer className="w-3 h-3" />
                : game.weather.wind && game.weather.wind >= 15
                  ? <Wind className="w-3 h-3" />
                  : <Building2 className="w-3 h-3" />}
              <span className="max-w-[120px] truncate">{game.weather.summary}</span>
            </div>
          )}

          {/* Home team context */}
          <div className="flex-1 min-w-0 space-y-0.5 text-right">
            {game.home_season_record && (
              <p className="text-xs text-white/50 font-medium">{game.home_season_record}</p>
            )}
            {game.home_last3_record && (
              <p className="text-xs text-white/30">{game.home_last3_record}</p>
            )}
            {game.home_players?.qb?.name && (
              <p className="text-xs text-white/25">QB: {game.home_players.qb.name}</p>
            )}
          </div>
        </div>

        {/* Probability bar */}
        <ProbabilityBar
          awayProb={game.away_win_prob}
          homeProb={game.home_win_prob}
          awayTeam={game.away_team}
          homeTeam={game.home_team}
          predictedWinner={game.predicted_winner}
        />
      </div>

      {/* ── Clark Report header ── */}
      <div
        className="flex items-center justify-between px-6 py-3 border-b border-white/8"
        style={{ background: `${winnerColors.primary}12` }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-1 h-4 rounded-full"
            style={{ backgroundColor: winnerColors.secondary || '#c8a96e' }}
          />
          <span className="text-xs font-bold tracking-widest text-white/60 uppercase">
            The Clark Report
          </span>
        </div>

        {/* Beginner toggle */}
        <button
          onClick={() => setBeginnerMode(!beginnerMode)}
          className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-all"
          style={
            beginnerMode
              ? { borderColor: 'rgba(200,169,110,0.5)', color: '#c8a96e', background: 'rgba(200,169,110,0.1)' }
              : { borderColor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.5)', background: 'transparent' }
          }
        >
          <Info className="w-3 h-3" />
          {beginnerMode ? 'Beginner mode ON' : 'New to football?'}
        </button>
      </div>

      {/* ── Editorial prose ── */}
      <div className="px-6 py-5">
        {game.confidence_label === 'Low' && (
          <div className="mb-4 flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-300/80">
              Close matchup — the model sees a slight edge, not a clear favorite. Both outcomes are plausible.
            </p>
          </div>
        )}

        <p className="font-serif text-white/90 text-base leading-relaxed mb-1">
          {game.football_story ?? game.explanation_summary ?? 'No analysis available for this matchup.'}
        </p>
      </div>

      {/* ── Three reasons ── */}
      {topFactors.length > 0 && (
        <div className="px-6 pb-5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-white/30" />
            <span className="text-xs font-semibold text-white/40 uppercase tracking-wider">
              Key matchup factors
            </span>
          </div>
          <div className="space-y-2">
            {topFactors.map((factor, i) => (
              <FactorRow
                key={factor.name}
                factor={factor}
                homeTeam={game.home_team}
                awayTeam={game.away_team}
                rank={i + 1}
                beginnerMode={beginnerMode}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Risk ── */}
      {game.risk_factor && (
        <div className="mx-6 mb-5 px-4 py-3 rounded-lg bg-white/[0.03] border border-white/8">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-amber-400 mb-1">Upset path</p>
              <p className="text-sm text-white/60 leading-relaxed">{game.risk_factor}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Market note ── */}
      {game.market_note && (
        <div className="mx-6 mb-6 px-4 py-3 rounded-lg bg-white/[0.03] border border-white/8">
          <p className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-1">Market context</p>
          <p className="text-sm text-white/50 leading-relaxed">{game.market_note}</p>
        </div>
      )}

      {/* ── Trust footer ── */}
      <div className="px-6 py-4 border-t border-white/8 bg-white/[0.02]">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-white/25">
          <span>Logistic regression · expanding-window · 2024 demo</span>
          <span
            className="font-semibold"
            style={{ color: game.confidence_label === 'High' ? '#4ade80' : game.confidence_label === 'Medium' ? '#fbbf24' : '#94a3b8' }}
          >
            {game.confidence_label} confidence · {(getPredictedProbability(game) * 100).toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
};

export default ClarkReport;
