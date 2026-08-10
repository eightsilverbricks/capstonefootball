import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiPrediction } from '@/types/prediction';
import { getVegasPick, getFanPick, getPrePickTeaser } from '@/lib/threeWaySignal';
import { getPickReading } from '@/lib/pickReading';
import { formatKickoff } from '@/lib/slate';
import { useFanSentiment } from '@/hooks/useFanSentiment';
import { useGamePick } from '@/hooks/useGamePick';
import { useAuth } from '@/hooks/useAuth';
import { stakePreview, indexConfidenceFromScore } from '@/competition/scoring';
import TeamLogo from './TeamLogo';
import ConvictionSlider from './ConvictionSlider';
import ThreeWayCompare from './game-report/ThreeWayCompare';

interface GameCardProps {
  game: ApiPrediction;
  onClick?: () => void;
  isSelected?: boolean;
}

const GameCard: React.FC<GameCardProps> = ({ game, isSelected = false }) => {
  const navigate = useNavigate();
  const { isSignedIn } = useAuth();

  // The pick interaction is shared with the week's lead card — see
  // hooks/useGamePick.ts. This component owns presentation only.
  const { key, userPick, hasPicked, draft, setDraft, hasPosition, lock, changePick, stake } =
    useGamePick(game);

  // Memoized so the sentiment store sees a stable request, not a new array each
  // render. One card asks for one game; the store batches the whole grid.
  const sentimentKeys = useMemo(() => [key], [key]);
  const { sentiment } = useFanSentiment(sentimentKeys);

  const handleOpenReport = () => {
    navigate(`/game/${game.season}/${game.week}/${game.away_team}/${game.home_team}`);
  };

  const vegas = getVegasPick(game);
  const fan = getFanPick(game, sentiment);
  const kickoff = formatKickoff(game.gametime);

  return (
    <article
      role={hasPicked ? 'button' : undefined}
      tabIndex={hasPicked ? 0 : undefined}
      onClick={hasPicked ? handleOpenReport : undefined}
      onKeyDown={
        hasPicked
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleOpenReport();
              }
            }
          : undefined
      }
      aria-label={hasPicked ? `${game.away_team} at ${game.home_team} — open Clark Report` : undefined}
      className={`relative rounded overflow-hidden transition-transform duration-150 group ${hasPicked ? 'cursor-pointer hover:-translate-y-0.5' : ''}`}
      style={{
        background: 'var(--surface)',
        border: `1px solid ${isSelected ? 'var(--border-emphasis)' : 'var(--border-subtle)'}`,
      }}
    >
      <div className="h-0.5 w-full" style={{ background: 'var(--border-emphasis)' }} />

      <div className="p-5 flex flex-col gap-4">
        {/* The slate section above already names the window, so the card shows
            the exact kickoff — the one detail that still varies inside a
            window (4:05 vs 4:25) and the thing people scan for. */}
        <div className="flex items-baseline justify-between">
          <span
            className="text-[10px] uppercase tracking-widest tabular-nums"
            style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}
          >
            {kickoff || game.week_label || `Week ${game.week}`}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <TeamLogo abbr={game.away_team} size="sm" />
            <p
              className="font-bold leading-none truncate"
              style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--text-primary)' }}
            >
              {game.away_team}
            </p>
          </div>
          <span className="text-[10px] uppercase tracking-widest shrink-0" style={{ color: 'var(--text-muted)' }}>
            at
          </span>
          <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
            <p
              className="font-bold leading-none truncate text-right"
              style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--text-primary)' }}
            >
              {game.home_team}
            </p>
            <TeamLogo abbr={game.home_team} size="sm" />
          </div>
        </div>

        {!hasPicked ? (
          <div className="flex flex-col gap-3 pt-1" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm italic leading-snug" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-secondary)' }}>
              {getPrePickTeaser(game, vegas, fan)}
            </p>
            <span className="text-xs uppercase tracking-widest" style={{ color: 'var(--accent-gold)' }}>
              Drag toward your pick
            </span>

            <ConvictionSlider
              awayTeam={game.away_team}
              homeTeam={game.home_team}
              pick={draft}
              onChange={setDraft}
            />

            <div className="flex items-center justify-between gap-3">
              <span
                className="text-xs tabular-nums"
                style={{ color: hasPosition ? 'var(--text-secondary)' : 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}
              >
                {stakePreview(draft)}
              </span>
              <button
                type="button"
                onClick={lock}
                disabled={!hasPosition}
                className="px-4 py-2 rounded text-xs font-semibold uppercase tracking-wide transition-colors disabled:cursor-not-allowed"
                style={{
                  background: hasPosition ? 'var(--accent-gold)' : 'var(--surface-raised)',
                  color: hasPosition ? '#111' : 'var(--text-muted)',
                }}
              >
                {!hasPosition
                  ? 'Pick a side'
                  : isSignedIn
                    ? `Lock in ${draft.team}`
                    : `Lock in ${draft.team} — free account`}
              </button>
            </div>

            <button
              type="button"
              onClick={handleOpenReport}
              className="self-start text-[10px] uppercase tracking-widest transition-colors hover:text-white"
              style={{ color: 'var(--text-muted)' }}
            >
              Read the evidence first →
            </button>
          </div>
        ) : (
          <>
            <ThreeWayCompare
              rows={[
                { label: 'You', team: userPick!.team, pct: userPick!.confidence },
                { label: 'Clark', team: game.predicted_winner, pct: indexConfidenceFromScore(game.confidence_score) },
                ...(vegas ? [{ label: 'Vegas', team: vegas.team, pct: vegas.prob }] : []),
                // No row at all until real accounts have picked this game.
                ...(fan ? [{ label: 'Fans', team: fan.team, pct: fan.prob, sampleSize: fan.picks }] : []),
              ]}
              size="compact"
              winner={game.actual_winner}
            />

            <p className="text-xs leading-snug" style={{ color: 'var(--text-tertiary)' }}>
              {getPickReading(game, userPick!, vegas, fan)}
            </p>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] uppercase tracking-widest tabular-nums" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                ±{stake} pts on the line
              </span>
              <div className="flex items-center gap-3">
                {/* A pick must stay changeable — one stray drag shouldn't
                    commit someone's season with no way back. Matches the game
                    page, which already lets you re-open the slider. Stops
                    propagation so it doesn't also open the report behind it. */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    changePick();
                  }}
                  className="text-[10px] uppercase tracking-widest transition-colors hover:text-white"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Change
                </button>
                <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                  View evidence →
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </article>
  );
};

export default GameCard;
