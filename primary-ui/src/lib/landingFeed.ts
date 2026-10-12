/**
 * Data for the signed-out landing page: the report we show as a teaser, and
 * Clark's record strip. Real numbers only; a stat with no data is left out.
 */
import { ApiPrediction, getConfidenceScore } from '@/types/prediction';
import { SentimentMap } from '@/data/sentimentRepository';
import { gameKey } from '@/lib/threeWaySignal';
import { isFinal } from '@/lib/gameStatus';
import { isContrarian } from '@/lib/slate';
import { getHeroFactor } from '@/lib/heroInsight';

/** Lead factors that say something the stat sheet can't (not just momentum or the spread). */
const ADDS_NEW_INFORMATION = new Set(['Defensive Edge', 'Recent Offense']);
/** "Last 3" fields carry over from last season in the first weeks. */
const FIRST_RELIABLE_WEEK = 4;
/** Below this, a pick count reads as an empty room rather than a crowd. */
const MIN_FAN_PICKS_SHOWN = 100;

/**
 * The game whose report we tease. An upcoming game from this week when one has
 * a strong lead factor, otherwise the season's best example, otherwise the
 * week's most confident pick.
 */
export function showcaseGame(all: ApiPrediction[], week: ApiPrediction[]): ApiPrediction | null {
  const byConfidence = (a: ApiPrediction, b: ApiPrediction) => getConfidenceScore(b) - getConfidenceScore(a);
  const strong = (g: ApiPrediction) => {
    const hero = getHeroFactor(g);
    return g.week >= FIRST_RELIABLE_WEEK && Boolean(hero?.headline) && ADDS_NEW_INFORMATION.has(hero?.name ?? '');
  };
  const thisWeek = week.filter((g) => !isFinal(g) && strong(g)).sort(byConfidence)[0];
  if (thisWeek) return thisWeek;
  return all.filter(strong).sort(byConfidence)[0] ?? [...week].sort(byConfidence)[0] ?? null;
}

export interface RecordStat {
  id: string;
  value: string;
  label: string;
}

/** Clark's record, hit rate, record against the line, and fans picking this week. */
export function recordStrip(all: ApiPrediction[], week: ApiPrediction[], sentiment: SentimentMap): RecordStat[] {
  const graded = all.filter((g) => isFinal(g) && g.actual_winner);
  const stats: RecordStat[] = [];
  if (graded.length > 0) {
    const right = graded.filter((g) => g.actual_winner === g.predicted_winner).length;
    stats.push({ id: 'record', value: `${right}–${graded.length - right}`, label: 'Clark this season' });
    stats.push({ id: 'rate', value: `${Math.round((right / graded.length) * 100)}%`, label: 'Correct picks' });
    const against = graded.filter(isContrarian);
    if (against.length > 0) {
      const won = against.filter((g) => g.actual_winner === g.predicted_winner).length;
      stats.push({ id: 'line', value: `${won}–${against.length - won}`, label: 'When Clark goes against the betting line' });
    }
  }
  const fans = week.reduce((sum, g) => sum + (sentiment[gameKey(g)]?.total ?? 0), 0);
  if (fans >= MIN_FAN_PICKS_SHOWN) stats.push({ id: 'fans', value: fans.toLocaleString('en-US'), label: 'Picks made this week' });
  return stats;
}
