import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertCircle, RefreshCw } from 'lucide-react';
import Header from '@/components/Header';
import SignInGate, { GatePreview } from '@/components/auth/SignInGate';
import Footer from '@/components/Footer';
import { usePredictions } from '@/hooks/usePredictions';
import { useFanSentiment } from '@/hooks/useFanSentiment';
import { useAuth } from '@/hooks/useAuth';
import { useSeasonMode } from '@/context/SeasonModeContext';
import { openAuthDialog } from '@/hooks/useAuthDialog';
import { resolveCurrentWeek } from '@/lib/currentWeek';
import { computeFanbaseStandings } from '@/lib/threeWaySignal';
import { isFinal } from '@/lib/gameStatus';
import { signed } from '@/lib/format';
import { LeaderRow, LeaderboardSort, loadLeaderboard } from '@/data/leaderboardRepository';
import { getEspnLogoUrl } from '@/data/nflData';
import { getTeam } from '@/data/teams';
import { ApiPrediction } from '@/types/prediction';

const BOARDS = [
  { id: 'week', label: 'This week' },
  { id: 'season', label: 'Season' },
  { id: 'fanbases', label: 'Fanbases' },
  { id: 'clark', label: 'Beat Clark' },
] as const;
type BoardId = (typeof BOARDS)[number]['id'];
const isBoard = (v: string | null): v is BoardId => BOARDS.some((b) => b.id === v);

const nick = (t: string) => getTeam(t)?.name ?? t;
const ordinal = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n.toLocaleString('en-US')}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
};

/** The latest week with at least one graded game (the "This week" board needs results). */
function latestGradedWeek(games: ApiPrediction[], fallback: number): number {
  const weeks = games.filter((g) => isFinal(g) && g.actual_winner).map((g) => g.week);
  return weeks.length ? Math.max(...weeks) : fallback;
}

function useBoard(games: ApiPrediction[], board: BoardId, week: number) {
  const [rows, setRows] = useState<LeaderRow[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (board === 'fanbases' || games.length === 0) return;
    let live = true;
    setStatus('loading');
    const sort: LeaderboardSort = board === 'clark' ? 'vs_clark' : 'points';
    loadLeaderboard(games, { week: board === 'week' ? week : null, sort })
      .then((r) => { if (live) { setRows(r); setStatus('ready'); } })
      .catch((e: unknown) => { if (live) { setError(e instanceof Error ? e.message : 'Unknown error'); setStatus('error'); } });
    return () => { live = false; };
  }, [games, board, week, nonce]);

  return { rows, status, error, retry: () => setNonce((n) => n + 1) };
}

function FanTable({ rows, board, myId }: { rows: LeaderRow[]; board: BoardId; myId: string | null }) {
  const top = rows.filter((r) => r.rank <= 50);
  const me = rows.find((r) => r.userId === myId && r.rank > 50);
  const line = (r: LeaderRow) => {
    const margin = r.wins - r.clarkWins;
    return (
      <tr key={r.userId} className={r.userId === myId ? 'me' : undefined}>
        <td className="n">{r.rank}</td>
        <td>
          <span className="lb-u">
            {r.favoriteTeam ? <img src={getEspnLogoUrl(r.favoriteTeam)} alt="" width={24} height={24} /> : <span className="lb-noteam" />}
            <span>@{r.handle}<small>{r.userId === myId ? 'You' : r.favoriteTeam ? `${nick(r.favoriteTeam)} fan` : r.displayName}</small></span>
          </span>
        </td>
        <td className="r">{r.wins}–{r.losses}</td>
        <td className={`r ${board === 'clark' ? '' : 'hide-sm'}`}><span className={margin > 0 ? 'up' : margin < 0 ? 'down' : ''}>{signed(margin)}</span></td>
        <td className="r"><b>{r.points}</b></td>
      </tr>
    );
  };
  return (
    <table className="lb-table">
      <thead>
        <tr><th className="n">#</th><th>Fan</th><th className="r">Record</th><th className={`r ${board === 'clark' ? '' : 'hide-sm'}`}>vs Clark</th><th className="r">Points</th></tr>
      </thead>
      <tbody>
        {top.map(line)}
        {me && <><tr className="gap"><td colSpan={5}>⋯</td></tr>{line(me)}</>}
      </tbody>
    </table>
  );
}

function Fanbases({ games, myTeam }: { games: ApiPrediction[]; myTeam: string | null }) {
  const { fanbases, status } = useFanSentiment([]);
  const standings = useMemo(
    () => [...computeFanbaseStandings(games, fanbases)].sort((a, b) => b.correct / b.picks - a.correct / a.picks || b.picks - a.picks),
    [games, fanbases],
  );
  if (status === 'loading') return <p className="gr-muted lb-pad">Loading fanbases</p>;
  if (standings.length === 0) return <p className="gr-muted lb-pad">No fanbase has a graded pick yet. Pick your team in Settings and get picking.</p>;
  return (
    <table className="lb-table">
      <thead><tr><th className="n">#</th><th>Fanbase</th><th className="r">Correct</th><th className="r hide-sm">Picks</th><th className="r">Points</th></tr></thead>
      <tbody>
        {standings.map((s, i) => (
          <tr key={s.team} className={s.team === myTeam ? 'me' : undefined}>
            <td className="n">{i + 1}</td>
            <td><span className="lb-u"><img src={getEspnLogoUrl(s.team)} alt="" width={24} height={24} /><span>{nick(s.team)} fans{s.team === myTeam && <small>Your team</small>}</span></span></td>
            <td className="r">{Math.round((s.correct / s.picks) * 100)}%</td>
            <td className="r hide-sm">{s.picks.toLocaleString('en-US')}</td>
            <td className="r"><b>{signed(s.net)}</b></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Aside({ rows, myId, clark, board, week }: { rows: LeaderRow[]; myId: string | null; clark: { w: number; l: number }; board: BoardId; week: number }) {
  const me = rows.find((r) => r.userId === myId);
  const size = rows[0]?.boardSize ?? 0;
  const scope = board === 'week' ? `Week ${week}` : 'this season';
  return (
    <aside className="lb-side">
      <div className="lb-card">
        <span className="gr-muted">Your rank, {scope}</span>
        {me ? <><b className="lb-big">{ordinal(me.rank)}</b><span className="gr-muted">of {size.toLocaleString('en-US')} fans · {me.wins}–{me.losses}</span></>
          : myId ? <span className="lb-note">No graded picks {board === 'week' ? 'this week' : 'yet'}. Make some picks and you'll show up here.</span>
            : <><span className="lb-note">Sign up to get on the board.</span><button type="button" className="pill pill-red" onClick={() => openAuthDialog('signup')}>Create free account</button></>}
      </div>
      <div className="lb-card lb-clark">
        <img src="/brand/clark-logo.jpg" alt="" />
        <div>
          <span>Clark, {scope}</span>
          <b className="lb-big">{clark.w}–{clark.l}</b>
        </div>
      </div>
    </aside>
  );
}

/** Leaderboard: This week · Season · Fanbases · Beat Clark (board kept in the URL). */
export default function LeaderboardPage() {
  const [params, setParams] = useSearchParams();
  const raw = params.get('board');
  const board: BoardId = isBoard(raw) ? raw : 'week';
  const { predictions, loading } = usePredictions();
  const { user } = useAuth();
  const { config } = useSeasonMode();

  const weeks = useMemo(() => [...new Set(predictions.map((g) => g.week))].sort((a, b) => a - b), [predictions]);
  const week = latestGradedWeek(predictions, resolveCurrentWeek(weeks, { isDemo: config.isDemo }));
  const { rows, status, error, retry } = useBoard(predictions, board, week);

  const clark = useMemo(() => {
    const graded = predictions.filter((g) => isFinal(g) && g.actual_winner && (board !== 'week' || g.week === week));
    const w = graded.filter((g) => g.actual_winner === g.predicted_winner).length;
    return { w, l: graded.length - w };
  }, [predictions, board, week]);

  const myId = user?.id ?? null;
  const select = (id: BoardId) => setParams(id === 'week' ? {} : { board: id }, { replace: true });

  return (
    <div className="min-h-screen">
      <Header />
      <main className="lb-wrap">
        <div className="gp-kicker">{config.season} {config.isDemo ? 'demo season' : 'season'}</div>
        <h1 className="gp-title">Leaderboard</h1>
        <nav className="lb-tabs" role="tablist" aria-label="Leaderboards">
          {BOARDS.map((b) => <button key={b.id} type="button" role="tab" aria-selected={board === b.id} onClick={() => select(b.id)}>{b.label}</button>)}
        </nav>
        {board === 'clark' && <p className="lb-dek">Fans ranked by how many more games they got right than Clark, on the same games.</p>}
        {board === 'week' && <p className="lb-dek">Week {week} · points come from your confidence: right at 80% earns 30, wrong at 80% costs 30.</p>}

        <SignInGate feature="leaderboard" preview={<GatePreview shape="table" />}>
        <div className="lb-two">
          <div>
            {board === 'fanbases' ? <Fanbases games={predictions} myTeam={user?.favoriteTeam ?? null} /> : (
              <>
                {(loading || status === 'loading') && <div className="lb-pad gr-muted flex items-center gap-2"><RefreshCw className="w-4 h-4 animate-spin" />Loading the board</div>}
                {status === 'error' && (
                  <div className="clark-card">
                    <AlertCircle className="w-8 h-8 shrink-0" style={{ color: 'var(--loss)' }} />
                    <p>Couldn't load the leaderboard.<small>{error}</small></p>
                    <button type="button" className="pill pill-red ml-auto" onClick={retry}>Try again</button>
                  </div>
                )}
                {status === 'ready' && rows.length === 0 && <p className="gr-muted lb-pad">Nobody has a graded pick {board === 'week' ? 'this week' : 'yet'}. First one on the board wins bragging rights.</p>}
                {status === 'ready' && rows.length > 0 && <FanTable rows={rows} board={board} myId={myId} />}
              </>
            )}
          </div>
          {board !== 'fanbases' && <Aside rows={rows} myId={myId} clark={clark} board={board} week={week} />}
        </div>
        </SignInGate>
      </main>
      <Footer />
    </div>
  );
}
