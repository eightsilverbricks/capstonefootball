import PlayerLink from '@/components/PlayerLink';
import React from 'react';
import { InjuryNote, KeyPlayer } from '@/types/prediction';
import PlayerHeadshot from '@/components/PlayerHeadshot';

const STATUS_COLOR: Record<InjuryNote['status'], string> = {
  Out: 'var(--stake-negative)',
  Doubtful: 'var(--stake-negative)',
  Questionable: 'var(--status-moderate)',
};

interface KeyPlayersPanelProps {
  awayTeam: string;
  homeTeam: string;
  players: KeyPlayer[];
  injuries: InjuryNote[];
}

/** Season leaders for both teams, then this week's injury report. */
const KeyPlayersPanel: React.FC<KeyPlayersPanelProps> = ({ awayTeam, homeTeam, players, injuries }) => {
  if (players.length === 0 && injuries.length === 0) return null;

  return (
    <section
      aria-labelledby="key-players-heading"
      className="rounded-lg p-4"
      style={{ background: 'var(--surface)', border: '1px solid var(--border-default)' }}
    >
      <h3 id="key-players-heading" className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
        Key players
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
        {[awayTeam, homeTeam].map((team) => {
          const teamPlayers = players.filter((p) => p.team === team);
          if (teamPlayers.length === 0) return null;
          return (
            <ul key={team} className="flex flex-col gap-2.5" aria-label={`${team} key players`}>
              {teamPlayers.map((p) => (
                <li key={`${p.team}-${p.name}-${p.role}`} className="flex items-center gap-3">
                  <PlayerHeadshot espnId={p.espn_id} name={p.name} teamAbbr={p.team} size={36} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                      <PlayerLink name={p.name} team={p.team} /> <span style={{ color: 'var(--text-muted)' }}>{p.position} · {p.team}</span>
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{p.stat_line}</p>
                  </div>
                </li>
              ))}
            </ul>
          );
        })}
      </div>

      {injuries.length > 0 && (
        <>
          <h3 className="text-sm font-semibold mt-5 mb-2" style={{ color: 'var(--text-primary)' }}>
            Injuries
          </h3>
          <ul className="flex flex-col gap-1.5">
            {injuries.map((n) => (
              <li key={`${n.team}-${n.name}`} className="flex items-baseline justify-between gap-3 text-sm">
                <span className="min-w-0 truncate" style={{ color: 'var(--text-secondary)' }}>
                  <PlayerLink name={n.name} team={n.team} /> <span style={{ color: 'var(--text-muted)' }}>{n.position} · {n.team}{n.injury ? ` · ${n.injury}` : ''}</span>
                </span>
                <span className="shrink-0 text-xs font-medium" style={{ color: STATUS_COLOR[n.status] }}>
                  {n.status}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
};

export default KeyPlayersPanel;
