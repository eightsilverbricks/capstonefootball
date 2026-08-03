import React from 'react';
import { ApiPrediction, getPredictedProbability } from '@/types/prediction';
import { Pick } from '@/competition/types';
import { FanPick, TeamPick } from '@/lib/threeWaySignal';
import { Streak } from '@/lib/seasonSummary';
import { getTeamColors } from '@/data/nflData';
import { getHeroInsight } from '@/lib/heroInsight';
import { getShareLine } from '@/lib/shareCard';
import { signed, stakeColor, pct } from '@/lib/format';
import ThreeWayCompare from './ThreeWayCompare';

interface PickShareCardProps {
  game: ApiPrediction;
  pick: Pick;
  vegas: TeamPick | null;
  /** Null when no one has picked this game yet — the row is simply omitted. */
  fan: FanPick | null;
  /** Signed credits if this pick has resolved; null while the game is pending. */
  resolvedNet: number | null;
  /** Season-wide bragging layer (B6) — optional, shown only when provided. */
  clarkDifferential?: number | null;
  streak?: Streak | null;
}

/**
 * The per-pick "I called this" artifact — a self-contained, screenshot-ready
 * card (no external deps, matches ShareableWeekCard's pattern). Front: team +
 * conviction, the one-line Clark insight, You/Clark/Vegas/Fans, and the
 * resolved outcome once the game is final. See CLARK_REPORT_AND_VIRALITY_PLAN.md, B4.
 */
const PickShareCard: React.FC<PickShareCardProps> = ({
  game, pick, vegas, fan, resolvedNet, clarkDifferential, streak,
}) => {
  const colors = getTeamColors(pick.team);
  const insight = getHeroInsight(game);
  const shareLine = getShareLine(pick, vegas, resolvedNet);
  const resolved = resolvedNet != null;
  const outcomeLabel = resolved
    ? (resolvedNet! > 0 ? 'Cashed' : resolvedNet! < 0 ? 'Missed' : 'Pushed')
    : null;

  return (
    <figure
      className="rounded-lg p-6 flex flex-col gap-4"
      style={{
        background: 'var(--surface-raised)',
        border: `1px solid ${colors.primary}40`,
        borderLeft: `3px solid ${colors.primary}`,
      }}
    >
      <div className="flex items-baseline justify-between">
        <span className="text-xs uppercase tracking-[0.24em]" style={{ color: 'var(--text-muted)' }}>
          {game.away_team} at {game.home_team} · {game.week_label}
        </span>
        {outcomeLabel && (
          <span
            className="text-[10px] uppercase tracking-widest font-semibold"
            style={{ color: stakeColor(resolvedNet!) }}
          >
            {outcomeLabel}
          </span>
        )}
      </div>

      <div className="flex items-end gap-4">
        <span
          className="font-bold leading-none"
          style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.25rem,8vw,3.25rem)', color: colors.primary }}
        >
          {pick.team}
        </span>
        <div className="pb-1 flex flex-col gap-0.5">
          <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            conviction
          </span>
          <span
            className="text-lg font-semibold tabular-nums"
            style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}
          >
            {pct(pick.confidence)}
          </span>
        </div>
      </div>

      {insight && (
        <div className="rounded p-3" style={{ background: 'var(--surface)', border: '1px solid var(--border-subtle)' }}>
          <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--accent-gold)' }}>
            Clark noticed
          </span>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {insight.headline}
          </p>
        </div>
      )}

      <ThreeWayCompare
        rows={[
          { label: 'You', team: pick.team, pct: pick.confidence },
          { label: 'Clark', team: game.predicted_winner, pct: getPredictedProbability(game) },
          ...(vegas ? [{ label: 'Vegas', team: vegas.team, pct: vegas.prob }] : []),
          ...(fan ? [{ label: 'Fans', team: fan.team, pct: fan.prob, sampleSize: fan.picks }] : []),
        ]}
        size="compact"
        winner={game.actual_winner}
      />

      <p className="text-sm font-semibold leading-relaxed" style={{ color: 'var(--text-primary)' }}>
        {shareLine}
      </p>

      {(clarkDifferential != null || (streak && streak.count > 1)) && (
        <div className="flex items-center gap-3 pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          {clarkDifferential != null && (
            <span
              className="text-xs tabular-nums font-semibold"
              style={{ color: stakeColor(clarkDifferential), fontFamily: 'var(--font-mono)' }}
            >
              {signed(clarkDifferential)} vs Clark this season
            </span>
          )}
          {streak && streak.count > 1 && (
            <span
              className="text-xs tabular-nums font-semibold"
              style={{ color: streak.type === 'W' ? 'var(--stake-positive)' : 'var(--stake-negative)', fontFamily: 'var(--font-mono)' }}
            >
              {streak.type}{streak.count} streak
            </span>
          )}
        </div>
      )}

      <div className="flex items-baseline gap-2 pt-1" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        <span className="font-bold tracking-tight text-sm mt-3" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
          Clark
        </span>
        <span className="text-sm mt-3 italic" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-tertiary)' }}>
          Index
        </span>
      </div>
    </figure>
  );
};

export default PickShareCard;
