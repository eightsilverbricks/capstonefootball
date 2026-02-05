import React, { useState } from 'react';
import { Game, Player } from '@/data/nflData';
import { X, MapPin, Cloud, Thermometer, Calendar } from 'lucide-react';
import FootballField from './FootballField';
import PlayerComparison from './PlayerComparison';
import PredictionKeys from './PredictionKeys';
import AIAnalysis from './AIAnalysis';
import CommunityPredictions from './CommunityPredictions';

interface GameDetailModalProps {
  game: Game;
  onClose: () => void;
  onOpenAuth: () => void;
}

interface Position {
  id: string;
  name: string;
  x: number;
  y: number;
  side: 'offense' | 'defense';
}

const GameDetailModal: React.FC<GameDetailModalProps> = ({ game, onClose, onOpenAuth }) => {
  const [activeTab, setActiveTab] = useState<'field' | 'keys' | 'community'>('field');
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [selectedPlayer1, setSelectedPlayer1] = useState<Player | null>(game.keyPlayers.home[0] || null);
  const [selectedPlayer2, setSelectedPlayer2] = useState<Player | null>(game.keyPlayers.away[0] || null);

  const handlePlayerClick = (player: Player | null, position: Position) => {
    setSelectedPosition(position);
    if (position.side === 'offense') {
      setSelectedPlayer1(player || game.keyPlayers.home[0] || null);
    } else {
      setSelectedPlayer2(player || game.keyPlayers.away[0] || null);
    }
  };

  const tabs = [
    { id: 'field', label: 'Field View' },
    { id: 'keys', label: '13 Keys' },
    { id: 'community', label: 'Community' },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative min-h-screen flex items-start justify-center p-4 pt-8">
        <div className="relative w-full max-w-7xl bg-slate-900 rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="relative">
            {/* Stadium Background */}
            <div className="absolute inset-0">
              <img
                src={game.stadiumImage}
                alt={game.stadium}
                className="w-full h-full object-cover opacity-30"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-slate-900/50 via-slate-900/80 to-slate-900" />
            </div>

            {/* Header Content */}
            <div className="relative p-6">
              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 bg-slate-800/80 hover:bg-slate-700 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>

              {/* Game Info */}
              <div className="flex items-center gap-2 text-sm text-slate-400 mb-4">
                <Calendar className="w-4 h-4" />
                <span>Week {game.week}</span>
                <span className="mx-2">•</span>
                <span>{game.gameTime}</span>
              </div>

              {/* Teams */}
              <div className="flex items-center justify-center gap-8">
                {/* Away Team */}
                <div className="text-center">
                  <div
                    className="w-20 h-20 rounded-2xl flex items-center justify-center font-bold text-white text-2xl mx-auto shadow-lg"
                    style={{ backgroundColor: game.awayTeam.primaryColor }}
                  >
                    {game.awayTeam.abbreviation}
                  </div>
                  <h3 className="text-xl font-bold text-white mt-3">{game.awayTeam.city}</h3>
                  <p className="text-slate-400">{game.awayTeam.name}</p>
                  <p className="text-sm text-slate-500">{game.awayTeam.record}</p>
                  <p className="text-2xl font-bold mt-2" style={{ color: game.awayTeam.primaryColor }}>
                    {game.awayWinProbability}%
                  </p>
                </div>

                {/* VS */}
                <div className="text-center">
                  <div className="text-4xl font-bold text-slate-600">@</div>
                  <div className="text-sm text-slate-500 mt-2">
                    Spread: {game.spread > 0 ? '+' : ''}{game.spread}
                  </div>
                  <div className="text-sm text-slate-500">
                    O/U: {game.overUnder}
                  </div>
                </div>

                {/* Home Team */}
                <div className="text-center">
                  <div
                    className="w-20 h-20 rounded-2xl flex items-center justify-center font-bold text-white text-2xl mx-auto shadow-lg"
                    style={{ backgroundColor: game.homeTeam.primaryColor }}
                  >
                    {game.homeTeam.abbreviation}
                  </div>
                  <h3 className="text-xl font-bold text-white mt-3">{game.homeTeam.city}</h3>
                  <p className="text-slate-400">{game.homeTeam.name}</p>
                  <p className="text-sm text-slate-500">{game.homeTeam.record}</p>
                  <p className="text-2xl font-bold mt-2" style={{ color: game.homeTeam.primaryColor }}>
                    {game.homeWinProbability}%
                  </p>
                </div>
              </div>

              {/* Stadium & Weather */}
              <div className="flex items-center justify-center gap-6 mt-6 text-sm text-slate-400">
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {game.stadium}
                </div>
                <div className="flex items-center gap-1">
                  <Cloud className="w-4 h-4" />
                  {game.weather}
                </div>
                <div className="flex items-center gap-1">
                  <Thermometer className="w-4 h-4" />
                  {game.temperature}°F
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-slate-700">
            <div className="flex">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 py-3 text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-400/5'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {activeTab === 'field' && (
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Left: Field + Player Comparison */}
                <div className="space-y-6">
                  <FootballField
                    homeTeamColor={game.homeTeam.primaryColor}
                    awayTeamColor={game.awayTeam.primaryColor}
                    homePlayers={game.keyPlayers.home}
                    awayPlayers={game.keyPlayers.away}
                    onPlayerClick={handlePlayerClick}
                    selectedPosition={selectedPosition}
                  />
                  <PlayerComparison
                    player1={selectedPlayer1}
                    player2={selectedPlayer2}
                    team1Color={game.homeTeam.primaryColor}
                    team2Color={game.awayTeam.primaryColor}
                  />
                </div>

                {/* Right: AI Analysis */}
                <div>
                  <AIAnalysis game={game} />
                </div>
              </div>
            )}

            {activeTab === 'keys' && (
              <div className="grid lg:grid-cols-2 gap-6">
                <PredictionKeys
                  keys={game.predictionKeys}
                  homeTeamName={game.homeTeam.city}
                  awayTeamName={game.awayTeam.city}
                  homeTeamColor={game.homeTeam.primaryColor}
                  awayTeamColor={game.awayTeam.primaryColor}
                />
                <AIAnalysis game={game} />
              </div>
            )}

            {activeTab === 'community' && (
              <div className="grid lg:grid-cols-2 gap-6">
                <CommunityPredictions
                  game={game}
                  onOpenAuth={onOpenAuth}
                />
                <AIAnalysis game={game} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameDetailModal;
