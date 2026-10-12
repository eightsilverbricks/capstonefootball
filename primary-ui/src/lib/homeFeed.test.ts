import { describe, expect, it } from 'vitest';
import { clarkQuip, injuryItems, leadDek, leadStory, moreItems, seasonRecords } from './homeFeed';
import { ApiPrediction } from '@/types/prediction';
import { SentimentMap } from '@/data/sentimentRepository';

const game = (over: Partial<ApiPrediction>): ApiPrediction => ({
  season: 2026, week: 5, week_label: 'Week 5', home_team: 'DAL', away_team: 'TB', predicted_winner: 'DAL',
  home_win_prob: 0.64, away_win_prob: 0.36, confidence_label: 'Medium', confidence_score: 0.6, gametime: '20:20', weekday: 'Sunday',
  ...over,
} as ApiPrediction);

const fansOn = (key: string, byTeam: Record<string, number>): SentimentMap =>
  ({ [key]: { byTeam } } as unknown as SentimentMap);

describe('leadStory', () => {
  it('leads with the fan disagreement when enough fans picked the other side', () => {
    const story = leadStory([game({})], fansOn('2026_5_TB_DAL', { TB: 40, DAL: 10 }));
    expect(story?.headline).toBe("Fans are on the Buccaneers. I've got the Cowboys at 64%.");
    expect(story?.byline).toMatch(/^My biggest disagreement with the fans/);
  });

  it('ignores a fan side with too few picks', () => {
    const story = leadStory([game({})], fansOn('2026_5_TB_DAL', { TB: 3, DAL: 1 }));
    expect(story?.headline).toBe("I'm on the Cowboys at 64%.");
  });

  it('prefers games still to play', () => {
    const final = game({ home_team: 'NE', away_team: 'LV', actual_winner: 'NE', home_score: 20, away_score: 10, game_type: 'SB' });
    expect(leadStory([final, game({})], {})?.game.home_team).toBe('DAL');
  });

  it('returns null for an empty week', () => {
    expect(leadStory([], {})).toBeNull();
  });
});

describe('leadDek', () => {
  it('drops the opener the headline already covers', () => {
    const g = game({ football_story: "Clark picks BAL with a 62% chance to win. BAL's offense is heating up." });
    expect(leadDek(g)).toBe("BAL's offense is heating up.");
  });
});

describe('moreItems', () => {
  it('skips the lead and adds recaps for finals', () => {
    const lead = game({});
    const final = game({ home_team: 'NYJ', away_team: 'CLE', predicted_winner: 'NYJ', home_win_prob: 0.53, away_win_prob: 0.47, actual_winner: 'CLE', home_score: 13, away_score: 16 });
    const items = moreItems([lead, final], lead);
    expect(items).toHaveLength(1);
    expect(items[0].kicker).toBe('Recap');
    expect(items[0].title).toBe('Browns 16, Jets 13: what I got wrong.');
  });
});

describe('injuryItems', () => {
  it('lists worst status first and skips finished games', () => {
    const g = game({ injury_notes: [
      { name: 'A', team: 'DAL', position: 'WR', status: 'Questionable', injury: 'ankle' },
      { name: 'B', team: 'TB', position: 'QB', status: 'Out', injury: 'knee' },
    ] });
    const done = game({ home_team: 'NE', actual_winner: 'NE', home_score: 1, away_score: 0, injury_notes: [{ name: 'C', team: 'NE', position: 'RB', status: 'Out', injury: 'hand' }] });
    expect(injuryItems([g, done]).map((i) => i.name)).toEqual(['B', 'A']);
  });
});

describe('seasonRecords and clarkQuip', () => {
  const won = game({ actual_winner: 'DAL', home_score: 24, away_score: 17 });
  const lost = game({ home_team: 'NE', actual_winner: 'TB', home_score: 10, away_score: 20 });

  it('counts Clark, you, and fans on graded games', () => {
    const r = seasonRecords([won, lost], { '2026_5_TB_DAL': { team: 'TB', confidence: 0.6 } }, {});
    expect(r.clark).toEqual({ w: 1, l: 1 });
    expect(r.you).toEqual({ w: 0, l: 1 });
    expect(r.fans).toBeNull();
  });

  it('trash talks when Clark is ahead', () => {
    expect(clarkQuip({ clark: { w: 8, l: 2 }, you: { w: 6, l: 3 }, fans: null })).toBe("I'm 8–2. You're 6–3. Just saying.");
  });

  it('asks you to pick when you have no record', () => {
    expect(clarkQuip({ clark: { w: 1, l: 0 }, you: null, fans: null })).toMatch(/Make some picks/);
  });
});
