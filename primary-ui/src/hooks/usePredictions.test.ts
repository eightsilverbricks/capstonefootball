import { afterEach, describe, expect, it, vi } from 'vitest';
import { LIVE_DATA_URL, loadGames } from './usePredictions';

const ok = (body: unknown) => Promise.resolve({ ok: true, json: () => Promise.resolve(body) } as Response);

describe('loadGames', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('reads the live season from the republished data branch', async () => {
    const fetchMock = vi.fn(() => ok([{ game_id: 'live' }]));
    vi.stubGlobal('fetch', fetchMock);
    const games = await loadGames('/predictions.json');
    expect(games[0].game_id).toBe('live');
    expect(fetchMock).toHaveBeenCalledWith(LIVE_DATA_URL, expect.anything());
  });

  it('falls back to the bundled file when the live copy fails', async () => {
    const fetchMock = vi.fn((url: string) =>
      url === LIVE_DATA_URL ? Promise.reject(new Error('offline')) : ok([{ game_id: 'bundled' }]));
    vi.stubGlobal('fetch', fetchMock);
    expect((await loadGames('/predictions.json'))[0].game_id).toBe('bundled');
  });

  it('never touches the live copy for the demo season', async () => {
    const fetchMock = vi.fn(() => ok([{ game_id: 'demo' }]));
    vi.stubGlobal('fetch', fetchMock);
    await loadGames('/predictions-2024.json');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('/predictions-2024.json', expect.anything());
  });
});
