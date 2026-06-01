import React, { useState } from 'react';
import { ApiPrediction, FactorCard, getTopFactors, getPredictedProbability } from '@/types/prediction';
import { getTeamColors } from '@/data/nflData';
import TeamLogo from './TeamLogo';
import { Info, TrendingUp, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';

interface ClarkReportProps {
  game: ApiPrediction;
}

// ─── Probability bar ──────────────────────────────────────────────────────────
const ProbabilityBar: React.FC<{
  awayProb: number;
  homeProb: number;
  awayTeam: string;
  homeTeam: string;
  predictedWinner: string;
}> = ({ awayProb, homeProb, awayTeam, homeTeam, predictedWinner }) => {
  const awayColors = getTeamColors(awayTeam);
  const homeColors = getTeamColors(homeTeam);
  const awayPct = Math.round(awayProb * 100);
  const homePct = Math.round(homeProb * 100);

  return (
    <div>
      <div className="flex justify-between text-xs text-white/40 mb-1.5">
        <span className={predictedWinner === awayTeam ? 'text-white font-semibold' : ''}>
          {awayTeam} {awayPct}%
        </span>
        <span className="text-white/20">vs</span>
        <span className={predictedWinner === homeTeam ? 'text-white font-semibold' : ''}>
          {homePct}% {homeTeam}
        </span>
      </div>
      <div className="h-2 rounded-full overflow-hidden flex relative">
        <div className="h-full transition-all duration-700"
          style={{ width: `${awayPct}%`, backgroundColor: awayColors.primary, opacity: predictedWinner === awayTeam ? 1 : 0.35 }} />
        <div className="h-full transition-all duration-700"
          style={{ width: `${homePct}%`, backgroundColor: homeColors.primary, opacity: predictedWinner === homeTeam ? 1 : 0.35 }} />
        {/* 50% tick */}
        <div className="absolute top-0 bottom-0 w-px bg-white/25" style={{ left: '50%' }} />
      </div>
    </div>
  );
};

// ─── Factor row ───────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  DECISIVE: { label: 'Key edge',  color: '#4ade80' },
  MODERATE: { label: 'Notable',   color: '#fbbf24' },
  MINOR:    { label: 'Slight',    color: '#94a3b8' },
  NEUTRAL:  { label: 'Even',      color: '#475569' },
};

const FactorRow: React.FC<{
  factor: FactorCard;
  rank: number;
  beginnerMode: boolean;
}> = ({ factor, rank, beginnerMode }) => {
  const [expanded, setExpanded] = useState(false);

  const isEven = factor.advantage_team === 'Even';
  const advantageColors = isEven
    ? { primary: '#475569', secondary: '#94a3b8' }
    : getTeamColors(factor.advantage_team);

  const fillPct = Math.round(factor.contribution_strength * 100);
  const statusCfg = STATUS_CONFIG[factor.status] ?? STATUS_CONFIG.NEUTRAL;
  const displayText = factor.reason ?? factor.football_translation ?? '';

  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.02] overflow-hidden">
      {/* Header: factor name + winner pill */}
      <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs text-white/25 font-mono w-4 shrink-0 text-right">{rank}</span>
          <span className="font-semibold text-white text-sm truncate">{factor.name}</span>
        </div>
        {!isEven && (
          <span
            className="shrink-0 text-xs font-bold px-2.5 py-1 rounded-full"
            style={{ background: `${advantageColors.primary}28`, color: advantageColors.secondary || '#ffffff' }}
          >
            {factor.advantage_team}
          </span>
        )}
      </div>

      {/* Fill bar + status label */}
      <div className="px-4 pb-3">
        <div className="flex items-center gap-3">
          <div className="flex-1 h-1.5 bg-white/8 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${fillPct}%`, backgroundColor: isEven ? '#475569' : advantageColors.primary }}
            />
          </div>
          <span className="text-xs shrink-0 font-medium" style={{ color: statusCfg.color }}>
            {statusCfg.label}
          </span>
        </div>
      </div>

      {/* Reason — the concrete explanation with real numbers */}
      <div className="px-4 pb-4">
        <p className="text-sm text-white/70 leading-relaxed">{displayText}</p>
      </div>

      {/* Expandable: why does this matter */}
      {(factor.why_it_matters || factor.football_translation) && !beginnerMode && (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-center gap-1 py-2 text-xs text-white/25 hover:text-white/50 border-t border-white/8 transition-colors"
          >
            {expanded ? <><ChevronUp className="w-3 h-3" />Less</> : <><ChevronDown className="w-3 h-3" />Why does this matter?</>}
          </button>
          {expanded && (
            <div className="px-4 pb-4 pt-3 text-xs text-white/45 leading-relaxed bg-white/[0.02] border-t border-white/8">
              {factor.why_it_matters || factor.football_translation}
            </div>
          )}
        </>
      )}

      {/* Beginner mode: always show the why */}
      {beginnerMode && (factor.why_it_matters || factor.football_translation) && (
        <div className="px-4 pb-4 pt-2 text-xs text-white/45 leading-relaxed border-t border-white/8 bg-white/[0.01]">
          <span className="text-white/25 font-semibold uppercase tracking-wider text-[10px]">What this means → </span>
          {factor.why_it_matters || factor.football_translation}
        </div>
      )}
    </div>
  );
};

// ─── The Clark Report ─────────────────────────────────────────────────────────
const ClarkReport: React.FC<ClarkReportProps> = ({ game }) => {
  const [beginnerMode, setBeginnerMode] = useState(true);

  const homeColors = getTeamColors(game.home_team);
  const awayColors = getTeamColors(game.away_team);
  const winnerProb  = Math.round(getPredictedProbability(game) * 100);
  const topFactors  = getTopFactors(game, 3);
  const isPlayoff   = game.week >= 19;

  const PLAYOFF_LABELS: Record<number, string> = {
    19: 'Wild Card', 20: 'Divisional', 21: 'Conference Championship', 22: 'Super Bowl',
  };
  const weekDisplay = PLAYOFF_LABELS[game.week] ?? `Week ${game.week}`;

  const winnerColors = game.predicted_winner === game.home_team ? homeColors : awayColors;

  // Compact weather label
  const weatherLabel = (() => {
    const w = game.weather;
    if (!w?.summary) return null;
    if (!w.is_outdoor) return 'Dome';
    const parts: string[] = [];
    if (w.temp != null) parts.push(`${Math.round(w.temp)}°F`);
    if (w.wind != null && w.wind >= 10) parts.push(`${Math.round(w.wind)} mph`);
    return parts.join(' · ') || 'Outdoor';
  })();

  return (
    <div className="rounded-xl border border-white/10 bg-[#0f0f1a] overflow-hidden">

      {/* ── Matchup header ── */}
      <div
        className="p-5 pb-4"
        style={{
          background: `linear-gradient(135deg, ${awayColors.primary}18 0%, transparent 45%, ${homeColors.primary}18 100%)`,
          borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        {/* Playoff / week badge */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs text-white/35 font-medium">
            {isPlayoff
              ? <span style={{ color: '#c8a96e' }}>{weekDisplay} · {game.season}</span>
              : `Week ${game.week} · ${game.season}`}
          </span>
          {/* Compact weather + dome */}
          {weatherLabel && (
            <span className="text-[11px] text-white/30 px-2 py-0.5 rounded bg-white/[0.05]">
              {weatherLabel}
            </span>
          )}
        </div>

        {/* Teams row */}
        <div className="flex items-center justify-between gap-3 mb-4">
          {/* Away */}
          <div className="flex flex-col items-center gap-1.5 flex-1">
            <TeamLogo abbr={game.away_team} size="lg" />
            <span className="font-bold text-white text-base">{game.away_team}</span>
            <div className="text-center">
              {game.away_season_record && (
                <span className="text-xs text-white/40">{game.away_season_record}</span>
              )}
              {game.away_last3_record && (
                <span className="text-xs text-white/25 ml-1">· {game.away_last3_record.replace(' last 3', ' L3')}</span>
              )}
              {game.away_players?.qb?.name && (
                <div className="text-[11px] text-white/25 mt-0.5">{game.away_players.qb.name}</div>
              )}
            </div>
          </div>

          {/* Center: prob */}
          <div className="flex flex-col items-center flex-shrink-0">
            <div
              className="text-4xl font-bold font-serif leading-none"
              style={{ color: winnerColors.secondary || '#c8a96e' }}
            >
              {winnerProb}%
            </div>
            <div className="text-xs text-white/40 mt-1 text-center">{game.predicted_winner}</div>
            <div className="text-[11px] text-white/25 text-center">favored</div>
          </div>

          {/* Home */}
          <div className="flex flex-col items-center gap-1.5 flex-1 items-end">
            <TeamLogo abbr={game.home_team} size="lg" />
            <span className="font-bold text-white text-base">{game.home_team}</span>
            <div className="text-center">
              {game.home_season_record && (
                <span className="text-xs text-white/40">{game.home_season_record}</span>
              )}
              {game.home_last3_record && (
                <span className="text-xs text-white/25 ml-1">· {game.home_last3_record.replace(' last 3', ' L3')}</span>
              )}
              {game.home_players?.qb?.name && (
                <div className="text-[11px] text-white/25 mt-0.5">{game.home_players.qb.name}</div>
              )}
            </div>
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
        className="flex items-center justify-between px-5 py-3 border-b border-white/8"
        style={{ background: `${winnerColors.primary}10` }}
      >
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 rounded-full" style={{ backgroundColor: winnerColors.secondary || '#c8a96e' }} />
          <span className="text-xs font-bold tracking-widest text-white/50 uppercase">The Clark Report</span>
        </div>
        <button
          onClick={() => setBeginnerMode(b => !b)}
          className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-all"
          style={
            beginnerMode
              ? { borderColor: 'rgba(200,169,110,0.5)', color: '#c8a96e', background: 'rgba(200,169,110,0.1)' }
              : { borderColor: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.4)', background: 'transparent' }
          }
        >
          <Info className="w-3 h-3" />
          {beginnerMode ? 'Beginner ON' : 'New to football?'}
        </button>
      </div>

      {/* ── Close matchup notice ── */}
      {game.confidence_label === 'Low' && (
        <div className="mx-5 mt-4 flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-500/8 border border-amber-500/20">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-300/80">
            Close game — the model sees only a slight edge. Either outcome is plausible.
          </p>
        </div>
      )}

      {/* ── Editorial prose ── */}
      <div className="px-5 py-5">
        <p className="font-serif text-white/85 text-[15px] leading-relaxed">
          {game.football_story ?? game.explanation_summary ?? 'Analysis unavailable.'}
        </p>
      </div>

      {/* ── Factors to victory ── */}
      {topFactors.length > 0 && (
        <div className="px-5 pb-5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-3.5 h-3.5 text-white/25" />
            <span className="text-xs font-semibold text-white/35 uppercase tracking-wider">
              Factors to victory
            </span>
          </div>
          <div className="space-y-2.5">
            {topFactors.map((factor, i) => (
              <FactorRow
                key={factor.name}
                factor={factor}
                rank={i + 1}
                beginnerMode={beginnerMode}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Upset path ── */}
      {game.risk_factor && (
        <div className="mx-5 mb-5 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/8">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-amber-400 mb-1">Upset path</p>
              <p className="text-sm text-white/55 leading-relaxed">{game.risk_factor}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Market context ── */}
      {game.market_note && (
        <div className="mx-5 mb-5 px-4 py-3 rounded-xl bg-white/[0.02] border border-white/8">
          <p className="text-[11px] font-semibold text-white/25 uppercase tracking-wider mb-1.5">Market context</p>
          <p className="text-sm text-white/45 leading-relaxed">{game.market_note}</p>
        </div>
      )}

      {/* ── Trust footer ── */}
      <div className="px-5 py-3.5 border-t border-white/8 bg-white/[0.015] flex flex-wrap items-center justify-between gap-2 text-xs text-white/22">
        <span>Logistic regression · expanding-window · 2024 demo</span>
        <span
          className="font-semibold"
          style={{
            color: game.confidence_label === 'High' ? '#4ade80'
              : game.confidence_label === 'Medium' ? '#fbbf24'
              : '#64748b',
          }}
        >
          {game.confidence_label} confidence · {winnerProb}%
        </span>
      </div>
    </div>
  );
};

export default ClarkReport;
