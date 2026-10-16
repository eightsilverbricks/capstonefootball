import { Navigate } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import Header from '@/components/Header';
import { usePredictions } from '@/hooks/usePredictions';
import { isLive } from '@/lib/live';

/** The phone tab bar's Live button: the game in progress, or the Games page when none is. */
export default function LiveRedirect() {
  const { predictions, loading } = usePredictions();
  if (loading) {
    return (
      <div className="min-h-screen">
        <Header />
        <p className="flex items-center justify-center gap-2 py-24 gr-muted"><RefreshCw className="w-5 h-5 animate-spin" />Finding the live game</p>
      </div>
    );
  }
  const game = predictions.find(isLive);
  return <Navigate to={game ? `/game/${game.season}/${game.week}/${game.away_team}/${game.home_team}` : '/games'} replace />;
}
