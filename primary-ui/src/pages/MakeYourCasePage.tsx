import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import TeamLogo from '@/components/TeamLogo';
import ConfidenceSlider from '@/components/competition/ConfidenceSlider';
import { useCompetitionData } from '@/hooks/useCompetitionData';
import { stakeFromConfidence, creditsAtRisk } from '@/competition/scoring';
import { CompetitionGame, Pick } from '@/competition/types';
import { Lock, CheckCircle2, ArrowRight } from 'lucide-react';

const MakeYourCasePage: React.FC = () => {
  const {
    currentWeek, currentWeekGames, isWeekLocked, setPick, lockWeek,
  } = useCompetitionData();

  const [reasons, setReasons] = useState<Record<string, string>>({});
  const locked = isWeekLocked(currentWeek);

  const totalAtRisk = useMemo(
    () => Math.round(creditsAtRisk(currentWeekGames, 'you')),
    [currentWeekGames],
  );
  const positionsTaken = currentWeekGames.filter(
    g => stakeFromConfidence(g.you.confidence) > 0,
  ).length;

  const weekLabel = currentWeekGames[0]?.weekLabel ?? `Week ${currentWeek}`;

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--text-primary)' }}>
      <Header />

      <main className="max-w-3xl mx-auto px-4 py-10">
        {/* ── Heading + running tally ── */}
        <div className="flex flex-wrap items-end justify-between gap-4 mb-2">
          <div>
            <span className="text-[11px] uppercase tracking-[0.24em]" style={{ color: 'var(--text-muted)' }}>
              The Clark Competition · {weekLabel}
            </span>
            <h1 className="font-bold leading-tight mt-1"
              style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 5vw, 3.25rem)' }}>
              Make your case
            </h1>
          </div>

          <div className="rounded-lg px-4 py-3 text-right"
            style={{ background: 'var(--surface)', border: '1px solid var(--border-default)' }}>
            <div className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              Credits at risk
            </div>
            <div className="font-bold tabular-nums leading-none mt-1"
              style={{ fontFamily: 'var(--font-mono)', fontSize: '1.75rem', color: 'var(--accent-gold)' }}>
              {totalAtRisk}
            </div>
            <div className="text-[10px] mt-1" style={{ color: 'var(--text-tertiary)' }}>
              {positionsTaken}/{currentWeekGames.length} positions
            </div>
          </div>
        </div>

        <p className="text-sm leading-relaxed mb-8" style={{ color: 'var(--text-secondary)' }}>
          Each game gives you an independent 50-credit cap. Drag toward the team you trust — the
          farther from center, the more you stake. Leave it at 50/50 to sit out. You're wagering
          against the model and the crowd.
        </p>

        {/* ── Locked confirmation ── */}
        {locked && (
          <div className="rounded-lg px-4 py-3 mb-6 flex items-center gap-3"
            style={{ background: 'var(--stake-positive-dim)', border: '1px solid rgba(74,222,128,0.25)' }}>
            <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: 'var(--stake-positive)' }} />
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Picks locked for {weekLabel}. {totalAtRisk} credits in play.
            </p>
            <Link to="/leaderboard"
              className="ml-auto text-xs font-semibold flex items-center gap-1 shrink-0"
              style={{ color: 'var(--accent-gold)' }}>
              Leaderboard <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        )}

        {/* ── Game rows ── */}
        <div className="flex flex-col gap-3">
          {currentWeekGames.map(game => (
            <PickRow
              key={game.gameId}
              game={game}
              reason={reasons[game.gameId] ?? ''}
              onReason={(text) => setReasons(r => ({ ...r, [game.gameId]: text }))}
              onPick={(pick) => setPick(game.gameId, pick)}
              locked={locked}
            />
          ))}
        </div>

        {/* ── Lock action ── */}
        <div className="mt-8 flex items-center justify-between gap-4 pt-5"
          style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {locked
              ? 'This week is in. Settle up on the leaderboard.'
              : 'Lock to commit your week. (Sample mode — nothing is submitted.)'}
          </p>
          <button
            onClick={() => lockWeek(currentWeek)}
            disabled={locked}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:cursor-not-allowed"
            style={{
              background: locked ? 'var(--surface-raised)' : 'var(--accent-gold)',
              color: locked ? 'var(--text-muted)' : '#1a1408',
            }}
          >
            <Lock className="w-4 h-4" />
            {locked ? 'Locked' : 'Lock picks'}
          </button>
        </div>
      </main>

      <Footer />
    </div>
  );
};

// ─── One game row ─────────────────────────────────────────────────────────────
interface PickRowProps {
  game: CompetitionGame;
  reason: string;
  onReason: (text: string) => void;
  onPick: (pick: Pick) => void;
  locked: boolean;
}

const PickRow: React.FC<PickRowProps> = ({ game, reason, onReason, onPick, locked }) => {
  const stake = Math.round(stakeFromConfidence(game.you.confidence));
  const hasPosition = stake > 0;

  return (
    <article className="rounded-lg p-4"
      style={{ background: 'var(--surface)', border: '1px solid var(--border-default)' }}>
      {/* Matchup line */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <TeamLogo abbr={game.awayTeam} size="sm" />
          <span className="font-semibold text-sm" style={{ color: 'var(--text-secondary)' }}>{game.awayTeam}</span>
          <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>at</span>
          <span className="font-semibold text-sm" style={{ color: 'var(--text-secondary)' }}>{game.homeTeam}</span>
          <TeamLogo abbr={game.homeTeam} size="sm" />
        </div>

        {/* Live stake preview */}
        <div className="text-right shrink-0">
          {hasPosition ? (
            <span className="text-xs tabular-nums" style={{ fontFamily: 'var(--font-mono)' }}>
              <span style={{ color: 'var(--stake-positive)' }}>+{stake}</span>
              <span style={{ color: 'var(--text-muted)' }}> / </span>
              <span style={{ color: 'var(--stake-negative)' }}>−{stake}</span>
            </span>
          ) : (
            <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>No position</span>
          )}
        </div>
      </div>

      <ConfidenceSlider
        awayTeam={game.awayTeam}
        homeTeam={game.homeTeam}
        pick={game.you}
        onChange={onPick}
        disabled={locked}
      />

      {/* Stake sentence */}
      {hasPosition && (
        <p className="text-[11px] mt-2" style={{ color: 'var(--text-tertiary)' }}>
          Staking <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{stake}</span>{' '}
          on <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{game.you.team}</span> —
          {' '}<span style={{ color: 'var(--stake-positive)' }}>+{stake} if they win</span>,
          {' '}<span style={{ color: 'var(--stake-negative)' }}>−{stake} if they don't</span>.
        </p>
      )}

      {/* Optional reasoning — only once a position is taken */}
      {hasPosition && !locked && (
        <input
          type="text"
          value={reason}
          onChange={(e) => onReason(e.target.value)}
          maxLength={120}
          placeholder="One line on why (optional)…"
          className="mt-3 w-full rounded-md px-3 py-2 text-sm outline-none"
          style={{
            background: 'var(--surface-raised)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-primary)',
          }}
        />
      )}
      {hasPosition && locked && reason && (
        <p className="mt-3 text-xs italic" style={{ color: 'var(--text-tertiary)' }}>“{reason}”</p>
      )}
    </article>
  );
};

export default MakeYourCasePage;
