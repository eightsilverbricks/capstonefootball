import { ApiPrediction } from '@/types/prediction';
import { getTeamColors } from '@/data/nflData';

const W = 600;
const H = 180;

/**
 * Win-probability chart. Before kickoff it shows Clark's pregame number as a
 * dashed line; the live line is drawn once the live feed supplies points.
 */
export default function WinProbChart({ game, points = [] }: { game: ApiPrediction; points?: number[] }) {
  const y = (homeProb: number) => H - homeProb * H;
  const pre = y(game.home_win_prob);
  const line = points.map((p, i) => `${(i / Math.max(1, points.length - 1)) * W},${y(p)}`).join(' ');
  const hc = getTeamColors(game.home_team).primary;
  const ac = getTeamColors(game.away_team).primary;
  return (
    <svg viewBox={`0 0 ${W} ${H + 14}`} width="100%" role="img" aria-label={`${game.home_team} win probability`}>
      <rect x="0" y="0" width={W} height={H / 2} fill={hc} opacity=".06" />
      <rect x="0" y={H / 2} width={W} height={H / 2} fill={ac} opacity=".06" />
      <line x1="0" y1={H / 2} x2={W} y2={H / 2} stroke="var(--rule)" />
      <line x1="0" y1={pre} x2={W} y2={pre} stroke="var(--clark-solid)" strokeDasharray="6 5" strokeWidth="2" />
      <text x={W - 4} y={pre - 6} textAnchor="end" fontSize="11" fontWeight="700" fill="var(--clark-solid)">
        Clark: {game.predicted_winner} {Math.round(Math.max(game.home_win_prob, game.away_win_prob) * 100)}%
      </text>
      {points.length > 1 && <polyline className="wp-line" fill="none" stroke={hc} strokeWidth="3" strokeLinejoin="round" points={line} />}
      <text x="4" y="14" fontSize="11" fill="var(--ink-3)">{game.home_team} 100%</text>
      <text x="4" y={H - 4} fontSize="11" fill="var(--ink-3)">{game.away_team} 100%</text>
    </svg>
  );
}
