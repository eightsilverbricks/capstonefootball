import { Navigate } from 'react-router-dom';
import { usePredictions } from '@/hooks/usePredictions';
import { isLive } from '@/lib/live';

/** The phone tab bar's Live button: the game in progress, or the Games page when none is. */
export default function LiveRedirect() {
  const { predictions, loading } = usePredictions();
  if (loading) return null;
  const game = predictions.find(isLive);
  return <Navigate to={game ? `/game/${game.season}/${game.week}/${game.away_team}/${game.home_team}` : '/games'} replace />;
}
