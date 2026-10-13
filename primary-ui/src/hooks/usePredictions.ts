import { useState, useEffect } from 'react';
import { ApiPrediction } from '@/types/prediction';
import { useSeasonMode } from '@/context/SeasonModeContext';

// Static JSON bundled with the build (served from the site root on Vercel).
// VITE_API_BASE_URL overrides it to read from a live FastAPI backend, which
// takes the season as a query parameter.
function urlFor(season: number, dataUrl: string): string {
  const base = import.meta.env.VITE_API_BASE_URL;
  return base ? `${base}/predictions?season=${season}` : dataUrl;
}

// The live season is republished every ~10 minutes by .github/workflows/refresh-data.yml
// to the `data` branch, so new scores, lines and injuries reach the site without a
// redeploy. The bundled file is the fallback if that fetch fails.
const LIVE_STATIC_URL = '/predictions.json';
export const LIVE_DATA_URL: string =
  import.meta.env.VITE_LIVE_DATA_URL ??
  'https://raw.githubusercontent.com/eightsilverbricks/capstonefootball/data/predictions.json';
export const LIVE_REFRESH_MS = 5 * 60 * 1000;

async function getJson(url: string): Promise<ApiPrediction[]> {
  const r = await fetch(url, { cache: 'no-cache' });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const data = await r.json();
  return Array.isArray(data) ? data : data.games ?? [];
}

/** Live season: the republished file first, the bundled one if that fails. */
export async function loadGames(url: string): Promise<ApiPrediction[]> {
  if (url !== LIVE_STATIC_URL) return getJson(url);
  try {
    const games = await getJson(LIVE_DATA_URL);
    if (games.length) return games;
  } catch {
    // Network or CORS trouble with the live copy: the bundled file still works.
  }
  return getJson(LIVE_STATIC_URL);
}

// Cached per URL, not globally: the live and demo datasets are both large, and
// a single shared cache would hand demo cards to the live season after a toggle.
const _cache = new Map<string, ApiPrediction[]>();
const _promises = new Map<string, Promise<ApiPrediction[]>>();

async function fetchPredictions(url: string): Promise<ApiPrediction[]> {
  const cached = _cache.get(url);
  if (cached) return cached;

  let promise = _promises.get(url);
  if (!promise) {
    promise = loadGames(url)
      .then(games => {
        _cache.set(url, games);
        return games;
      })
      .catch(err => { _promises.delete(url); throw err; });
    _promises.set(url, promise);
  }
  return promise;
}

export interface PredictionsState {
  predictions: ApiPrediction[];
  loading: boolean;
  error: string;
  reload: () => void;
}

export function usePredictions(): PredictionsState {
  const { config } = useSeasonMode();
  const url = urlFor(config.season, config.dataUrl);

  const [predictions, setPredictions] = useState<ApiPrediction[]>(() => _cache.get(url) ?? []);
  const [loading, setLoading] = useState(!_cache.has(url));
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    setError('');
    fetchPredictions(url)
      .then(data => { setPredictions(data); setLoading(false); })
      .catch(err => { setError(err instanceof Error ? err.message : 'Failed to load'); setLoading(false); });
  };

  // Re-runs on url, so switching season mode swaps the dataset in place.
  useEffect(() => {
    const cached = _cache.get(url);
    if (cached) { setPredictions(cached); setLoading(false); setError(''); return; }
    load();
  }, [url]);

  // Keep an open page current: quietly pick up the latest republished file.
  useEffect(() => {
    if (url !== LIVE_STATIC_URL) return;
    const id = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      loadGames(url)
        .then(games => { _cache.set(url, games); _promises.delete(url); setPredictions(games); })
        .catch(() => { /* keep showing what we have */ });
    }, LIVE_REFRESH_MS);
    return () => window.clearInterval(id);
  }, [url]);

  return { predictions, loading, error, reload: load };
}
