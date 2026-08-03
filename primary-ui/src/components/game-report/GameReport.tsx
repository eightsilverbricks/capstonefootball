import React, { useState, useMemo } from 'react';
import { ApiPrediction, getPredictedProbability } from '@/types/prediction';
import { getTeamColors } from '@/data/nflData';
import GameBanner from './GameBanner';
import FactorList from './FactorList';
import WeatherPanel from './WeatherPanel';
import StadiumPanel from './StadiumPanel';
import PlayerMatchupCard from './PlayerMatchupCard';
import ThreeWayCompare from './ThreeWayCompare';
import BeliefTracker from './BeliefTracker';
import PickShareCard from './PickShareCard';
import ConvictionSlider from '@/components/ConvictionSlider';
import { gameKey, getVegasPick, getFanPick } from '@/lib/threeWaySignal';
import { useUserPicks, stashPendingPick } from '@/hooks/useUserPicks';
import { useFanSentiment } from '@/hooks/useFanSentiment';
import { useFanIdentity } from '@/hooks/useFanIdentity';
import { useAuth } from '@/hooks/useAuth';
import { openAuthDialog } from '@/hooks/useAuthDialog';
import { usePredictions } from '@/hooks/usePredictions';
import { computeSeasonSummary } from '@/lib/seasonSummary';
import { Pick } from '@/competition/types';
import { stakeFromConfidence, stakePreview, resolvePick } from '@/competition/scoring';
import { signed, stakeColor } from '@/lib/format';
import { getHeroInsight, getEvidenceTeaser } from '@/lib/heroInsight';
import { AlertTriangle, ChevronDown, ChevronUp, Sparkles, Share2 } from 'lucide-react';

interface GameReportProps {
  game: ApiPrediction;
}

const GameReport: React.FC<GameReportProps> = ({ game }) => {
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const { picks, setPick } = useUserPicks();
  const { team: fanTeam } = useFanIdentity();
  const { isSignedIn } = useAuth();
  // Cheap: usePredictions is module-cached, so this reuses the fetch GamePage
  // already made — needed here only to surface the season bragging layer (B6)
  // on the per-pick share card.
  const { predictions } = usePredictions();
  const seasonSummary = useMemo(
    () => computeSeasonSummary(picks, predictions),
    [picks, predictions],
  );

  const factors      = game.factor_cards ?? [];

  const key      = gameKey(game);
  const userPick = picks[key];
  const sentimentKeys = useMemo(() => [key], [key]);
  const { sentiment } = useFanSentiment(sentimentKeys);
  const vegas    = getVegasPick(game);
  const fan      = getFanPick(game, sentiment);
  const insight  = getHeroInsight(game);
  const insightColors = insight ? getTeamColors(insight.team) : null;
  const evidenceTeaser = getEvidenceTeaser(game);

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
    const pick = { team: draft.team, confidence: draft.confidence, fanTeam };

    // Same funnel as the games grid: don't block the slider, capture the
    // account at the moment of commitment and replay the pick after sign-up.
    if (!isSignedIn) {
      stashPendingPick(key, pick);
      openAuthDialog('signup');
      return;
    }
    setPick(key, pick);
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

      {/* ── Matchup banner (Workstream C) — layered stadium/weather art,
          home-team tinted, same content as the old plain header ── */}
      <GameBanner game={game} />

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
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShareOpen((open) => !open)}
                className="flex items-center gap-1.5 px-4 py-2 rounded text-xs font-semibold uppercase tracking-wide"
                style={{ background: 'var(--surface-raised)', color: 'var(--accent-gold)', border: '1px solid var(--border-emphasis)' }}
                aria-expanded={shareOpen}
              >
                <Share2 className="w-3.5 h-3.5" aria-hidden="true" />
                {shareOpen ? 'Hide card' : 'Share your call'}
              </button>
              <button
                type="button"
                onClick={handleChange}
                className="px-4 py-2 rounded text-xs font-semibold uppercase tracking-wide"
                style={{ background: 'var(--surface-raised)', color: 'var(--text-primary)', border: '1px solid var(--border-emphasis)' }}
              >
                Change pick
              </button>
            </div>
          </div>
        )}

        {/* ── Per-pick shareable artifact (B4) — screenshot-ready, self-contained ── */}
        {!showSlider && shareOpen && (
          <div className="mt-4">
            <PickShareCard
              game={game}
              pick={{ team: userPick.team, confidence: userPick.confidence }}
              vegas={vegas}
              fan={fan}
              resolvedNet={resolvedNet}
              clarkDifferential={seasonSummary.resolvedCount > 0 ? seasonSummary.clarkDifferential : null}
              streak={seasonSummary.streak}
            />
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
            ...(fan ? [{ label: 'Fans', team: fan.team, pct: fan.prob, sampleSize: fan.picks }] : []),
          ]}
          size="large"
          winner={game.actual_winner}
        />
      </div>

      {/* ── Belief tracker: takeaway, fan sentiment, fanbase splits ── */}
      <BeliefTracker game={game} />

      {/* ── "Clark noticed…" — the non-obvious insight, visible before anyone
          opts into the full evidence (B2). Team-colored, one claim + one line. ── */}
      {insight && (
        <div
          className="rounded-lg p-5 mb-4"
          style={{
            background: 'var(--surface)',
            border: `1px solid ${insightColors?.primary ?? 'var(--border-default)'}40`,
            borderLeft: `3px solid ${insightColors?.primary ?? 'var(--accent-gold)'}`,
          }}
        >
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles className="w-3.5 h-3.5" style={{ color: insightColors?.primary ?? 'var(--accent-gold)' }} aria-hidden="true" />
            <span
              className="text-[11px] font-semibold uppercase tracking-widest"
              style={{ color: insightColors?.secondary ?? 'var(--accent-gold)' }}
            >
              Clark noticed
            </span>
          </div>
          <p
            className="font-bold text-lg leading-snug"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
          >
            {insight.headline}
          </p>
          {insight.line && (
            <p className="text-sm leading-relaxed mt-1.5" style={{ color: 'var(--text-secondary)' }}>
              {insight.line}
            </p>
          )}
        </div>
      )}

      {/* ── Evidence toggle — Clark Report stays intact, just moved behind an action ── */}
      <button
        type="button"
        onClick={() => setEvidenceOpen((open) => !open)}
        className="w-full flex items-center justify-between rounded-lg px-5 py-3 mb-4 transition-colors"
        style={{ background: 'var(--surface)', border: '1px solid var(--border-default)' }}
        aria-expanded={evidenceOpen}
      >
        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          {evidenceOpen ? 'Hide the evidence' : evidenceTeaser}
        </span>
        {evidenceOpen ? (
          <ChevronUp className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
        ) : (
          <ChevronDown className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
        )}
      </button>

      {evidenceOpen && (
        <>
          {/* ── Two-column body — single column on mobile, 3fr/2fr from lg up.
              (Previously a fixed inline grid-template that never collapsed,
              causing horizontal overflow on narrow viewports — see B7 mobile audit.) ── */}
          <div className="grid grid-cols-1 lg:[grid-template-columns:minmax(0,3fr)_minmax(0,2fr)] gap-4">
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
