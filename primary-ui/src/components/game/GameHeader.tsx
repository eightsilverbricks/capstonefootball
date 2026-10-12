import { ApiPrediction, getPredictedProbability } from '@/types/prediction';
import { getEspnLogoUrl, getTeamColors } from '@/data/nflData';
import { getTeam } from '@/data/teams';
import { stadiumImageUrl } from '@/data/stadiumImages';
import { isFinal } from '@/lib/gameStatus';
import { formatKickoff } from '@/lib/slate';
import { TeamPick, FanPick } from '@/lib/threeWaySignal';

interface GameHeaderProps {
  game: ApiPrediction;
  vegas: TeamPick | null;
  fan: FanPick | null;
}

const pct = (p: number) => Math.round(p * 100);
const MIN_FAN_PICKS = 25;

function Side({ team, record, score, align }: { team: string; record?: string | null; score: number | null; align: 'left' | 'right' }) {
  const info = getTeam(team);
  const text = (
    <div className="gh-name">
      <span>{info?.city ?? team}{record ? ` · ${record}` : ''}</span>
      <b>{info?.name ?? team}</b>
    </div>
  );
  const scoreEl = score != null ? <div className="gh-score">{score}</div> : null;
  return (
    <div className={`gh-side gh-${align}`}>
      {align === 'left' ? <><img src={getEspnLogoUrl(team)} alt="" width={72} height={72} />{text}{scoreEl}</> : <>{scoreEl}{text}<img src={getEspnLogoUrl(team)} alt="" width={72} height={72} /></>}
    </div>
  );
}

/** Scorebug over the home stadium photo, washed in both teams' colors, with Clark / line / fans. */
export default function GameHeader({ game, vegas, fan }: GameHeaderProps) {
  const final = isFinal(game);
  const a = getTeamColors(game.away_team).primary;
  const h = getTeamColors(game.home_team).primary;
  const photo = stadiumImageUrl(game.home_team, 1600);
  const wash = `linear-gradient(90deg, ${a}F2 0%, ${a}99 42%, ${h}99 58%, ${h}F2 100%)`;

  return (
    <section className="gh" style={{ backgroundImage: photo ? `${wash}, url("${photo}")` : wash }}>
      <div className="gh-inner">
        <Side team={game.away_team} record={game.away_season_record} score={final ? game.away_score ?? null : null} align="left" />
        <div className="gh-mid">
          <b>{final ? 'Final' : formatKickoff(game.gametime)}</b>
          <span>{final ? game.stadium ?? '' : [game.weekday, game.stadium].filter(Boolean).join(' · ')}</span>
        </div>
        <Side team={game.home_team} record={game.home_season_record} score={final ? game.home_score ?? null : null} align="right" />
      </div>
      <div className="gh-compare">
        <span className="clark-tag"><img src="/brand/clark-logo.jpg" alt="" />Clark {game.predicted_winner} {pct(getPredictedProbability(game))}%</span>
        {vegas && <span>Betting line <b>{vegas.team} {pct(vegas.prob)}%</b></span>}
        {fan && fan.picks >= MIN_FAN_PICKS && <span>Fans <b>{fan.team} {pct(fan.prob)}%</b></span>}
      </div>
    </section>
  );
}
