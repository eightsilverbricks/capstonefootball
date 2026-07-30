import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Hourglass } from 'lucide-react';
import TeamLogo from '@/components/TeamLogo';
import { initialsOf } from '@/components/auth/AccountMenu';
import { useUserPicks } from '@/hooks/useUserPicks';
import { computeSeasonSummary } from '@/lib/seasonSummary';
import { signed, stakeColor } from '@/lib/format';
import { gameKey } from '@/lib/threeWaySignal';
import { getTeamColors } from '@/data/nflData';
import { ClarkProfile } from '@/auth/types';
import { ApiPrediction } from '@/types/prediction';

interface AccountPanelProps {
  user: ClarkProfile;
  /** Every game in the dataset — needed to resolve picks against outcomes. */
  allGames: ApiPrediction[];
  /** Just this week's games — drives the "picked N of M" progress meter. */
  weekGames: ApiPrediction[];
}

interface Cell {
  label: string;
  value: string;
  color?: string;
}

/**
 * "Your situation" on the dashboard: who you are, how the season is going, and
 * how far through this week's board you've got.
 *
 * Every number is derived live from the picks store — nothing is stored or
 * fabricated, so a brand-new account shows an honest empty state rather than a
 * wall of zeros.
 */
const AccountPanel: React.FC<AccountPanelProps> = ({ user, allGames, weekGames }) => {
  const { picks } = useUserPicks();
  const summary = computeSeasonSummary(picks, allGames);

  const pickedThisWeek = weekGames.filter((g) => picks[gameKey(g)] != null).length;
  const weekProgress = weekGames.length > 0 ? pickedThisWeek / weekGames.length : 0;
  const colors = user.favoriteTeam ? getTeamColors(user.favoriteTeam) : null;

  const cells: Cell[] =
    summary.resolvedCount > 0
      ? [
          { label: 'Record', value: `${summary.wins}–${summary.losses}` },
          { label: 'Season', value: signed(summary.seasonScore), color: stakeColor(summary.seasonScore) },
          {
            label: 'vs Clark',
            value: signed(summary.clarkDifferential),
            color: stakeColor(summary.clarkDifferential),
          },
          ...(summary.streak && summary.streak.count > 0
            ? [
                {
                  label: 'Streak',
                  value: `${summary.streak.type}${summary.streak.count}`,
                  color:
                    summary.streak.type === 'W' ? 'var(--stake-positive)' : 'var(--stake-negative)',
                },
              ]
            : []),
        ]
      : [];

  return (
    <section
      className="rounded-xl overflow-hidden"
      style={{ background: 'var(--surface)', border: '1px solid var(--border-subtle)' }}
      aria-label="Your account and season"
    >
      {/* Identity bar */}
      <div
        className="flex flex-wrap items-center gap-3 px-5 py-4"
        style={{
          borderBottom: '1px solid var(--border-subtle)',
          background: colors ? `linear-gradient(90deg, ${colors.primary}26 0%, transparent 55%)` : 'transparent',
        }}
      >
        <span
          className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
          style={{
            background: colors ? colors.primary : 'var(--surface-overlay)',
            color: colors ? colors.text : 'var(--text-primary)',
            boxShadow: colors ? `inset 0 0 0 2px ${colors.secondary}` : 'inset 0 0 0 1px var(--border-default)',
          }}
        >
          {initialsOf(user.displayName)}
        </span>

        <div className="min-w-0 flex-1">
          <p
            className="font-bold leading-tight truncate"
            style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--text-primary)' }}
          >
            {user.displayName}
          </p>
          <p className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>
            @{user.handle}
            {user.favoriteTeam ? ` · ${user.favoriteTeam} fan` : ' · no team picked yet'}
          </p>
        </div>

        {user.favoriteTeam && <TeamLogo abbr={user.favoriteTeam} size="sm" />}
      </div>

      {/* Season numbers, or an honest empty state */}
      {cells.length > 0 ? (
        <ul className="flex flex-wrap list-none p-0 m-0">
          {cells.map((cell, i) => (
            <li
              key={cell.label}
              className="flex-1 min-w-[6.5rem] px-5 py-4 flex flex-col gap-1"
              style={{ borderLeft: i > 0 ? '1px solid var(--border-subtle)' : 'none' }}
            >
              <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                {cell.label}
              </span>
              <span
                className="font-bold tabular-nums leading-none"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(1.4rem, 3vw, 2rem)',
                  color: cell.color ?? 'var(--text-primary)',
                }}
              >
                {cell.value}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="px-5 py-4">
          {summary.picksMade > 0 ? (
            <p className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <Hourglass className="w-4 h-4 shrink-0" style={{ color: 'var(--accent-gold)' }} aria-hidden="true" />
              <span>
                <span className="font-semibold" style={{ color: 'var(--accent-gold)' }}>
                  {summary.picksMade} pick{summary.picksMade === 1 ? '' : 's'}
                </span>{' '}
                in — {Math.round(summary.creditsPending)} credits on the line, waiting on results.
              </span>
            </p>
          ) : (
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              No picks yet. Take a side on one game and your record starts right there.
            </p>
          )}
        </div>
      )}

      {/* This week's progress */}
      <div className="px-5 py-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        <div className="flex items-baseline justify-between gap-3 mb-2">
          <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            This week
          </span>
          <span className="text-xs tabular-nums" style={{ color: 'var(--text-secondary)' }}>
            {pickedThisWeek} of {weekGames.length} picked
          </span>
        </div>

        <div
          className="h-1.5 rounded-full overflow-hidden"
          role="progressbar"
          aria-valuenow={pickedThisWeek}
          aria-valuemin={0}
          aria-valuemax={weekGames.length}
          aria-label="Games picked this week"
          style={{ background: 'var(--surface-overlay)' }}
        >
          <div
            className="h-full rounded-full transition-transform duration-500 origin-left"
            style={{
              background: 'var(--accent-gold)',
              width: '100%',
              transform: `scaleX(${weekProgress})`,
            }}
          />
        </div>

        <Link
          to={pickedThisWeek === weekGames.length && weekGames.length > 0 ? '/my-season' : '/games'}
          className="inline-flex items-center gap-1.5 text-xs font-semibold mt-3 no-underline"
          style={{ color: 'var(--accent-gold)' }}
        >
          {pickedThisWeek === 0
            ? 'Make your first pick'
            : pickedThisWeek === weekGames.length && weekGames.length > 0
              ? 'Full slate in — see your season'
              : `Finish the slate (${weekGames.length - pickedThisWeek} left)`}
          <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
};

export default AccountPanel;
