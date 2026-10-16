import { useMemo } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SeasonOverview from '@/components/my-season/SeasonOverview';
import PicksGrid from '@/components/my-season/PicksGrid';
import SettingsPanel from '@/components/my-season/SettingsPanel';
import { usePredictions } from '@/hooks/usePredictions';
import { useUserPicks } from '@/hooks/useUserPicks';
import { useFanSentiment } from '@/hooks/useFanSentiment';
import { useAuth } from '@/hooks/useAuth';
import SignInGate, { GatePreview } from '@/components/auth/SignInGate';
import { computeSeasonSummary } from '@/lib/seasonSummary';
import { computeSeasonHistory } from '@/lib/seasonHistory';
import { divisionLines, pickRows, splits, weekLines } from '@/lib/seasonBreakdown';
import { getEspnLogoUrl } from '@/data/nflData';
import { getTeam } from '@/data/teams';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'picks', label: 'Picks' },
  { id: 'settings', label: 'Settings' },
] as const;
type TabId = (typeof TABS)[number]['id'];

const isTab = (v: string | null): v is TabId => TABS.some((t) => t.id === v);
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?';
const joined = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });

/** My season: profile header, then Overview · Picks · Settings (tab kept in the URL). */
export default function MySeasonPage() {
  const [params, setParams] = useSearchParams();
  const raw = params.get('tab');
  const tab: TabId = isTab(raw) ? raw : 'overview';
  const { user, isSignedIn } = useAuth();
  const { predictions } = usePredictions();
  const { picks } = useUserPicks();
  const pickedKeys = useMemo(() => Object.keys(picks), [picks]);
  const { sentiment } = useFanSentiment(pickedKeys);

  const summary = useMemo(() => computeSeasonSummary(picks, predictions), [picks, predictions]);
  const history = useMemo(() => computeSeasonHistory(picks, predictions, sentiment), [picks, predictions, sentiment]);
  const rows = useMemo(() => pickRows(picks, predictions), [picks, predictions]);
  const weeks = useMemo(() => weekLines(rows), [rows]);
  const split = useMemo(() => splits(rows, user?.favoriteTeam ?? null), [rows, user?.favoriteTeam]);
  const divisions = useMemo(() => divisionLines(rows), [rows]);

  const team = user?.favoriteTeam ? getTeam(user.favoriteTeam) : undefined;
  const select = (id: TabId) => setParams(id === 'overview' ? {} : { tab: id }, { replace: true });

  return (
    <div className="min-h-screen ms-page">
      <Header />
      <section className="ms-profile">
        <div className="ms-wrap ms-profile-in">
          {user ? (
            <>
              <span className="ms-avatar" aria-hidden="true">{initials(user.displayName)}</span>
              <div>
                <h1>{user.displayName}</h1>
                <div className="ms-meta">
                  @{user.handle}
                  {team && <> · <img src={getEspnLogoUrl(team.abbr)} alt="" width={18} height={18} />{team.name} fan</>}
                  {' · '}Joined {joined(user.createdAt)}
                </div>
              </div>
            </>
          ) : (
            <h1>My season</h1>
          )}
          <nav className="ms-tabs" role="tablist" aria-label="My season">
            {TABS.map((t) => (
              <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => select(t.id)}>{t.label}</button>
            ))}
          </nav>
        </div>
      </section>

      <main className="ms-wrap ms-main">
        {tab === 'settings' && <SettingsPanel />}
        {tab !== 'settings' && !isSignedIn && <SignInGate feature="my-season" preview={<GatePreview shape="rows" />} />}
        {tab === 'overview' && isSignedIn && (
          <SeasonOverview summary={summary} history={history} weeks={weeks} splits={split} divisions={divisions} />
        )}
        {tab === 'picks' && isSignedIn && <PicksGrid weeks={weeks} rows={rows} />}
      </main>
      <Footer />
    </div>
  );
}

/** Old /settings links land on the Settings tab. */
export function SettingsRedirect() {
  return <Navigate to="/my-season?tab=settings" replace />;
}
