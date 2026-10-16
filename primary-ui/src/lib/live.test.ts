import { describe, expect, it } from 'vitest';
import type { ApiPrediction } from '@/types/prediction';
import type { LiveGame, LivePlay } from '@/data/liveRepository';
import {
  applyLive, currentDrive, decidingPlays, downAndDistance, elapsedSeconds, factorTracker, fieldState,
  groupDrives, halftimeScore, liveClock, pickStanding, playDown, pollKey, secondsSince, teamLines, winProbSeries,
} from './live';

const live = (o: Partial<LiveGame> = {}): LiveGame => ({
  game_key: 'g', status: 'in', quarter: 2, clock: '4:12', home_team: 'KC', away_team: 'LAC',
  home_score: 10, away_score: 7, possession: 'KC', home_win_prob: 0.6, down: 3, distance: 7,
  yard_line: 'LAC 35', updated_at: '', ...o,
});

let seq = 0;
const play = (o: Partial<LivePlay> = {}): LivePlay => ({
  game_key: 'g', play_id: String(++seq), seq, quarter: 1, clock: '10:00', play_type: 'Rush',
  text: '', yards: 5, offense: 'KC', home_score: 0, away_score: 0, home_win_prob: 0.5,
  is_big: false, big_reason: null, note: null, drive_id: 'd1', created_at: '', ...o,
});

const game = {
  game_id: 'g', season: 2026, week: 6, home_team: 'KC', away_team: 'LAC', predicted_winner: 'KC',
  home_win_prob: 0.7, away_win_prob: 0.3, home_score: null, away_score: null, actual_winner: null,
  clark_report: { deciding: { table: { offense_team: 'KC', defense_team: 'LAC', edge_team: 'KC', rows: [] } } },
} as unknown as ApiPrediction;

describe('applyLive', () => {
  it('applies a final the moment it lands', () => {
    const g = applyLive(game, live({ status: 'post', home_score: 17, away_score: 20 }));
    expect(g.actual_winner).toBe('LAC');
    expect(g.home_score).toBe(17);
  });
  it('a tie is final with no winner', () => {
    expect(applyLive(game, live({ status: 'post', home_score: 20, away_score: 20 })).actual_winner).toBeNull();
  });
  it('a live game keeps no final but carries the live state', () => {
    const g = applyLive(game, live());
    expect(g.home_score).toBeNull();
    expect(g.live?.status).toBe('in');
  });
});

describe('clock and situation', () => {
  it('formats', () => {
    expect(liveClock(live())).toBe('Q2 4:12');
    expect(liveClock(live({ clock: '0:00' }))).toBe('Halftime');
    expect(liveClock(live({ quarter: 5, clock: '8:00' }))).toBe('OT 8:00');
    expect(liveClock(live({ status: 'post' }))).toBe('Final');
    expect(downAndDistance(live())).toBe('3rd & 7 at LAC 35');
    expect(downAndDistance(live({ status: 'post' }))).toBeNull();
  });
  it('4th-down poll key only on 4th down', () => {
    expect(pollKey(live())).toBeNull();
    expect(pollKey(live({ down: 4 }))).toBe('2|LAC 35|KC');
  });
});

describe('drives and lines', () => {
  it('groups by drive and names the result', () => {
    const plays = [
      play({ drive_id: 'a', yards: 10 }), play({ drive_id: 'a', yards: 20, play_type: 'Passing Touchdown', is_big: true }),
      play({ drive_id: 'b', offense: 'LAC', yards: 3 }), play({ drive_id: 'b', offense: 'LAC', play_type: 'Punt', yards: 45 }),
    ];
    const drives = groupDrives(plays);
    expect(drives.map((d) => [d.id, d.yards, d.result])).toEqual([['a', 30, 'TD'], ['b', 3, 'Punt']]);
    expect(drives[0].big).toHaveLength(1);
  });
  it('a drive that hands the ball over with nothing else is on downs; the last one depends on the game', () => {
    const plays = [play({ drive_id: 'a', play_type: 'Pass Incompletion' }), play({ drive_id: 'b', offense: 'LAC' })];
    expect(groupDrives(plays).map((d) => d.result)).toEqual(['Downs', 'In progress']);
    expect(groupDrives(plays, true)[1].result).toBe('End of game');
  });
  it('counts yards per play, turnovers and sacks per offense', () => {
    const lines = teamLines([
      play({ yards: 6 }), play({ yards: 4 }), play({ play_type: 'Pass Interception Return', yards: 0 }),
      play({ offense: 'LAC', play_type: 'Sack', yards: -7 }),
    ], 'KC', 'LAC');
    expect(lines.KC.turnovers).toBe(1);
    expect(lines.LAC.sacksTaken).toBe(1);
    expect(lines.KC.ypp).toBeCloseTo(10 / 3);
  });
  it('halftime score appears once the 3rd quarter starts', () => {
    const first = [play({ quarter: 2, home_score: 14, away_score: 3 })];
    expect(halftimeScore(first)).toBeNull();
    expect(halftimeScore([...first, play({ quarter: 3, home_score: 14, away_score: 3 })])).toEqual({ home: 14, away: 3 });
  });
});

describe('factorTracker', () => {
  it('waits before there is enough game, then grades', () => {
    expect(factorTracker(game, []).every((t) => t.state === 'waiting')).toBe(true);
    const plays = Array.from({ length: 24 }, () => play({ yards: 7 }));
    plays.push(play({ quarter: 3, home_score: 17, away_score: 3 }));
    plays.splice(20, 0, play({ quarter: 2, home_score: 17, away_score: 3 }));
    const [moving, turnovers, half] = factorTracker(game, plays);
    expect(moving.state).toBe('yes');
    expect(turnovers.state).toBe('yes');
    expect(half.state).toBe('yes');
  });
  it('flags the turnover battle going wrong', () => {
    const plays = Array.from({ length: 25 }, () => play());
    plays.push(play({ play_type: 'Pass Interception Return' }), play({ play_type: 'Fumble Recovery (Opponent)' }));
    expect(factorTracker(game, plays)[1].state).toBe('no');
  });
});

describe('recap helpers', () => {
  it('finds the biggest win % swings, in game order', () => {
    const plays = [0.5, 0.52, 0.8, 0.79, 0.3, 0.31].map((wp) => play({ home_win_prob: wp }));
    const top = decidingPlays(plays, 2);
    expect(top.map((s) => Math.round(s.swing * 100))).toEqual([28, -49]);
  });
  it('pick standing', () => {
    expect(pickStanding('KC', { home_team: 'KC', home_score: 10, away_score: 7 })).toBe('winning');
    expect(pickStanding('LAC', { home_team: 'KC', home_score: 10, away_score: 7 })).toBe('losing');
    expect(pickStanding('LAC', { home_team: 'KC', home_score: 7, away_score: 7 })).toBe('tied');
  });
});

describe('drives with ESPN summaries', () => {
  it('names the receiving team on an opening drive that starts with a kickoff', () => {
    const plays = [
      play({ play_type: 'Kickoff', offense: 'LAC', yards: 27 }),
      play({ offense: 'KC' }), play({ offense: 'KC' }),
    ];
    expect(groupDrives(plays)[0].offense).toBe('KC');
  });
  it('trusts the summary for team, yards and result, and marks the last open drive live', () => {
    const plays = [play({ drive_id: 'a', offense: 'LAC', play_type: 'Kickoff' }), play({ drive_id: 'a' }), play({ drive_id: 'b', offense: 'LAC' })];
    const drives = groupDrives(plays, false, [
      { id: 'a', team: 'KC', description: '8 plays, 75 yards, 4:12', result: 'Touchdown', start: 'KC 25', plays: 8, yards: 75, scoring: true },
      { id: 'b', team: 'LAC', description: '1 play, 5 yards, 0:30', result: null, start: 'LAC 25', plays: 1, yards: 5, scoring: false },
    ]);
    expect(drives.map((d) => [d.offense, d.result, d.yards])).toEqual([['KC', 'TD', 75], ['LAC', 'In progress', 5]]);
    expect(drives[0].description).toBe('8 plays, 75 yards, 4:12');
    expect(currentDrive(drives, false)?.id).toBe('b');
    expect(currentDrive(drives, true)).toBeNull();
  });
});

describe('game clock and win %', () => {
  it('turns quarter and clock into seconds played', () => {
    expect(elapsedSeconds(1, '15:00')).toBe(0);
    expect(elapsedSeconds(2, '0:00')).toBe(1800);
    expect(elapsedSeconds(4, '2:00')).toBe(3480);
    expect(elapsedSeconds(5, '10:00')).toBe(3600);
    expect(elapsedSeconds(5, '4:00')).toBe(3960);
  });
  it('plots plays against game time and never runs backwards', () => {
    const s = winProbSeries([
      play({ quarter: 1, clock: '10:00', home_win_prob: 0.5 }),
      play({ quarter: 1, clock: '11:00', home_win_prob: 0.55 }),
      play({ quarter: 2, clock: '15:00', home_win_prob: null }),
      play({ quarter: 3, clock: '15:00', home_win_prob: 0.7 }),
    ]);
    expect(s.map((p) => p.t)).toEqual([300, 300, 1800]);
    expect(s.map((p) => p.p)).toEqual([0.5, 0.55, 0.7]);
  });
});

describe('field', () => {
  it('puts the sticks ahead of the ball in the offense\'s direction', () => {
    expect(fieldState(live({ possession: 'LAC', ball_on: 39, down: 2, distance: 4 }))).toEqual({ ball: 39, toGain: 35, direction: -1, offense: 'LAC' });
    expect(fieldState(live({ possession: 'KC', ball_on: 30, down: 1, distance: 10 }))?.toGain).toBe(40);
  });
  it('has no line to gain on goal to go, and no field before kickoff', () => {
    expect(fieldState(live({ possession: 'KC', ball_on: 95, down: 1, distance: 5 }))?.toGain).toBeNull();
    expect(fieldState(live({ status: 'pre', ball_on: 35 }))).toBeNull();
    expect(fieldState(live({ ball_on: null }))).toBeNull();
  });
  it('labels a play\'s down and how old the feed is', () => {
    expect(playDown(play({ down: 3, distance: 7 }))).toBe('3rd & 7');
    expect(playDown(play({ down: 0 }))).toBeNull();
    expect(secondsSince('2026-10-15T20:00:00Z', Date.parse('2026-10-15T20:00:42Z'))).toBe(42);
    expect(secondsSince('nope')).toBe(Number.POSITIVE_INFINITY);
  });
});
