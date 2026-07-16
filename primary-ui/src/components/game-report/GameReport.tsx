import React, { useState } from 'react';
import { ApiPrediction, getPredictedProbability } from '@/types/prediction';
import { getTeamColors } from '@/data/nflData';
import TeamLogo from '@/components/TeamLogo';
import WinProbBar from './WinProbBar';
import FactorList from './FactorList';
import WeatherPanel from './WeatherPanel';
import StadiumPanel from './StadiumPanel';
import PlayerMatchupCard from './PlayerMatchupCard';
import ThreeWayCompare from './ThreeWayCompare';
import BeliefTracker from './BeliefTracker';
import ConvictionSlider from '@/components/ConvictionSlider';
import { gameKey, getVegasPick, getFanPick } from '@/lib/threeWaySignal';
import { useUserPicks } from '@/hooks/useUserPicks';
import { useFanIdentity } from '@/hooks/useFanIdentity';
import { Pick } from '@/competition/types';
import { stakeFromConfidence, stakePreview, resolvePick } from '@/competition/scoring';
import { signed, stakeColor } from '@/lib/format';
import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';

interface GameReportProps {
  game: ApiPrediction;
}

const PLAYOFF_LABELS: Record<number, string> = {
  19: 'Wild Card', 20: 'Divisional', 21: 'Conference Championship', 22: 'Super Bowl',
};

const GameReport: React.FC<GameReportProps> = ({ game }) => {
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const { picks, setPick } = useUserPicks();
  const { team: fanTeam } = useFanIdentity();

  const winnerProb   = Math.round(getPredictedProbability(game) * 100);
  const winnerColors = getTeamColors(game.predicted_winner);
  const isPlayoff    = game.week >= 19;
  const weekLabel    = PLAYOFF_LABELS[game.week] ?? `Week ${game.week}`;
  const factors      = game.factor_cards ?? [];

  const key      = gameKey(game);
  const userPick = picks[key];
  const vegas    = getVegasPick(game);
  const fan      = getFanPick(game);

  // Voting — the game page is the "informed" path: read the evidence, then vote.
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Pick>(
    userPick
      ? { team: userPick.team, confidence: userPick.confidence }
      : { team: game.home_team, confidence: 0.5 },
  );
  const showSlider  = !userPick || editing;
  const hasPosition = draft.confidence > 0.5;
  const lockedStake = userPick ? Math.round(stakeFromConfidence(userPick.confidence)) : 0;
  const resolvedNet = userPick && game.actual_winner
    ? resolvePick({ team: userPick.team, confidence: userPick.confidence }, game.actual_winner)
    : null;

  const handleLock = () => {
    if (!hasPosition) return;
    setPick(key, { team: draft.team, confidence: draft.confidence, fanTeam });
    setEditing(false);
  };

  const handleChange = () => {
    if (userPick) setDraft({ team: userPick.team, confidence: userPick.confidence });
    setEditing(true);
  };

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
        <div className="flex items-center justify-between mb-4 pb-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <span
            className="text-xs font-semibold uppercase tracking-[0.2em]"
            style={{ color: isPlayoff ? 'var(--accent-gold)' : 'var(--text-tertiary)' }}
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
              style={{ color: 'var(--text-tertiary)' }}
            >
              {game.confidence_label} confidence
            </span>
          )}
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
            style={{ background: 'rgba(251,191,36,0.10)', border: '1px solid rgba(251,191,36,0.22)' }}
          >
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: '#fde68a' }} aria-hidden="true" />
            <p className="text-xs" style={{ color: '#fde68a' }}>
              Close game — only a slight edge. Either outcome is plausible.
            </p>
          </div>
        )}
      </header>

      {/* ── Make your call — vote here, informed by everything on this page ── */}
      <div
        className="rounded-lg p-5 mb-4"
        style={{ background: 'var(--surface)', border: '1px solid var(--border-emphasis)' }}
      >
        <div className="flex items-baseline justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--accent-gold)' }}>
            {showSlider ? 'Make your call' : 'Your call'}
          </span>
          {game.actual_winner && (
            <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              Pick as if it hasn't kicked off
            </span>
          )}
        </div>

        {showSlider ? (
          <div className="flex flex-col gap-4">
            <ConvictionSlider
              awayTeam={game.away_team}
              homeTeam={game.home_team}
              pick={draft}
              onChange={setDraft}
            />
            <div className="flex items-center justify-between gap-3">
              <span
                className="text-xs tabular-nums"
                style={{ color: hasPosition ? 'var(--text-secondary)' : 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}
              >
                {stakePreview(draft)}
              </span>
              <div className="flex items-center gap-2">
                {userPick && (
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    className="px-3 py-2 rounded text-xs uppercase tracking-wide"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleLock}
                  disabled={!hasPosition}
                  className="px-4 py-2 rounded text-xs font-semibold uppercase tracking-wide transition-colors disabled:cursor-not-allowed"
                  style={{
                    background: hasPosition ? 'var(--accent-gold)' : 'var(--surface-raised)',
                    color: hasPosition ? '#111' : 'var(--text-muted)',
                  }}
                >
                  {hasPosition ? `Lock in ${draft.team}` : 'Pick a side'}
                </button>
              </div>
            </div>
            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              Weigh the comparison and the evidence below, then lock your conviction.
            </p>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col">
              <span className="font-bold" style={{ fontFamily: 'var(--font-display)', color: getTeamColors(userPick.team).primary }}>
                {userPick.team} · {Math.round(userPick.confidence * 100)}% conviction
              </span>
              {resolvedNet != null ? (
                <span className="text-xs font-semibold tabular-nums" style={{ color: stakeColor(resolvedNet), fontFamily: 'var(--font-mono)' }}>
                  {resolvedNet > 0 ? 'Cashed' : 'Missed'} {signed(resolvedNet)} pts
                </span>
              ) : (
                <span className="text-xs tabular-nums" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                  ±{lockedStake} pts on the line
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={handleChange}
              className="px-4 py-2 rounded text-xs font-semibold uppercase tracking-wide"
              style={{ background: 'var(--surface-raised)', color: 'var(--text-primary)', border: '1px solid var(--border-emphasis)' }}
            >
              Change pick
            </button>
          </div>
        )}
      </div>

      {/* ── Visual-first: Clark / Vegas / Fans / You, then one insight ── */}
      <div
        className="rounded-lg p-5 mb-4"
        style={{ background: 'var(--surface)', border: '1px solid var(--border-default)' }}
      >
        <ThreeWayCompare
          rows={[
            ...(userPick ? [{ label: 'You', team: userPick.team, pct: userPick.confidence }] : []),
            { label: 'Clark', team: game.predicted_winner, pct: getPredictedProbability(game) },
            ...(vegas ? [{ label: 'Vegas', team: vegas.team, pct: vegas.prob }] : []),
            { label: 'Fans', team: fan.team, pct: fan.prob, isProvisional: true },
          ]}
          size="large"
          winner={game.actual_winner}
        />
      </div>

      {/* ── Belief tracker: takeaway, fan sentiment, fanbase splits ── */}
      <BeliefTracker game={game} />

      {/* ── Evidence toggle — Clark Report stays intact, just moved behind an action ── */}
      <button
        type="button"
        onClick={() => setEvidenceOpen((open) => !open)}
        className="w-full flex items-center justify-between rounded-lg px-5 py-3 mb-4 transition-colors"
        style={{ background: 'var(--surface)', border: '1px solid var(--border-default)' }}
        aria-expanded={evidenceOpen}
      >
        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          {evidenceOpen ? 'Hide the evidence' : 'View the evidence — why Clark thinks this'}
        </span>
        {evidenceOpen ? (
          <ChevronUp className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
        ) : (
          <ChevronDown className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
        )}
      </button>

      {evidenceOpen && (
        <>
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
                  <FactorList factors={factors} gameId={game.game_id} />
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
              <PlayerMatchupCard
                awayTeam={game.away_team}
                homeTeam={game.home_team}
                awayPlayers={game.away_players}
                homePlayers={game.home_players}
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
        </>
      )}
    </article>
  );
};

export default GameReport;
