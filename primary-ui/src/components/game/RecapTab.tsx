import { useMemo } from 'react';
import type { LivePlay } from '@/data/liveRepository';
import { getTeam } from '@/data/teams';
import { getPredictedProbability } from '@/types/prediction';
import { isFinal } from '@/lib/gameStatus';
import { decidingPlays, factorTracker, type LiveAware } from '@/lib/live';
import ShareButtons from './ShareButtons';

const nick = (t: string) => getTeam(t)?.name ?? t;
const pct = (p: number) => Math.round(p * 100);

/** After the game: final, Clark's report card, the 5 plays that decided it, your result, share (§4 Tab 4). */
export default function RecapTab({ game, plays, userPick }: {
  game: LiveAware;
  plays: LivePlay[];
  userPick: { team: string; confidence: number } | null;
}) {
  const card = useMemo(() => factorTracker(game, plays), [game, plays]);
  const swings = useMemo(() => decidingPlays(plays, 5), [plays]);

  if (!isFinal(game)) {
    return (
      <section className="gv-panel">
        <div className="gv-pb gr-muted">The recap appears after the final whistle: Clark's report card, the 5 plays that decided it, and how your pick did.</div>
      </section>
    );
  }

  const winner = game.actual_winner;
  const clarkRight = winner === game.predicted_winner;
  const youRight = userPick && winner ? userPick.team === winner : null;
  const graded = card.filter((c) => c.state !== 'waiting');
  const hits = graded.filter((c) => c.state === 'yes').length;

  return (
    <>
      <section className="gv-panel">
        <div className="gv-pb">
          <div className="gp-kicker">Final</div>
          <h2 className="gv-recap-score">{game.away_team} {game.away_score} – {game.home_score} {game.home_team}</h2>
          <div className="gv-recap-row">
            <span>Clark had {game.predicted_winner} {pct(getPredictedProbability(game))}%</span>
            <span className={`gr-chip ${clarkRight ? 'win' : 'loss'}`}>{winner ? (clarkRight ? 'Right' : 'Wrong') : 'Tie'}</span>
          </div>
          {userPick && (
            <div className="gv-recap-row">
              <span>You had {userPick.team} {pct(userPick.confidence)}%</span>
              <span className={`gr-chip ${youRight ? 'win' : 'loss'}`}>{winner ? (youRight ? 'Correct' : 'Wrong') : 'Tie'}</span>
            </div>
          )}
          <ShareButtons game={game} userPick={userPick} />
        </div>
      </section>

      {plays.length > 0 && (
        <section className="gv-panel">
          <div className="gv-ph">
            <h2>Clark's report card</h2>
            {graded.length > 0 && <span className="gr-muted">{hits} of {graded.length} calls held up</span>}
          </div>
          <div className="gv-pb rc-card">
            {card.map((c) => (
              <div className="rc-row lv-track" key={c.claim}>
                <span className={`ic ${c.state}`} style={{ display: 'grid', placeItems: 'center', width: 26, height: 26, borderRadius: '50%', fontWeight: 900,
                  background: c.state === 'yes' ? 'color-mix(in srgb, var(--win) 18%, var(--paper))' : c.state === 'no' ? 'color-mix(in srgb, var(--loss) 16%, var(--paper))' : 'var(--chip)',
                  color: c.state === 'yes' ? 'var(--win)' : c.state === 'no' ? 'var(--loss)' : 'var(--ink-3)' }}>
                  {c.state === 'yes' ? '✓' : c.state === 'no' ? '✗' : '–'}
                </span>
                <div><b>{c.claim}</b><span className="gr-muted" style={{ display: 'block', fontSize: 13 }}>{c.now}</span></div>
              </div>
            ))}
          </div>
        </section>
      )}

      {swings.length > 0 && (
        <section className="gv-panel">
          <div className="gv-ph"><h2>The 5 plays that decided it</h2><span className="gr-muted">Biggest win % swings</span></div>
          <div className="gv-pb">
            {swings.map(({ play, swing }) => {
              const toward = swing > 0 ? game.home_team : game.away_team;
              return (
                <div className="rc-swing" key={play.play_id}>
                  <span className="sw" style={{ color: toward === game.predicted_winner ? 'var(--win)' : 'var(--loss)' }}>
                    {swing > 0 ? '+' : '−'}{pct(Math.abs(swing))}
                  </span>
                  <span><b>{play.note ?? `${nick(toward)} swing`}</b><span className="gr-muted" style={{ display: 'block', fontSize: 12.5 }}>{play.text}</span></span>
                  <span className="gr-muted">Q{play.quarter} {play.clock}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </>
  );
}
