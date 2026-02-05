import React, { useState } from 'react';
import { Player, fieldImage } from '@/data/nflData';

interface Position {
  id: string;
  name: string;
  x: number;
  y: number;
  side: 'offense' | 'defense';
}

interface FootballFieldProps {
  homeTeamColor: string;
  awayTeamColor: string;
  homePlayers: Player[];
  awayPlayers: Player[];
  onPlayerClick: (player: Player | null, position: Position) => void;
  selectedPosition: Position | null;
}

const offensePositions: Position[] = [
  { id: 'qb', name: 'QB', x: 50, y: 65, side: 'offense' },
  { id: 'rb', name: 'RB', x: 50, y: 75, side: 'offense' },
  { id: 'wr1', name: 'WR', x: 15, y: 55, side: 'offense' },
  { id: 'wr2', name: 'WR', x: 85, y: 55, side: 'offense' },
  { id: 'te', name: 'TE', x: 70, y: 55, side: 'offense' },
  { id: 'lt', name: 'LT', x: 35, y: 55, side: 'offense' },
  { id: 'lg', name: 'LG', x: 42, y: 55, side: 'offense' },
  { id: 'c', name: 'C', x: 50, y: 55, side: 'offense' },
  { id: 'rg', name: 'RG', x: 58, y: 55, side: 'offense' },
  { id: 'rt', name: 'RT', x: 65, y: 55, side: 'offense' },
  { id: 'slot', name: 'SLOT', x: 25, y: 58, side: 'offense' },
];

const defensePositions: Position[] = [
  { id: 'de1', name: 'DE', x: 30, y: 45, side: 'defense' },
  { id: 'dt1', name: 'DT', x: 42, y: 45, side: 'defense' },
  { id: 'dt2', name: 'DT', x: 58, y: 45, side: 'defense' },
  { id: 'de2', name: 'DE', x: 70, y: 45, side: 'defense' },
  { id: 'lb1', name: 'LB', x: 30, y: 35, side: 'defense' },
  { id: 'mlb', name: 'MLB', x: 50, y: 35, side: 'defense' },
  { id: 'lb2', name: 'LB', x: 70, y: 35, side: 'defense' },
  { id: 'cb1', name: 'CB', x: 15, y: 30, side: 'defense' },
  { id: 'cb2', name: 'CB', x: 85, y: 30, side: 'defense' },
  { id: 'ss', name: 'SS', x: 40, y: 20, side: 'defense' },
  { id: 'fs', name: 'FS', x: 60, y: 20, side: 'defense' },
];

const FootballField: React.FC<FootballFieldProps> = ({
  homeTeamColor,
  awayTeamColor,
  homePlayers,
  awayPlayers,
  onPlayerClick,
  selectedPosition,
}) => {
  const [hoveredPosition, setHoveredPosition] = useState<string | null>(null);

  const getPlayerForPosition = (position: Position): Player | null => {
    const players = position.side === 'offense' ? homePlayers : awayPlayers;
    // Match QB to QB position, etc.
    if (position.id === 'qb') {
      return players.find(p => p.position === 'QB') || null;
    }
    return null;
  };

  const renderPosition = (position: Position, isOffense: boolean) => {
    const player = getPlayerForPosition(position);
    const isSelected = selectedPosition?.id === position.id;
    const isHovered = hoveredPosition === position.id;
    const color = isOffense ? homeTeamColor : awayTeamColor;

    return (
      <div
        key={position.id}
        className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-200 ${
          isSelected ? 'scale-125 z-20' : isHovered ? 'scale-110 z-10' : 'z-0'
        }`}
        style={{
          left: `${position.x}%`,
          top: `${position.y}%`,
        }}
        onClick={() => onPlayerClick(player, position)}
        onMouseEnter={() => setHoveredPosition(position.id)}
        onMouseLeave={() => setHoveredPosition(null)}
      >
        {/* Player Circle */}
        <div
          className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center font-bold text-white text-xs shadow-lg transition-all ${
            isSelected ? 'ring-4 ring-cyan-400 ring-offset-2 ring-offset-slate-900' : ''
          }`}
          style={{ backgroundColor: color }}
        >
          {position.name}
        </div>

        {/* Player Name Tooltip */}
        {(isHovered || isSelected) && player && (
          <div className="absolute top-full mt-1 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap shadow-xl border border-slate-600 z-30">
            {player.name}
          </div>
        )}

        {/* Pulse Animation for Key Players */}
        {player && (
          <div
            className="absolute inset-0 rounded-full animate-ping opacity-30"
            style={{ backgroundColor: color }}
          />
        )}
      </div>
    );
  };

  return (
    <div className="relative w-full aspect-video bg-slate-900 rounded-xl overflow-hidden border border-slate-700">
      {/* Field Background */}
      <img
        src={fieldImage}
        alt="Football Field"
        className="absolute inset-0 w-full h-full object-cover opacity-80"
      />

      {/* Field Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-slate-900/50" />

      {/* Yard Lines Overlay */}
      <div className="absolute inset-0">
        {/* End Zone Labels */}
        <div className="absolute left-4 top-1/2 transform -translate-y-1/2 -rotate-90 text-white/20 font-bold text-2xl tracking-widest">
          AWAY
        </div>
        <div className="absolute right-4 top-1/2 transform -translate-y-1/2 rotate-90 text-white/20 font-bold text-2xl tracking-widest">
          HOME
        </div>
      </div>

      {/* Offense Positions (Home Team) */}
      {offensePositions.map(pos => renderPosition(pos, true))}

      {/* Defense Positions (Away Team) */}
      {defensePositions.map(pos => renderPosition(pos, false))}

      {/* Line of Scrimmage */}
      <div className="absolute left-0 right-0 top-1/2 h-1 bg-yellow-400/50" />

      {/* Legend */}
      <div className="absolute bottom-2 left-2 flex items-center gap-4 text-xs text-white/70">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: homeTeamColor }} />
          <span>Offense</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: awayTeamColor }} />
          <span>Defense</span>
        </div>
      </div>

      {/* Instructions */}
      <div className="absolute bottom-2 right-2 text-xs text-white/50">
        Click a player to compare stats
      </div>
    </div>
  );
};

export default FootballField;
