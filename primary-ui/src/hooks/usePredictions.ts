import { useState, useEffect } from 'react';
import { ApiPrediction } from '@/types/prediction';

// Default: the static JSON bundled with the build (served from the site root on
// Vercel). Override with VITE_API_BASE_URL to read from a live FastAPI backend.
const PREDICTIONS_URL = import.meta.env.VITE_API_BASE_URL
  ? `${import.meta.env.VITE_API_BASE_URL}/predictions`
  : '/predictions.json';

// Module-level cache so both AppLayout and GamePage share one fetch
let _cache: ApiPrediction[] | null = null;
let _promise: Promise<ApiPrediction[]> | null = null;

async function fetchPredictions(): Promise<ApiPrediction[]> {
  if (_cache) return _cache;
  if (!_promise) {
    _promise = fetch(PREDICTIONS_URL)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(data => { _cache = Array.isArray(data) ? data : data.games ?? []; return _cache!; })
      .catch(err => { _promise = null; throw err; });
  }
  return _promise;
}

export interface PredictionsState {
  predictions: ApiPrediction[];
  loading: boolean;
  error: string;
  reload: () => void;
}

export function usePredictions(): PredictionsState {
  const [predictions, setPredictions] = useState<ApiPrediction[]>(_cache ?? []);
  const [loading, setLoading] = useState(!_cache);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    setError('');
    fetchPredictions()
      .then(data => { setPredictions(data); setLoading(false); })
      .catch(err => { setError(err instanceof Error ? err.message : 'Failed to load'); setLoading(false); });
  };

  useEffect(() => { if (!_cache) load(); }, []);

  return { predictions, loading, error, reload: load };
}
