import { describe, expect, it } from 'vitest';
import type { ApiPrediction } from '@/types/prediction';
import type { LivePlay } from '@/data/liveRepository';
import { askClark, clarkChatLine, confession, explainPlay } from './clarkVoice';

const play = (o: Partial<LivePlay>): LivePlay => ({
  game_key: 'g', play_id: '1', seq: 1, quarter: 2, clock: '5:00', play_type: 'Rush', text: '', yards: 5,
  offense: 'KC', home_score: 14, away_score: 7, home_win_prob: 0.7, is_big: true, big_reason: null,
  note: null, drive_id: 'd', created_at: '', ...o,
});
const game = { predicted_winner: 'KC', home_team: 'KC', away_team: 'LAC' };

describe('explainPlay', () => {
  it('matches the most specific rule first', () => {
    expect(explainPlay({ play_type: 'Passing Touchdown', text: '' })).toMatch(/6 points/);
    expect(explainPlay({ play_type: 'Penalty', text: 'Offensive Holding on KC' })).toMatch(/Holding/);
    expect(explainPlay({ play_type: 'Pass Interception Return', text: '' })).toMatch(/interception/i);
    expect(explainPlay({ play_type: 'Unknown', text: '' })).toMatch(/regular play/);
  });
});

describe('clarkChatLine', () => {
  it('celebrates when the play helps his pick', () => {
    expect(clarkChatLine(play({ play_type: 'Passing Touchdown' }), game)).toMatch(/up 14–7/);
  });
  it('sweats when it hurts', () => {
    expect(clarkChatLine(play({ offense: 'LAC', home_score: 7, away_score: 14, play_type: 'Passing Touchdown' }), game)).toMatch(/down 14–7/);
  });
  it('a takeaway by his team helps', () => {
    expect(clarkChatLine(play({ offense: 'LAC', play_type: 'Pass Interception Return' }), game)).toMatch(/what I was talking about/);
  });
});

describe('confession and Ask Clark', () => {
  const g = {
    ...game, home_win_prob: 0.75, away_win_prob: 0.25, actual_winner: 'LAC', home_score: 17, away_score: 24,
  } as unknown as ApiPrediction;
  it('owns the miss', () => {
    expect(confession(g)).toMatch(/I had the Chiefs at 75%\. Final: LAC 24–17 KC\. I was wrong\. That's a big miss/);
    expect(confession({ ...g, actual_winner: 'KC' })).toBeNull();
  });
  it('Ask Clark needs a report', () => {
    expect(askClark(g)).toEqual([]);
  });
});
