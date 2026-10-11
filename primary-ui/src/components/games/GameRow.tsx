import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { ApiPrediction } from '@/types/prediction';
import { getEspnLogoUrl, getTeamColors } from '@/data/nflData';
import { getTeam } from '@/data/teams';
import { useGamePick } from '@/hooks/useGamePick';
import { useAuth } from '@/hooks/useAuth';
import { isFinal, isPickingClosed } from '@/lib/gameStatus';
import { formatKickoff } from '@/lib/slate';
import { confetti, toast } from '@/lib/fx';
import SparkSlider from '@/components/picks/SparkSlider';

const QUICK_PICK_CONFIDENCE = 0.65;
const pct = (p: number) => Math.round(p * 100);
const nick = (abbr: string) => getTeam(abbr)?.name ?? abbr;

function TeamLine({ team, record, score, dim }: { team: string; record?: string | null; score?: number | null; dim: boolean }) {
  return (
    <div className={`gr-team${dim ? ' is-dim' : ''}`}>
      <img src={getEspnLogoUrl(team)} alt="" width={26} height={26} loading="lazy" />
      <span className="gr-name">{nick(team)}</span>
      {record && <span className="gr-rec">{record}</span>}
      {score != null && <span className="gr-score">{score}</span>}
    </div>
  );
}

/** One game as a scoreboard row: status, teams, Clark's pick, your pick (inline slider). */
export default function GameRow({ game }: { game: ApiPrediction }) {
  const navigate = useNavigate();
  const pick = useGamePick(game);
  const { isSignedIn } = useAuth();
  const [open, setOpen] = useState(false);
  const final = isFinal(game);
  const closed = isPickingClosed(game);
  const winner = final ? game.actual_winner ?? null : null;
  const url = `/game/${game.season}/${game.week}/${game.away_team}/${game.home_team}`;
  const clarkProb = game.predicted_winner === game.home_team ? game.home_win_prob : game.away_win_prob;
  const homePct = pct(game.home_win_prob);

  const celebrate = (team: string, confidence: number, at: { x: number; y: number }) => {
    pick.lockAs({ team, confidence });
    // Signed out, lockAs stashes the pick and opens sign-up; it's saved once the account exists.
    if (!isSignedIn) return;
    confetti([getTeamColors(team).primary, '#ffffff', getTeamColors(team).secondary], at.x, at.y);
    toast(`Locked: ${nick(team)} · ${pct(confidence)}%. Let's see if you beat Clark.`, getEspnLogoUrl(team));
    setOpen(false);
  };

  const startPick = (team: string) => {
    pick.setDraft({ team, confidence: QUICK_PICK_CONFIDENCE });
    setOpen(true);
  };

  let yours: React.ReactNode;
  if (pick.userPick) {
    const result = winner ? (pick.userPick.team === winner ? 'win' : 'loss') : null;
    yours = (
      <>
        <span>You: <b>{pick.userPick.team} {pct(pick.userPick.confidence)}%</b></span>
        {result && <span className={`gr-chip ${result}`}>{result === 'win' ? 'Correct' : 'Wrong'}</span>}
        {!closed && !result && <button type="button" className="gr-link" onClick={() => { pick.changePick(); setOpen(true); }}>Change</button>}
      </>
    );
  } else if (closed) {
    yours = <span className="gr-muted">No pick</span>;
  } else {
    yours = [game.away_team, game.home_team].map((t) => (
      <button key={t} type="button" className="gr-pk" style={{ ['--tc' as string]: getTeamColors(t).primary }} onClick={() => startPick(t)}>
        <img src={getEspnLogoUrl(t)} alt="" width={18} height={18} />{t}
      </button>
    ));
  }

  return (
    <div className={`gr${open ? ' is-open' : ''}`}>
      <div
        className="gr-main"
        onClick={(e) => { if (!(e.target as HTMLElement).closest('button, a')) navigate(url); }}
      >
        <div className="gr-when">
          <b>{final ? 'Final' : formatKickoff(game.gametime)}</b>
        </div>
        <div className="gr-teams">
          <TeamLine team={game.away_team} record={game.away_season_record} score={final ? game.away_score : null} dim={Boolean(winner && winner !== game.away_team)} />
          <TeamLine team={game.home_team} record={game.home_season_record} score={final ? game.home_score : null} dim={Boolean(winner && winner !== game.home_team)} />
        </div>
        <div className="gr-clark">
          <span className="clark-tag"><img src="/brand/clark-logo.jpg" alt="" />{game.predicted_winner} {pct(clarkProb)}%</span>
          <div className="gr-bar" aria-hidden="true">
            <span style={{ width: `${100 - homePct}%`, background: getTeamColors(game.away_team).primary }} />
            <span style={{ width: `${homePct}%`, background: getTeamColors(game.home_team).primary }} />
          </div>
        </div>
        <div className="gr-you">{yours}</div>
        <Link to={url} className="gr-open" aria-label={`Open ${game.away_team} at ${game.home_team}`}><ChevronRight size={18} /></Link>
      </div>
      {open && !closed && (
        <div className="gr-picker">
          <SparkSlider
            away={game.away_team}
            home={game.home_team}
            awayName={nick(game.away_team)}
            homeName={nick(game.home_team)}
            value={pick.draft}
            onChange={pick.setDraft}
            onRelease={(p, at) => celebrate(p.team, p.confidence, at)}
          />
          <div className="gr-picker-actions">
            <button type="button" className="pill pill-line" onClick={() => setOpen(false)}>Cancel</button>
            <button
              type="button"
              className="pill pill-red"
              disabled={!pick.hasPosition}
              onClick={(e) => celebrate(pick.draft.team, pick.draft.confidence, { x: e.clientX, y: e.clientY })}
            >
              Lock pick
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
