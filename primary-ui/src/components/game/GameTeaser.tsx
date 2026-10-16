import { Link } from 'react-router-dom';
import SignInGate, { GatePreview } from '@/components/auth/SignInGate';
import { getVegasPick } from '@/lib/threeWaySignal';
import type { LiveAware } from '@/lib/live';
import GameHeader from './GameHeader';

/**
 * The game page for signed-out visitors: the scorebug (teams, kickoff, score)
 * stays public; Preview, Live, Chat and Recap sit behind the sign-in wall.
 */
export default function GameTeaser({ game }: { game: LiveAware }) {
  return (
    <>
      <GameHeader game={game} vegas={getVegasPick(game)} fan={null} />
      <div className="gv-wrap gv-teaser">
        <SignInGate feature="game" preview={<GatePreview shape="article" />} />
      </div>
      <p className="gv-wrap gv-foot">
        <Link to="/games">← All games</Link>
      </p>
    </>
  );
}
