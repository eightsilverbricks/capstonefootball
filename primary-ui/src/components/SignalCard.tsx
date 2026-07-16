import React from 'react';
import { useNavigate } from 'react-router-dom';
import { SignalResult } from '@/lib/threeWaySignal';
import ThreeWayCompare from '@/components/game-report/ThreeWayCompare';

interface SignalCardProps {
  signal: SignalResult;
}

/**
 * The Signal — the single most interesting Clark/Vegas/Fan disagreement for the
 * current week. This is the first thing the homepage shows: one sentence, one
 * visual, before any game list. See product-overhaul plan — the homepage should
 * open on "what's happening this week," not an inventory of games.
 */
const SignalCard: React.FC<SignalCardProps> = ({ signal }) => {
  const navigate = useNavigate();
  const { game, sentence, clark, vegas, fan } = signal;

  const rows = [
    { label: 'Clark', team: clark.team, pct: clark.prob },
    ...(vegas ? [{ label: 'Vegas', team: vegas.team, pct: vegas.prob }] : []),
    { label: 'Fans', team: fan.team, pct: fan.prob, isProvisional: true },
  ];

  const handleClick = () => {
    navigate(`/game/${game.season}/${game.week}/${game.away_team}/${game.home_team}`);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="w-full text-left rounded-lg p-6 transition-transform duration-150 hover:-translate-y-0.5"
      style={{ background: 'var(--surface)', border: '1px solid var(--border-emphasis)' }}
    >
      <span
        className="text-[10px] font-semibold uppercase tracking-[0.24em]"
        style={{ color: 'var(--accent-gold)' }}
      >
        The Signal · this week
      </span>

      <p
        className="mt-2 mb-5 leading-snug"
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(1.4rem, 3vw, 2rem)',
          color: 'var(--text-primary)',
        }}
      >
        {sentence}
      </p>

      <ThreeWayCompare rows={rows} size="large" winner={game.actual_winner} />

      <span
        className="inline-block mt-5 text-xs uppercase tracking-widest"
        style={{ color: 'var(--text-muted)' }}
      >
        {game.away_team} at {game.home_team} — see the full matchup →
      </span>
    </button>
  );
};

export default SignalCard;
