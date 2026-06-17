import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import WeeklyRecapCard from '@/components/competition/WeeklyRecapCard';
import { useCompetitionData } from '@/hooks/useCompetitionData';
import {
  clarkScore, clarkDifferential, weeklyNet, biggestCorrectStake,
} from '@/competition/scoring';
import { EntityKind } from '@/competition/types';
import { ArrowRight } from 'lucide-react';

type SortMode = 'season' | 'week' | 'biggest';
type LeagueFilter = 'global' | string;

// You belong to one private league for the demo.
const YOUR_LEAGUE_IDS = ['league_couch'];

interface Row {
  id: string;
  name: string;
  avatar: string;
  season: number;
  week: number;
  differential: number;
  biggest: number;
  isYou?: boolean;
  leagueId: string | null;
}

const LeaderboardPage: React.FC = () => {
  const { games, lastSettledWeek, users, leagues, settledGamesThrough } = useCompetitionData();
  const [sort, setSort] = useState<SortMode>('season');
  const [league, setLeague] = useState<LeagueFilter>('global');

  const settled = settledGamesThrough(lastSettledWeek);
  const lastWeekGames = settled.filter(g => g.week === lastSettledWeek);
  const weekLabel = lastWeekGames[0]?.weekLabel ?? `Week ${lastSettledWeek}`;

  // Live totals for the three benchmark entities.
  const totals = useMemo(() => {
    const compute = (e: EntityKind) => ({
      season: clarkScore(settled, e),
      week: weeklyNet(lastWeekGames, e),
      differential: clarkDifferential(settled, e),
      biggest: biggestCorrectStake(settled, e),
    });
    return { you: compute('you'), crowd: compute('crowd'), index: compute('index') };
  }, [settled, lastWeekGames]);

  // Unified ranked rows = mock users + You (computed).
  const allRows: Row[] = useMemo(() => {
    const youRow: Row = {
      id: 'you', name: 'You', avatar: '⭐',
      season: totals.you.season, week: totals.you.week,
      differential: totals.you.differential, biggest: totals.you.biggest,
      isYou: true, leagueId: YOUR_LEAGUE_IDS[0],
    };
    const userRows: Row[] = users.map(u => ({
      id: u.id, name: u.displayName, avatar: u.avatar,
      season: u.clarkScore, week: u.weeklyNet,
      differential: u.clarkDifferential, biggest: u.biggestCorrectStake,
      leagueId: u.leagueId,
    }));
    return [youRow, ...userRows];
  }, [users, totals]);

  const filtered = useMemo(() => {
    const rows = league === 'global'
      ? allRows
      : allRows.filter(r => r.leagueId === league || r.isYou && YOUR_LEAGUE_IDS.includes(league));
    const key: keyof Row = sort === 'season' ? 'season' : sort === 'week' ? 'week' : 'biggest';
    return [...rows].sort((a, b) => (b[key] as number) - (a[key] as number));
  }, [allRows, league, sort]);

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--text-primary)' }}>
      <Header />

      <main className="max-w-5xl mx-auto px-4 py-10">
        {/* ── Heading ── */}
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <span className="text-[11px] uppercase tracking-[0.24em]" style={{ color: 'var(--text-muted)' }}>
              The Clark Competition · standings
            </span>
            <h1 className="font-bold leading-tight mt-1"
              style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 5vw, 3.25rem)' }}>
              Leaderboard
            </h1>
          </div>
          <Link to="/compete"
            className="text-xs font-semibold flex items-center gap-1"
            style={{ color: 'var(--accent-gold)' }}>
            Make this week's picks <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {/* ── You / Crowd / Index comparison ── */}
        <section className="grid grid-cols-3 gap-px rounded-lg overflow-hidden mb-10"
          style={{ background: 'var(--border-default)', border: '1px solid var(--border-default)' }}>
          <BenchmarkCol name="You"        accent t={totals.you} />
          <BenchmarkCol name="Crowd"      t={totals.crowd} />
          <BenchmarkCol name="Clark Index" t={totals.index} />
        </section>

        {/* ── Weekly recap ── */}
        <section className="mb-10">
          <h2 className="text-xs uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>
            {weekLabel} recap · shareable
          </h2>
          <div className="flex flex-wrap gap-4">
            <WeeklyRecapCard variant="you"   games={settled} week={lastSettledWeek} weekLabel={weekLabel} rankDelta={2} />
            <WeeklyRecapCard variant="crowd" games={settled} week={lastSettledWeek} weekLabel={weekLabel} rankDelta={-1} />
          </div>
        </section>

        {/* ── Profile mini-view ── */}
        <ProfileMini
          season={totals.you.season}
          differential={totals.you.differential}
          weeklySeries={[...Array(lastSettledWeek)].map((_, i) =>
            clarkScore(settled.filter(g => g.week <= i + 1), 'you'),
          )}
          leagues={leagues.filter(l => YOUR_LEAGUE_IDS.includes(l.id))}
        />

        {/* ── Ranked list ── */}
        <section>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            {/* League filter */}
            <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest">
              <FilterChip active={league === 'global'} onClick={() => setLeague('global')}>Global</FilterChip>
              {leagues.map(l => (
                <FilterChip key={l.id} active={league === l.id} onClick={() => setLeague(l.id)}>{l.name}</FilterChip>
              ))}
            </div>
            {/* Sort */}
            <div className="flex items-center gap-3 text-[11px] uppercase tracking-widest">
              <span style={{ color: 'var(--text-muted)' }}>Sort</span>
              <SortChip active={sort === 'season'}  onClick={() => setSort('season')}>Season</SortChip>
              <SortChip active={sort === 'week'}    onClick={() => setSort('week')}>This week</SortChip>
              <SortChip active={sort === 'biggest'} onClick={() => setSort('biggest')}>Biggest stake</SortChip>
            </div>
          </div>

          <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border-default)' }}>
            {/* Column header */}
            <div className="grid grid-cols-[2rem_1fr_auto_auto_auto] gap-3 px-4 py-2 text-[10px] uppercase tracking-widest"
              style={{ background: 'var(--surface-raised)', color: 'var(--text-muted)' }}>
              <span>#</span><span>Player</span>
              <span className="text-right w-16">Season</span>
              <span className="text-right w-14">Week</span>
              <span className="text-right w-14">Best</span>
            </div>
            {filtered.map((r, i) => (
              <div key={r.id}
                className="grid grid-cols-[2rem_1fr_auto_auto_auto] gap-3 px-4 py-2.5 items-center text-sm"
                style={{
                  borderTop: '1px solid var(--border-subtle)',
                  background: r.isYou ? 'var(--accent-gold-dim)' : 'var(--surface)',
                }}>
                <span className="tabular-nums" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{i + 1}</span>
                <span className="flex items-center gap-2 min-w-0">
                  <span aria-hidden="true">{r.avatar}</span>
                  <span className="truncate font-semibold"
                    style={{ color: r.isYou ? 'var(--accent-gold)' : 'var(--text-primary)' }}>{r.name}</span>
                </span>
                <span className="text-right w-16 tabular-nums font-semibold" style={{ fontFamily: 'var(--font-mono)' }}>{Math.round(r.season)}</span>
                <span className="text-right w-14 tabular-nums"
                  style={{ fontFamily: 'var(--font-mono)', color: r.week > 0 ? 'var(--stake-positive)' : r.week < 0 ? 'var(--stake-negative)' : 'var(--text-tertiary)' }}>
                  {r.week > 0 ? '+' : r.week < 0 ? '−' : ''}{Math.abs(Math.round(r.week))}
                </span>
                <span className="text-right w-14 tabular-nums" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>{Math.round(r.biggest)}</span>
              </div>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

// ─── Comparison column ────────────────────────────────────────────────────────
const BenchmarkCol: React.FC<{
  name: string; accent?: boolean;
  t: { season: number; week: number; differential: number };
}> = ({ name, accent, t }) => (
  <div className="px-4 py-4" style={{ background: 'var(--surface)' }}>
    <div className="text-[10px] uppercase tracking-widest mb-3"
      style={{ color: accent ? 'var(--accent-gold)' : 'var(--text-muted)' }}>{name}</div>
    <div className="font-bold tabular-nums leading-none mb-3"
      style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.5rem,4vw,2.25rem)' }}>
      {Math.round(t.season)}
    </div>
    <div className="flex flex-col gap-1 text-[11px]">
      <Line label="This week" value={t.week} signed />
      <Line label="vs Index" value={t.differential} signed />
    </div>
  </div>
);

const Line: React.FC<{ label: string; value: number; signed?: boolean }> = ({ label, value, signed }) => (
  <div className="flex items-center justify-between">
    <span style={{ color: 'var(--text-muted)' }}>{label}</span>
    <span className="tabular-nums font-semibold" style={{
      fontFamily: 'var(--font-mono)',
      color: value > 0 ? 'var(--stake-positive)' : value < 0 ? 'var(--stake-negative)' : 'var(--text-tertiary)',
    }}>
      {signed && value > 0 ? '+' : signed && value < 0 ? '−' : ''}{Math.abs(Math.round(value))}
    </span>
  </div>
);

// ─── Profile mini-view ────────────────────────────────────────────────────────
const ProfileMini: React.FC<{
  season: number; differential: number; weeklySeries: number[];
  leagues: { id: string; name: string; tag: string }[];
}> = ({ season, differential, weeklySeries, leagues }) => {
  const max = Math.max(1, ...weeklySeries.map(Math.abs));
  const pts = weeklySeries.map((v, i) => {
    const x = weeklySeries.length > 1 ? (i / (weeklySeries.length - 1)) * 100 : 50;
    const y = 28 - (v / max) * 22; // center-ish baseline
    return `${x},${Math.max(2, Math.min(30, y))}`;
  }).join(' ');

  return (
    <section className="rounded-lg p-4 mb-10 flex flex-wrap items-center gap-6"
      style={{ background: 'var(--surface)', border: '1px solid var(--border-default)' }}>
      <div>
        <div className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Your Clark Score</div>
        <div className="font-bold tabular-nums leading-none mt-1"
          style={{ fontFamily: 'var(--font-display)', fontSize: '2rem' }}>{Math.round(season)}</div>
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Differential</div>
        <div className="font-bold tabular-nums leading-none mt-1"
          style={{ fontFamily: 'var(--font-mono)', fontSize: '1.25rem',
            color: differential > 0 ? 'var(--stake-positive)' : differential < 0 ? 'var(--stake-negative)' : 'var(--text-tertiary)' }}>
          {differential > 0 ? '+' : differential < 0 ? '−' : ''}{Math.abs(Math.round(differential))}
        </div>
      </div>
      <div className="flex-1 min-w-[120px]">
        <div className="text-[10px] uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>Trend</div>
        <svg viewBox="0 0 100 30" width="100%" height="30" preserveAspectRatio="none" aria-hidden="true">
          <polyline points={pts} fill="none" stroke="var(--accent-gold)" strokeWidth="1.5"
            strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        </svg>
      </div>
      <div className="flex items-center gap-1.5">
        {leagues.map(l => (
          <span key={l.id} className="text-[10px] uppercase tracking-widest px-2 py-1 rounded"
            style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)', color: 'var(--text-tertiary)' }}>
            {l.tag}
          </span>
        ))}
      </div>
    </section>
  );
};

// ─── Small controls ───────────────────────────────────────────────────────────
const FilterChip: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
  <button onClick={onClick} className="px-2.5 py-1 rounded transition-colors"
    style={{
      color: active ? 'var(--text-primary)' : 'var(--text-muted)',
      background: active ? 'var(--surface-raised)' : 'transparent',
      border: `1px solid ${active ? 'var(--border-emphasis)' : 'transparent'}`,
    }}>
    {children}
  </button>
);

const SortChip: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
  <button onClick={onClick} className="transition-colors"
    style={{
      color: active ? 'var(--text-primary)' : 'var(--text-muted)',
      borderBottom: active ? '1px solid var(--accent-gold)' : '1px solid transparent',
      paddingBottom: '2px',
    }}>
    {children}
  </button>
);

export default LeaderboardPage;
