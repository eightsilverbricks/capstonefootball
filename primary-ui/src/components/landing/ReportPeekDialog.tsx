import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Quote, ShieldAlert } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import TeamLogo from '@/components/TeamLogo';
import WinProbBar from '@/components/game-report/WinProbBar';
import { openAuthDialog } from '@/hooks/useAuthDialog';
import { ApiPrediction, getTopFactors } from '@/types/prediction';

interface ReportPeekDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** A real game from the dataset — never a mock. Null while predictions load. */
  game: ApiPrediction | null;
}

const STATUS_COLORS: Record<string, string> = {
  DECISIVE: 'var(--status-decisive)',
  MODERATE: 'var(--status-moderate)',
  MINOR: 'var(--status-minor)',
  NEUTRAL: 'var(--status-neutral)',
};

/**
 * A real Clark Report, in miniature, as a pop-up on the landing page — the
 * "show, don't tell" moment. Everything in here is genuine model output for an
 * actual 2024 game: the probabilities, the factor headlines, the upset path.
 *
 * The full report lives on the game page; this is the trailer.
 */
const ReportPeekDialog: React.FC<ReportPeekDialogProps> = ({ open, onOpenChange, game }) => {
  if (!game) return null;

  const factors = getTopFactors(game, 3);
  const gamePath = `/game/${game.season}/${game.week}/${game.away_team}/${game.home_team}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-lg max-h-[85vh] overflow-y-auto border"
        style={{ background: 'var(--surface)', borderColor: 'var(--border-default)' }}
      >
        <div className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-[0.22em]" style={{ color: 'var(--accent-gold)' }}>
            The Clark Report · {game.week_label ?? `Week ${game.week}`}
          </span>
          <DialogTitle className="flex items-center gap-2.5">
            <TeamLogo abbr={game.away_team} size="sm" />
            <span
              className="font-bold"
              style={{ fontFamily: 'var(--font-display)', fontSize: '1.35rem', color: 'var(--text-primary)' }}
            >
              {game.away_team} at {game.home_team}
            </span>
            <TeamLogo abbr={game.home_team} size="sm" />
          </DialogTitle>
          <DialogDescription className="text-xs" style={{ color: 'var(--text-muted)' }}>
            A real report from the 2024 season — this is exactly what you get on every game.
          </DialogDescription>
        </div>

        <div className="mt-2">
          <WinProbBar
            awayTeam={game.away_team}
            homeTeam={game.home_team}
            awayProb={game.away_win_prob}
            homeProb={game.home_win_prob}
            predictedWinner={game.predicted_winner}
          />
        </div>

        {game.football_story && (
          <p
            className="text-sm leading-relaxed rounded-lg p-4 relative"
            style={{ background: 'var(--bg)', color: 'var(--text-secondary)' }}
          >
            <Quote
              className="w-3.5 h-3.5 absolute top-3 left-3 opacity-40"
              style={{ color: 'var(--accent-gold)' }}
              aria-hidden="true"
            />
            <span className="block pl-5">{game.football_story}</span>
          </p>
        )}

        {factors.length > 0 && (
          <div className="flex flex-col gap-2">
            <h3 className="text-[10px] uppercase tracking-[0.2em]" style={{ color: 'var(--text-muted)' }}>
              What Clark weighted
            </h3>
            {factors.map((factor) => (
              <div
                key={factor.name}
                className="rounded-lg p-3.5"
                style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)' }}
              >
                <div className="flex items-center justify-between gap-3 mb-1.5">
                  <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {factor.name}
                  </span>
                  <span
                    className="text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded"
                    style={{
                      color: STATUS_COLORS[factor.status] ?? 'var(--text-muted)',
                      border: `1px solid ${STATUS_COLORS[factor.status] ?? 'var(--border-default)'}`,
                    }}
                  >
                    {factor.status}
                  </span>
                </div>
                {factor.headline && (
                  <p
                    className="text-sm font-semibold leading-snug mb-1"
                    style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
                  >
                    {factor.headline}
                  </p>
                )}
                {factor.explanation && (
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
                    {factor.explanation}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {game.risk_factor && (
          <div
            className="rounded-lg p-3.5 flex gap-2.5"
            style={{ background: 'var(--stake-negative-dim)', border: '1px solid rgba(248,113,113,0.25)' }}
          >
            <ShieldAlert
              className="w-4 h-4 shrink-0 mt-0.5"
              style={{ color: 'var(--stake-negative)' }}
              aria-hidden="true"
            />
            <div>
              <p
                className="text-[10px] uppercase tracking-[0.2em] mb-1"
                style={{ color: 'var(--stake-negative)' }}
              >
                How it goes wrong
              </p>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {game.risk_factor}
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          <button
            type="button"
            onClick={() => {
              onOpenChange(false);
              openAuthDialog('signup');
            }}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold uppercase tracking-wide"
            style={{ background: 'var(--accent-gold)', color: '#111' }}
          >
            Get every game <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>
          <Link
            to={gamePath}
            onClick={() => onOpenChange(false)}
            className="flex-1 inline-flex items-center justify-center rounded-lg px-4 py-3 text-sm font-semibold uppercase tracking-wide no-underline"
            style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}
          >
            Open the full report
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReportPeekDialog;
