import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import WeekStrip from '@/components/WeekStrip';
import PreSeasonNotice from '@/components/PreSeasonNotice';
import GameRow from '@/components/games/GameRow';
import { usePredictions } from '@/hooks/usePredictions';
import { useUserPicks } from '@/hooks/useUserPicks';
import { useSeasonMode } from '@/context/SeasonModeContext';
import { groupBySlate } from '@/lib/slate';
import { resolveCurrentWeek, weekTitle } from '@/lib/currentWeek';
import { gameKey } from '@/lib/threeWaySignal';
import { weekRecords, weekStats } from '@/lib/rail';
import { isFinal } from '@/lib/gameStatus';
import { toast } from '@/lib/fx';
import { getTeam } from '@/data/teams';
import { ApiPrediction } from '@/types/prediction';

function ClarkLock({ games }: { games: ApiPrediction[] }) {
  const open = games.filter((g) => !isFinal(g));
  const pool = open.length ? open : games;
  if (pool.length === 0) return null;
  const prob = (g: ApiPrediction) => Math.max(g.home_win_prob, g.away_win_prob);
  const lock = [...pool].sort((a, b) => prob(b) - prob(a))[0];
  const loser = lock.predicted_winner === lock.home_team ? lock.away_team : lock.home_team;
  const name = (t: string) => getTeam(t)?.name ?? t;
  return (
    <div className="clark-card" style={{ maxWidth: 520 }}>
      <img src="/brand/clark-logo.jpg" alt="" />
      <p>
        "My most confident pick this week: the {name(lock.predicted_winner)}, {Math.round(prob(lock) * 100)}% over the {name(loser)}."
        <small>Clark · picks lock at each kickoff</small>
      </p>
    </div>
  );
}

function YourWeek({ games }: { games: ApiPrediction[] }) {
  const { picks } = useUserPicks();
  const picked = games.filter((g) => picks[gameKey(g)]).length;
  const graded = games.filter((g) => picks[gameKey(g)] && isFinal(g) && g.actual_winner);
  const right = graded.filter((g) => picks[gameKey(g)].team === g.actual_winner).length;
  const clark = weekStats(games).find((s) => s.id === 'clark-record');
  return (
    <section>
      <h2>Your week</h2>
      <div className="gp-stat"><span>Picked</span><b>{picked} of {games.length}</b></div>
      <div className="gp-stat"><span>Your record</span><b>{graded.length ? `${right}–${graded.length - right}` : '—'}</b></div>
      <div className="gp-stat"><span>Clark</span><b>{clark?.value ?? '—'}</b></div>
    </section>
  );
}

/** The Games page: the week as scoreboard rows grouped by viewing window, picks made in the row. */
export default function GamesView() {
  const { predictions, loading, error, reload } = usePredictions();
  const { picks } = useUserPicks();
  const { config: seasonConfig } = useSeasonMode();
  const isDemo = seasonConfig.isDemo;
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);

  const availableWeeks = useMemo(() => [...new Set(predictions.map((g) => g.week))].sort((a, b) => a - b), [predictions]);

  useEffect(() => {
    if (availableWeeks.length === 0) return;
    if (selectedWeek === null || !availableWeeks.includes(selectedWeek)) {
      setSelectedWeek(resolveCurrentWeek(availableWeeks, { isDemo }));
    }
  }, [availableWeeks, selectedWeek, isDemo]);

  const activeWeek = selectedWeek ?? resolveCurrentWeek(availableWeeks, { isDemo });
  const weekGames = useMemo(() => predictions.filter((g) => g.week === activeWeek), [predictions, activeWeek]);
  const slate = useMemo(() => groupBySlate(weekGames), [weekGames]);
  const records = useMemo(() => weekRecords(predictions, picks), [predictions, picks]);

  const copyChallenge = async () => {
    const link = `${window.location.origin}/games?challenge=${activeWeek}`;
    try {
      await navigator.clipboard.writeText(link);
      toast('Challenge link copied. Send it to someone who thinks they know ball 🏈');
    } catch {
      toast(`Copy this link: ${link}`);
    }
  };

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto px-4 sm:px-5 pb-16" style={{ maxWidth: 'var(--content-max)' }}>
        <div className="mt-5"><PreSeasonNotice /></div>
        <div className="gp-top">
          <div>
            <div className="gp-kicker">{seasonConfig.season} {isDemo ? 'demo season' : 'regular season'}</div>
            <h1 className="gp-title">{weekTitle(activeWeek)}</h1>
          </div>
          <ClarkLock games={weekGames} />
        </div>
        <WeekStrip availableWeeks={availableWeeks} selectedWeek={activeWeek} onChange={setSelectedWeek} records={records} />

        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3" style={{ color: 'var(--ink-3)' }}>
            <RefreshCw className="w-6 h-6 animate-spin" />
            <p className="text-sm">Loading games</p>
          </div>
        )}

        {!loading && error && (
          <div className="clark-card my-8">
            <AlertCircle className="w-8 h-8 shrink-0" style={{ color: 'var(--loss)' }} />
            <p>
              Couldn't load this week's games.
              <small>{error}</small>
            </p>
            <button type="button" className="pill pill-red ml-auto" onClick={reload}>Try again</button>
          </div>
        )}

        {!loading && !error && weekGames.length > 0 && (
          <div className="gp-grid">
            <div>
              {slate.map((group) => (
                <section key={group.window.id} aria-labelledby={`slate-${group.window.id}`}>
                  <div className="gp-day">
                    <span id={`slate-${group.window.id}`}>{group.window.label}</span>
                    <span className="muted">{group.games.length} {group.games.length === 1 ? 'game' : 'games'}</span>
                  </div>
                  {group.games.map((g) => <GameRow key={gameKey(g)} game={g} />)}
                </section>
              ))}
            </div>
            <aside className="gp-side">
              <YourWeek games={weekGames} />
              <section className="gp-h2h">
                <h2>Head-to-head</h2>
                <p>Send a friend a link. You both pick this week's games, and the winner gets bragging rights.</p>
                <button type="button" className="pill" onClick={copyChallenge}>Copy challenge link</button>
              </section>
            </aside>
          </div>
        )}

        {!loading && !error && weekGames.length === 0 && (
          <p className="py-16 text-center" style={{ color: 'var(--ink-3)' }}>No games this week.</p>
        )}
      </main>
      <Footer />
    </div>
  );
}
