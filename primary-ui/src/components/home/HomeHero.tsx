import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Target } from 'lucide-react';
import TeamLogo from '@/components/TeamLogo';
import { ClarkProfile } from '@/auth/types';
import { ModelRecord, formatAccuracy } from '@/lib/modelRecord';
import { weekTitle } from '@/lib/currentWeek';

interface HomeHeroProps {
  user: ClarkProfile | null;
  week: number;
  gamesThisWeek: number;
  record: ModelRecord;
}

/** 'Zane Wolf' → 'Zane'. */
function firstNameOf(displayName: string): string {
  return displayName.trim().split(/\s+/)[0] || displayName;
}

function greeting(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

/**
 * The dashboard masthead. Personal on the left (who you are, what week it is),
 * factual on the right (how the model is actually doing) — so the page opens on
 * "here's your situation" rather than a generic banner.
 */
const HomeHero: React.FC<HomeHeroProps> = ({ user, week, gamesThisWeek, record }) => (
  <section className="stadium-bloom relative" aria-labelledby="dashboard-heading">
    <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
      <p className="flex items-center gap-2 text-sm rise-in" style={{ color: 'var(--text-secondary)' }}>
        {user ? (
          <>
            {user.favoriteTeam && <TeamLogo abbr={user.favoriteTeam} size="sm" className="!w-6 !h-6" />}
            <span>
              {greeting(new Date().getHours())},{' '}
              <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                {firstNameOf(user.displayName)}
              </span>
              .
            </span>
          </>
        ) : (
          <span>Season 2024 · the model lens</span>
        )}
      </p>

      <span
        className="rise-in inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] px-3 py-1.5 rounded-full"
        style={{
          color: 'var(--accent-gold)',
          background: 'var(--accent-gold-dim)',
          border: '1px solid rgba(200,169,110,0.22)',
        }}
      >
        <span className="relative inline-flex w-1.5 h-1.5 rounded-full pulse-ring" style={{ background: 'currentColor' }} />
        Clark {formatAccuracy(record.accuracy)} · {record.correct}–{record.played - record.correct}
      </span>
    </div>

    <h1
      id="dashboard-heading"
      className="rise-in font-bold leading-[0.9] tracking-tight"
      style={{
        fontFamily: 'var(--font-display)',
        fontSize: 'clamp(2.75rem, 7vw, 6rem)',
        color: 'var(--text-primary)',
        '--rise-delay': '70ms',
      } as React.CSSProperties}
    >
      {weekTitle(week)}
    </h1>

    <div
      className="rise-in flex flex-wrap items-center gap-3 mt-5"
      style={{ '--rise-delay': '150ms' } as React.CSSProperties}
    >
      <Link
        to="/games"
        className="inline-flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-semibold uppercase tracking-wide no-underline transition-transform duration-150 hover:-translate-y-0.5"
        style={{ background: 'var(--accent-gold)', color: '#111' }}
      >
        <Target className="w-4 h-4" aria-hidden="true" />
        Make this week's picks
      </Link>
      <Link
        to="/my-season"
        className="inline-flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-semibold uppercase tracking-wide no-underline"
        style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}
      >
        My Season
        <ArrowRight className="w-4 h-4" aria-hidden="true" />
      </Link>
      <span className="text-xs tabular-nums" style={{ color: 'var(--text-muted)' }}>
        {gamesThisWeek} games on the board
      </span>
    </div>
  </section>
);

export default HomeHero;
