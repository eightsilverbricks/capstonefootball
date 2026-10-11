import { useMemo } from 'react';
import { usePredictions } from '@/hooks/usePredictions';
import { useSeasonMode } from '@/context/SeasonModeContext';
import { resolveCurrentWeek } from '@/lib/currentWeek';
import { ApiPrediction } from '@/types/prediction';

/** The current week's games (live season, or the demo week in demo mode). */
export function useCurrentWeekGames(): { week: number; games: ApiPrediction[] } {
  const { predictions } = usePredictions();
  const { config } = useSeasonMode();
  return useMemo(() => {
    const weeks = [...new Set(predictions.map((g) => g.week))].sort((a, b) => a - b);
    const week = resolveCurrentWeek(weeks, { isDemo: config.isDemo });
    return { week, games: predictions.filter((g) => g.week === week) };
  }, [predictions, config.isDemo]);
}
