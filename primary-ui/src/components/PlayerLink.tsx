import { Link } from 'react-router-dom';
import { findPlayerId, useRosters } from '@/data/rosters';

/** A player's name, linked to /player/:id when he's a starter we have a page for. */
export default function PlayerLink({ name, team }: { name: string; team: string }) {
  const { rosters } = useRosters();
  const id = rosters ? findPlayerId(rosters, team, name) : null;
  return id ? <Link to={`/player/${id}`} className="player-link">{name}</Link> : <>{name}</>;
}
