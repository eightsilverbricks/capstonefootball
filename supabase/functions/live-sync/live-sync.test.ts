// Run: node --experimental-strip-types --test supabase/functions/live-sync/live-sync.test.ts
// Fixtures are trimmed copies of ESPN's real feed for ATL 35, GB 14 (Week 3, 2026).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import type { LivePlay } from './espnAdapter.ts';
import { gameKeyFor, parsePlays, parseScoreboard, parseWinProbability } from './espnAdapter.ts';
import type { PlayContext } from './plays.ts';
import { bigPlayReason, templateNote } from './plays.ts';
import { cleanAiText, aiNote } from './ai.ts';
import type { Store, LivePlayRow, ResultRow, LiveGameRow } from './sync.ts';
import { runSync, nextCheckAt, PREGAME_LEAD_MS } from './sync.ts';

const here = dirname(fileURLToPath(import.meta.url));
const fixture = (name: string) => JSON.parse(readFileSync(join(here, 'fixtures', name), 'utf8'));
const board = fixture('scoreboard_week3.json');
const summary = fixture('summary_atl_gb_final.json');

const basePlay: LivePlay = {
  playId: '1', seq: 1, quarter: 2, clock: '5:00', type: 'Rush', text: '', yards: 3,
  scoring: false, homeScore: 7, awayScore: 3, offense: 'GB', down: 1, distance: 10,
};
const ctx: PlayContext = { home: 'GB', away: 'ATL', wpBefore: 0.6, wpAfter: 0.62 };

test('scoreboard parses into our game key and final score', () => {
  const [event] = parseScoreboard(board);
  assert.equal(event.gameKey, '2026_03_ATL_GB');
  assert.equal(event.state, 'post');
  assert.equal(event.completed, true);
  assert.equal(event.awayScore, 35);
  assert.equal(event.homeScore, 14);
  assert.equal(gameKeyFor(2026, 4, 'ATL', 'NO'), '2026_04_ATL_NO');
});

test('plays come out ordered, de-duplicated, with offense resolved', () => {
  const [event] = parseScoreboard(board);
  const plays = parsePlays(summary, event.teamsById);
  assert.ok(plays.length > 100);
  for (let i = 1; i < plays.length; i++) assert.ok(plays[i].seq >= plays[i - 1].seq);
  assert.equal(new Set(plays.map((p) => p.playId)).size, plays.length);
  assert.ok(plays.every((p) => p.offense === null || ['ATL', 'GB'].includes(p.offense)));
  const wp = parseWinProbability(summary);
  assert.ok(Object.keys(wp).length > 100);
});

test('touchdowns in the real game are big plays with a scoreline note', () => {
  const [event] = parseScoreboard(board);
  const plays = parsePlays(summary, event.teamsById);
  const tds = plays.filter((p) => bigPlayReason(p, { ...ctx, wpBefore: null, wpAfter: null }) === 'touchdown');
  assert.equal(tds.length, 6); // ATL 4 TDs + 2 FGs, GB 2 TDs
  const note = templateNote(tds[0], 'touchdown', { home: 'GB', away: 'ATL', wpBefore: null, wpAfter: null });
  assert.match(note, /^Touchdown (GB|ATL)\. (GB|ATL) lead \d+–\d+\.$|^Touchdown (GB|ATL)\. Tied/);
});

test('big-play rules', () => {
  assert.equal(bigPlayReason({ ...basePlay, type: 'Pass Interception Return' }, ctx), 'turnover');
  assert.equal(bigPlayReason({ ...basePlay, type: 'Sack', down: 3 }, ctx), 'sack');
  assert.equal(bigPlayReason({ ...basePlay, type: 'Sack', down: 1 }, ctx), null);
  assert.equal(bigPlayReason({ ...basePlay, down: 4, distance: 2, yards: 3 }, ctx), 'fourth_down');
  assert.equal(bigPlayReason({ ...basePlay, type: 'Punt', down: 4 }, ctx), null);
  assert.equal(bigPlayReason({ ...basePlay, yards: 31, type: 'Pass Reception' }, ctx), 'long_gain');
  assert.equal(bigPlayReason({ ...basePlay, type: 'Field Goal Good', quarter: 4, clock: '1:30' }, ctx), 'field_goal');
  assert.equal(bigPlayReason({ ...basePlay, type: 'Field Goal Good', quarter: 2 }, ctx), null);
  assert.equal(bigPlayReason(basePlay, { ...ctx, wpBefore: 0.5, wpAfter: 0.6 }), 'win_prob_swing');
  assert.equal(bigPlayReason(basePlay, ctx), null);
});

test('template notes read plainly', () => {
  assert.equal(templateNote({ ...basePlay, type: 'Pass Interception Return' }, 'turnover', ctx),
    'Interception. ATL take the ball back.');
  assert.equal(templateNote({ ...basePlay, down: 4, distance: 2, yards: 1 }, 'fourth_down', ctx),
    'GB go for it on 4th & 2 and come up short. ATL take over.');
  assert.equal(templateNote({ ...basePlay, homeScore: 7, awayScore: 7 }, 'touchdown', ctx), 'Touchdown GB. Tied 7–7.');
  assert.equal(templateNote(basePlay, 'win_prob_swing', { ...ctx, wpAfter: 0.3 }), 'A big swing: ATL are now 70% to win.');
});

test('AI output is rejected unless it is one short plain sentence', async () => {
  assert.equal(cleanAiText('That pick hands Atlanta great field position'), 'That pick hands Atlanta great field position.');
  assert.equal(cleanAiText('line one\nline two'), null);
  assert.equal(cleanAiText('EPA jumped 0.4 on that play.'), null);
  assert.equal(cleanAiText('x'.repeat(300)), null);
  // No key, network error, or bad response: null, so the template is used.
  assert.equal(await aiNote(basePlay, ctx, 't', { apiKey: undefined }), null);
  const failing = (async () => { throw new Error('down'); }) as unknown as typeof fetch;
  assert.equal(await aiNote(basePlay, ctx, 't', { apiKey: 'k', fetchFn: failing }), null);
  const ok = (async () => new Response(JSON.stringify({
    candidates: [{ content: { parts: [{ text: 'Atlanta now control this game.' }] } }],
  }))) as unknown as typeof fetch;
  assert.equal(await aiNote(basePlay, ctx, 't', { apiKey: 'k', fetchFn: ok }), 'Atlanta now control this game.');
});

function memoryStore() {
  const state = {
    nextCheck: null as string | null,
    plays: [] as LivePlayRow[],
    games: [] as LiveGameRow[],
    results: [] as ResultRow[],
  };
  const store: Store = {
    async getNextCheckAt() { return state.nextCheck; },
    async setNextCheckAt(iso) { state.nextCheck = iso; },
    async knownPlayIds(k) { return new Set(state.plays.filter((p) => p.game_key === k).map((p) => p.play_id)); },
    async hasResult(k) { return state.results.some((r) => r.game_key === k); },
    async upsertGame(row) { state.games = [...state.games.filter((g) => g.game_key !== row.game_key), row]; },
    async insertPlays(rows) { state.plays = [...state.plays, ...rows]; },
    async upsertResult(row) { state.results = [...state.results, row]; },
  };
  return { state, store };
}

const fetchFixtures = async (url: string) => (url.includes('scoreboard') ? board : summary);

test('a tick on a finished game stores every play once and writes the result', async () => {
  const { state, store } = memoryStore();
  let aiCalls = 0;
  const report = await runSync({
    now: new Date('2026-09-25T04:00:00Z'), fetchJson: fetchFixtures, store,
    aiNote: async () => { aiCalls += 1; return null; }, // AI down: templates must cover
  });
  assert.equal(report.resultsWritten, 1);
  assert.deepEqual(state.results[0], {
    game_key: '2026_03_ATL_GB', home_team: 'GB', away_team: 'ATL', home_score: 14, away_score: 35, winner: 'ATL',
  });
  assert.ok(report.playsInserted > 100);
  const big = state.plays.filter((p) => p.is_big);
  assert.ok(big.length >= 6);
  assert.ok(big.every((p) => p.note && p.note_source === 'template'));
  assert.ok(aiCalls <= 3, 'AI calls are capped per tick');

  // Second tick: result already written and nothing live, so nothing is refetched.
  const again = await runSync({ now: new Date('2026-09-25T04:00:15Z'), fetchJson: fetchFixtures, store });
  assert.equal(again.playsInserted, 0);
  assert.equal(state.results.length, 1);
});

test('outside game windows a tick does no ESPN work', async () => {
  const { state, store } = memoryStore();
  state.nextCheck = '2026-10-04T16:50:00Z';
  let fetched = 0;
  const report = await runSync({
    now: new Date('2026-10-02T12:00:00Z'),
    fetchJson: async () => { fetched += 1; return {}; }, store,
  });
  assert.equal(report.skipped, true);
  assert.equal(fetched, 0);
});

test('the gate opens 10 minutes before the next kickoff', () => {
  const now = new Date('2026-10-02T12:00:00Z');
  const pre = { ...parseScoreboard(board)[0], state: 'pre' as const, startTime: '2026-10-04T17:00:00Z' };
  assert.equal(nextCheckAt([pre], now), new Date(Date.parse('2026-10-04T17:00:00Z') - PREGAME_LEAD_MS).toISOString());
  assert.equal(nextCheckAt([{ ...pre, state: 'in' }], now), null);
});
