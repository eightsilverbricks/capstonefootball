import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Header from '@/components/Header';
import SignInGate, { GatePreview } from '@/components/auth/SignInGate';
import Footer from '@/components/Footer';
import { getEspnLogoUrl, getTeamColors } from '@/data/nflData';
import { getTeam } from '@/data/teams';
import { useRosters, type PlayerInfo } from '@/data/rosters';
import { explainPosition, placeOnField } from '@/lib/positions';
import NotFound from './NotFound';

type Side = 'offense' | 'defense';

const SUFFIX = /^(jr\.?|sr\.?|ii|iii|iv|v)$/i;
/** "James Cook III" -> "Cook". */
export function lastName(name: string): string {
  const parts = name.split(' ').filter((w) => !SUFFIX.test(w));
  return parts[parts.length - 1] ?? name;
}

function PlayerSheet({ id, player, onClose }: { id: string; player: PlayerInfo; onClose: () => void }) {
  return (
    <aside className="ro-sheet" aria-label={`${player.name} details`}>
      <button type="button" className="ro-close" onClick={onClose} aria-label="Close">×</button>
      <div className="ro-sheet-top">
        {player.headshot ? <img src={player.headshot} alt="" width={64} height={64} /> : <span className="ro-ph" />}
        <div><b>{player.name}</b><span>{player.pos} · {player.team}{player.injury ? ` · ${player.injury.status}` : ''}</span></div>
      </div>
      <p>{explainPosition(player.pos)}</p>
      {player.rank && <p className="ro-rank">{player.rank}</p>}
      {player.season && <p className="gr-muted">This season: {player.season}</p>}
      <Link className="pill pill-red" to={`/player/${id}`}>Player page</Link>
    </aside>
  );
}

/** Starters drawn on a field, Offense / Defense toggle; tap a player for the basics (§7). */
export default function RosterPage() {
  const { abbr = '' } = useParams();
  const team = getTeam(abbr.toUpperCase());
  const { rosters, error } = useRosters();
  const [side, setSide] = useState<Side>('offense');
  const [open, setOpen] = useState<string | null>(null);
  const starters = rosters && team ? rosters.teams[team.abbr]?.[side] ?? [] : [];
  const placed = useMemo(() => placeOnField(starters), [starters]);

  if (!team) return <NotFound />;
  const c = getTeamColors(team.abbr);

  return (
    <div className="min-h-screen">
      <Header />
      <main className="tm-wrap ro">
        <div className="ro-head">
          <Link to={`/team/${team.abbr}`} className="ro-back"><img src={getEspnLogoUrl(team.abbr)} alt="" width={32} height={32} />{team.city} {team.name}</Link>
          <h1>Starting lineup</h1>
          <div className="ro-toggle" role="tablist" aria-label="Side of the ball">
            {(['offense', 'defense'] as Side[]).map((s) => (
              <button key={s} type="button" role="tab" aria-selected={side === s} onClick={() => { setSide(s); setOpen(null); }}>
                {s === 'offense' ? 'Offense' : 'Defense'}
              </button>
            ))}
          </div>
        </div>
        <SignInGate feature="roster" preview={<GatePreview shape="field" />}>
        {!rosters && !error && <p className="gr-muted">Loading the depth chart…</p>}
        {error && <p className="gr-muted">Couldn't load the roster right now.</p>}
        {rosters && (
          <div className="ro-layout">
            <div className="ro-field" style={{ ['--tc' as string]: c.primary }}>
              <div className="ro-los" aria-hidden="true" />
              {placed.map((p) => {
                const info = rosters.players[p.id];
                return (
                  <button key={p.id} type="button" className={`ro-dot${open === p.id ? ' on' : ''}`}
                    style={{ left: `${p.x}%`, top: `${p.y}%` }} onClick={() => setOpen(p.id)}
                    aria-label={`${p.pos} ${p.name}`}>
                    <span className="ro-pos">{p.pos}</span>
                    <span className="ro-name">{lastName(p.name)}</span>
                    {info?.injury && <span className="ro-inj" aria-label={info.injury.status}>+</span>}
                  </button>
                );
              })}
            </div>
            {open && rosters.players[open]
              ? <PlayerSheet id={open} player={rosters.players[open]} onClose={() => setOpen(null)} />
              : <aside className="ro-sheet ro-hint"><p>Tap a player to see what his position does, where he ranks, and his injury status.</p>
                  <p className="gr-muted">From the latest depth chart · updated {new Date(rosters.updated).toLocaleDateString()}</p></aside>}
          </div>
        )}
        </SignInGate>
      </main>
      <Footer />
    </div>
  );
}
