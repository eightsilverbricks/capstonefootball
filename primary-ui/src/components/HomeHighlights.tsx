import React from 'react';
import { Link } from 'react-router-dom';
import { ApiPrediction, getConfidenceScore, getPredictedProbability } from '@/types/prediction';
import { gameKey } from '@/lib/threeWaySignal';
import TeamLogo from './TeamLogo';

interface HomeHighlightsProps {
  games: ApiPrediction[];
  /** How many of the highest-confidence games to surface. */
  limit?: number;
}

const gamePath = (g: ApiPrediction) =>
  `/game/${g.season}/${g.week}/${g.away_team}/${g.home_team}`;

/**
 * The dashboard's "top reads" — a few of the current week's highest-confidence
 * matchups as compact, read-only rows that link into the full game breakdown.
 * Deliberately NOT the interactive GameCard (no slider here): the homepage stays
 * a clean overview; picking happens on the Games page.
 */
const HomeHighlights: React.FC<HomeHighlightsProps> = ({ games, limit = 4 }) => {
  const top = [...games]
    .sort((a, b) => getConfidenceScore(b) - getConfidenceScore(a))
    .slice(0, limit);

  if (top.length === 0) return null;

  return (
    <ul className="flex flex-col gap-2" aria-label="This week's top reads">
      {top.map((g) => {
        const winnerProb = Math.round(getPredictedProbability(g) * 100);
        return (
          <li key={gameKey(g)}>
            <Link
              to={gamePath(g)}
              className="flex items-center justify-between gap-4 rounded-lg px-4 py-3 no-underline transition-transform duration-150 hover:-translate-y-0.5"
              style={{ background: 'var(--surface)', border: '1px solid var(--border-subtle)' }}
            >
              {/* Matchup */}
              <div className="flex items-center gap-2 min-w-0">
                <TeamLogo abbr={g.away_team} size="sm" />
                <span className="font-bold tabular-nums" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
                  {g.away_team}
                </span>
                <span className="text-[10px] uppercase tracking-widest shrink-0" style={{ color: 'var(--text-muted)' }}>
                  at
                </span>
                <span className="font-bold tabular-nums" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
                  {g.home_team}
                </span>
                <TeamLogo abbr={g.home_team} size="sm" />
              </div>

              {/* Clark's read */}
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-[10px] uppercase tracking-widest hidden sm:inline"
                  style={{ color: g.confidence_label === 'High' ? 'var(--accent-gold)' : 'var(--text-muted)' }}>
                  {g.confidence_label}
                </span>
                <span className="text-sm font-semibold tabular-nums" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                  {g.predicted_winner} {winnerProb}%
                </span>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
};

export default HomeHighlights;
