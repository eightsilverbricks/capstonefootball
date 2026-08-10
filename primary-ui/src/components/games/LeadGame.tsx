// ─── LeadGame — the week's front-page lead ───────────────────────────────────
// One matchup, given the room a newspaper gives its lead story: team colours
// wash the card, the matchup is set at display scale, and the reason it's
// leading is stated outright. Everything below it on the page stays a normal
// grid card, so size genuinely means importance rather than decoration.
//
// The pick interaction is the same one the grid cards use (useGamePick) — this
// is a different presentation of the same behaviour, never a second copy of it.

import React, { useId } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { ApiPrediction, getPredictedProbability } from '@/types/prediction';
import { getTeamColors } from '@/data/nflData';
import { withAlpha, scrimStrengthFor } from '@/lib/color';
import { billingReason, formatKickoff, getSlateWindow } from '@/lib/slate';
import { getVegasPick, getFanPick, getPrePickTeaser } from '@/lib/threeWaySignal';
import { getPickReading } from '@/lib/pickReading';
import { getHeroInsight } from '@/lib/heroInsight';
import { useFanSentiment } from '@/hooks/useFanSentiment';
import { useGamePick } from '@/hooks/useGamePick';
import { useAuth } from '@/hooks/useAuth';
import { stakePreview, indexConfidenceFromScore } from '@/competition/scoring';
import TeamLogo from '@/components/TeamLogo';
import ConvictionSlider from '@/components/ConvictionSlider';
import ThreeWayCompare from '@/components/game-report/ThreeWayCompare';

interface LeadGameProps {
  game: ApiPrediction;
}

/** First sentence only — the lead card states the claim, the Report proves it. */
function firstSentence(text: string): string {
  const match = text.match(/^.*?[.!?](?:\s|$)/);
  return (match ? match[0] : text).trim();
}

const LeadGame: React.FC<LeadGameProps> = ({ game }) => {
  const navigate = useNavigate();
  // Generated rather than hardcoded: a duplicate DOM id would silently break
  // the aria-labelledby link if this card were ever rendered twice.
  const headingId = useId();
  const { isSignedIn } = useAuth();
  const { userPick, hasPicked, draft, setDraft, hasPosition, lock, changePick, stake, key } =
    useGamePick(game);

  const sentimentKeys = React.useMemo(() => [key], [key]);
  const { sentiment } = useFanSentiment(sentimentKeys);

  const vegas = getVegasPick(game);
  const fan = getFanPick(game, sentiment);
  const window = getSlateWindow(game);
  const reason = billingReason(game);
  const kickoff = formatKickoff(game.gametime);

  const home = getTeamColors(game.home_team);
  const away = getTeamColors(game.away_team);

  // Both team colours wash the card from opposite corners. The scrim is sized
  // from the lighter of the two so the white display type stays legible even
  // against gold/silver teams — see lib/color.ts.
  const scrim = Math.max(scrimStrengthFor(home.primary), scrimStrengthFor(away.primary));

  const openReport = () => {
    navigate(`/game/${game.season}/${game.week}/${game.away_team}/${game.home_team}`);
  };

  const story = game.football_story ? firstSentence(game.football_story) : null;
  const insight = getHeroInsight(game);
  const winnerPct = Math.round(getPredictedProbability(game) * 100);

  return (
    <section
      aria-labelledby={headingId}
      className="relative rounded-lg overflow-hidden mb-12"
      style={{ border: '1px solid var(--border-emphasis)' }}
    >
      {/* Colour wash — decorative only, never the sole carrier of meaning. */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background: `linear-gradient(115deg, ${withAlpha(away.primary, 0.85)} 0%, ${withAlpha(away.primary, 0.25)} 38%, ${withAlpha(home.primary, 0.25)} 62%, ${withAlpha(home.primary, 0.85)} 100%)`,
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{ background: `rgba(10, 10, 18, ${Math.max(0.62, scrim)})` }}
      />

      <div className="relative p-6 sm:p-8 lg:p-10 flex flex-col gap-6">
        {/* Billing line — why this game leads the page */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span
            className="text-[10px] uppercase tracking-[0.24em] px-2 py-1 rounded"
            style={{ background: 'var(--accent-gold)', color: '#111' }}
          >
            {reason ?? 'Game of the week'}
          </span>
          <span className="text-[11px] uppercase tracking-[0.2em]" style={{ color: 'rgba(255,255,255,0.62)' }}>
            {window.label}
            {kickoff ? ` · ${kickoff}` : ''}
          </span>
        </div>

        {/* Matchup at display scale */}
        <h2 id={headingId} className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <span className="flex items-center gap-3">
            <TeamLogo abbr={game.away_team} size="lg" />
            <span
              className="font-bold leading-[0.9]"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(2.25rem, 6vw, 4.5rem)',
                color: '#fff',
              }}
            >
              {game.away_team}
            </span>
          </span>
          <span
            className="text-xs uppercase tracking-[0.3em]"
            style={{ color: 'rgba(255,255,255,0.5)' }}
          >
            at
          </span>
          <span className="flex items-center gap-3">
            <span
              className="font-bold leading-[0.9]"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(2.25rem, 6vw, 4.5rem)',
                color: '#fff',
              }}
            >
              {game.home_team}
            </span>
            <TeamLogo abbr={game.home_team} size="lg" />
          </span>
        </h2>

        {/* The claim */}
        {!hasPicked && (
          <p
            className="max-w-2xl text-base sm:text-lg italic leading-snug"
            style={{ fontFamily: 'var(--font-display)', color: 'rgba(255,255,255,0.86)' }}
          >
            {story ?? getPrePickTeaser(game, vegas, fan)}
          </p>
        )}

        {/* Pick interaction — identical behaviour to the grid cards */}
        {!hasPicked ? (
          <div className="flex flex-col gap-4 max-w-2xl">
            <span className="text-xs uppercase tracking-widest" style={{ color: 'var(--accent-gold)' }}>
              Drag toward your pick
            </span>
            <ConvictionSlider
              awayTeam={game.away_team}
              homeTeam={game.home_team}
              pick={draft}
              onChange={setDraft}
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span
                className="text-xs tabular-nums"
                style={{
                  color: hasPosition ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.45)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {stakePreview(draft)}
              </span>
              <button
                type="button"
                onClick={lock}
                disabled={!hasPosition}
                className="px-5 py-2.5 rounded text-xs font-semibold uppercase tracking-wide transition-colors disabled:cursor-not-allowed"
                style={{
                  background: hasPosition ? 'var(--accent-gold)' : 'rgba(255,255,255,0.12)',
                  color: hasPosition ? '#111' : 'rgba(255,255,255,0.5)',
                }}
              >
                {!hasPosition
                  ? 'Pick a side'
                  : isSignedIn
                    ? `Lock in ${draft.team}`
                    : `Lock in ${draft.team} — free account`}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 max-w-2xl">
            <ThreeWayCompare
              rows={[
                { label: 'You', team: userPick!.team, pct: userPick!.confidence },
                { label: 'Clark', team: game.predicted_winner, pct: indexConfidenceFromScore(game.confidence_score) },
                ...(vegas ? [{ label: 'Vegas', team: vegas.team, pct: vegas.prob }] : []),
                ...(fan ? [{ label: 'Fans', team: fan.team, pct: fan.prob, sampleSize: fan.picks }] : []),
              ]}
              size="large"
              winner={game.actual_winner}
            />
            <p className="text-sm leading-snug" style={{ color: 'rgba(255,255,255,0.75)' }}>
              {getPickReading(game, userPick!, vegas, fan)}
            </p>
            <div className="flex items-center gap-4">
              <span
                className="text-[10px] uppercase tracking-widest tabular-nums"
                style={{ color: 'rgba(255,255,255,0.55)', fontFamily: 'var(--font-mono)' }}
              >
                ±{stake} pts on the line
              </span>
              <button
                type="button"
                onClick={changePick}
                className="text-[10px] uppercase tracking-widest transition-colors"
                style={{ color: 'rgba(255,255,255,0.55)' }}
              >
                Change
              </button>
            </div>
          </div>
        )}

        {/* Always available — reading the evidence is never gated behind a pick */}
        <button
          type="button"
          onClick={openReport}
          className="self-start inline-flex items-center gap-2 text-xs uppercase tracking-widest transition-opacity hover:opacity-80"
          style={{ color: '#fff', borderBottom: '1px solid var(--accent-gold)', paddingBottom: '3px' }}
        >
          Read the Clark Report
          <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
        </button>

        {/* Clark's read, set as a sidebar on wide screens. The lead card runs
            full width, and without this the right half is dead space. */}
        {insight && (
          <aside
            className="hidden lg:flex absolute top-10 right-10 w-[19rem] flex-col gap-3 p-5 rounded"
            style={{
              background: 'rgba(10, 10, 18, 0.55)',
              border: '1px solid rgba(255,255,255,0.14)',
              backdropFilter: 'blur(6px)',
            }}
          >
            <span className="text-[10px] uppercase tracking-[0.24em]" style={{ color: 'var(--accent-gold)' }}>
              Clark noticed
            </span>
            <p
              className="text-base leading-snug"
              style={{ fontFamily: 'var(--font-display)', color: '#fff' }}
            >
              {insight.headline}
            </p>
            {insight.line && (
              <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.68)' }}>
                {insight.line}
              </p>
            )}
            <span
              className="text-[10px] uppercase tracking-widest tabular-nums pt-1"
              style={{ color: 'rgba(255,255,255,0.55)', fontFamily: 'var(--font-mono)', borderTop: '1px solid rgba(255,255,255,0.12)' }}
            >
              {game.predicted_winner} {winnerPct}% · {game.confidence_label} confidence
            </span>
          </aside>
        )}

        <span className="sr-only">
          Clark gives {game.predicted_winner} a {winnerPct} percent chance to win.
        </span>
      </div>
    </section>
  );
};

export default LeadGame;
