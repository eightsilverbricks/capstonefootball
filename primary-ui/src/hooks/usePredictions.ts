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

// Cached per URL, not globally: the live and demo datasets are both large, and
// a single shared cache would hand demo cards to the live season after a toggle.
const _cache = new Map<string, ApiPrediction[]>();
const _promises = new Map<string, Promise<ApiPrediction[]>>();

async function fetchPredictions(url: string): Promise<ApiPrediction[]> {
  const cached = _cache.get(url);
  if (cached) return cached;

  let promise = _promises.get(url);
  if (!promise) {
    promise = fetch(url)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(data => {
        const games: ApiPrediction[] = Array.isArray(data) ? data : data.games ?? [];
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

  return { predictions, loading, error, reload: load };
}
