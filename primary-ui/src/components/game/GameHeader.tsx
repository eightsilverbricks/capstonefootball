import { getPredictedProbability } from '@/types/prediction';
import { getEspnLogoUrl, getTeamColors } from '@/data/nflData';
import { getTeam } from '@/data/teams';
import { stadiumImageUrl } from '@/data/stadiumImages';
import { isFinal } from '@/lib/gameStatus';
import { formatKickoff } from '@/lib/slate';
import { TeamPick, FanPick } from '@/lib/threeWaySignal';
import { downAndDistance, liveClock, type LiveAware } from '@/lib/live';
import { LockedChip, useGate } from '@/components/auth/SignInGate';

interface GameHeaderProps {
  game: LiveAware;
  vegas: TeamPick | null;
  fan: FanPick | null;
}

const pct = (p: number) => Math.round(p * 100);
const MIN_FAN_PICKS = 25;

function Side({ team, record, score, align, hasBall }: { team: string; record?: string | null; score: number | null; align: 'left' | 'right'; hasBall?: boolean }) {
  const info = getTeam(team);
  const text = (
    <div className="gh-name">
      <span>{info?.city ?? team}{record ? ` · ${record}` : ''}</span>
      <b>{info?.name ?? team}{hasBall && <span className="gh-ball" role="img" aria-label="has the ball" style={{ display: 'inline-block', marginLeft: 8, verticalAlign: 'middle' }} />}</b>
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
  const gate = useGate('clark-pick');
  const final = isFinal(game);
  const live = !final && game.live?.status === 'in' ? game.live : null;
  const score = (side: 'home' | 'away') =>
    final ? (side === 'home' ? game.home_score : game.away_score) ?? null
      : live ? (side === 'home' ? live.home_score : live.away_score) : null;
  const dd = live ? downAndDistance(live) : null;
  const a = getTeamColors(game.away_team).primary;
  const h = getTeamColors(game.home_team).primary;
  const photo = stadiumImageUrl(game.home_team, 1600);
  const wash = `linear-gradient(90deg, ${a}F2 0%, ${a}99 42%, ${h}99 58%, ${h}F2 100%)`;

  return (
    <section className="gh" style={{ backgroundImage: photo ? `${wash}, url("${photo}")` : wash }}>
      <div className="gh-inner">
        <Side team={game.away_team} record={game.away_season_record} score={score('away')} align="left" hasBall={live?.possession === game.away_team} />
        <div className="gh-mid" aria-live="polite">
          {live
            ? <><b className="gh-live"><span className="live-dot" />{liveClock(live)}</b>{dd && <span className="gh-dd">{dd}</span>}</>
            : <><b>{final ? 'Final' : formatKickoff(game.gametime)}</b>
              <span>{final ? game.stadium ?? '' : [game.weekday, game.stadium].filter(Boolean).join(' · ')}</span></>}
        </div>
        <Side team={game.home_team} record={game.home_season_record} score={score('home')} align="right" hasBall={live?.possession === game.home_team} />
      </div>
      <div className="gh-compare">
        {gate.locked
          ? <LockedChip />
          : <span className="clark-tag"><img src="/brand/clark-logo.jpg" alt="" />Clark {game.predicted_winner} {pct(getPredictedProbability(game))}%</span>}
        {!gate.locked && live?.home_win_prob != null && (
          <span>Live <b>{live.home_win_prob >= 0.5 ? game.home_team : game.away_team} {pct(Math.max(live.home_win_prob, 1 - live.home_win_prob))}%</b></span>
        )}
        {vegas && <span>Betting line <b>{vegas.team} {pct(vegas.prob)}%</b></span>}
        {fan && fan.picks >= MIN_FAN_PICKS && <span>Fans <b>{fan.team} {pct(fan.prob)}%</b></span>}
      </div>
    </section>
  );
}
