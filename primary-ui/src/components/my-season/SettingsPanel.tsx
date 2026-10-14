import { FormEvent, ReactNode, useEffect, useState } from 'react';
import { deleteMyAccount, getHiddenFromLeaderboards, setHiddenFromLeaderboards } from '@/data/accountRepository';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { useSeasonMode } from '@/context/SeasonModeContext';
import { ThemePreference } from '@/lib/theme';
import { LIVE_SEASON, DEMO_SEASON } from '@/lib/season';
import { TEAMS } from '@/data/teams';
import { getEspnLogoUrl } from '@/data/nflData';
import { toast } from '@/lib/fx';

interface Option<T extends string> { id: T; label: string }

function Segmented<T extends string>({ label, options, value, onChange }: { label: string; options: readonly Option<T>[]; value: T; onChange: (v: T) => void }) {
  return (
    <div role="radiogroup" aria-label={label} className="ms-seg">
      {options.map((o) => (
        <button key={o.id} type="button" role="radio" aria-checked={o.id === value} onClick={() => onChange(o.id)}>{o.label}</button>
      ))}
    </div>
  );
}

function Row({ label, hint, htmlFor, children }: { label: string; hint?: string; htmlFor?: string; children: ReactNode }) {
  return (
    <div className="ms-form-row">
      <label htmlFor={htmlFor}>{label}{hint && <small>{hint}</small>}</label>
      <div>{children}</div>
    </div>
  );
}

const THEME_OPTIONS: readonly Option<ThemePreference>[] = [
  { id: 'light', label: 'Light' }, { id: 'dark', label: 'Dark' }, { id: 'system', label: 'System' },
];
const SEASON_OPTIONS: readonly Option<'live' | 'demo'>[] = [
  { id: 'live', label: `${LIVE_SEASON} season` }, { id: 'demo', label: `${DEMO_SEASON} demo` },
];
const HANDLE_PATTERN = /^[a-z0-9_]{3,30}$/;

function ProfileForm() {
  const { user, updateProfile } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [handle, setHandle] = useState(user?.handle ?? '');
  const [team, setTeam] = useState(user?.favoriteTeam ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!user) return null;

  const dirty = displayName !== user.displayName || handle !== user.handle || (team || null) !== user.favoriteTeam;

  const save = async (e: FormEvent) => {
    e.preventDefault();
    const name = displayName.trim();
    const h = handle.trim().toLowerCase();
    if (!name) { setError('Display name can’t be empty.'); return; }
    if (!HANDLE_PATTERN.test(h)) { setError('Handles are 3–30 characters: letters, numbers and underscores.'); return; }
    setSaving(true);
    setError(null);
    const result = await updateProfile({ displayName: name, handle: h, favoriteTeam: team || null });
    setSaving(false);
    if (result.error) { setError(result.error.message); return; }
    toast('Saved. Looking good.');
  };

  return (
    <form className="ms-card" onSubmit={save} noValidate>
      <div className="ms-ch"><h2>Profile</h2></div>
      <Row label="Display name" htmlFor="ms-name"><input id="ms-name" value={displayName} maxLength={40} onChange={(e) => setDisplayName(e.target.value)} /></Row>
      <Row label="Handle" hint="Shown on leaderboards" htmlFor="ms-handle"><input id="ms-handle" value={handle} maxLength={30} onChange={(e) => setHandle(e.target.value)} /></Row>
      <Row label="Favorite team" hint="Sets your fanbase on the leaderboard" htmlFor="ms-team">
        <div className="ms-teamsel">
          {team && <img src={getEspnLogoUrl(team)} alt="" width={28} height={28} />}
          <select id="ms-team" value={team} onChange={(e) => setTeam(e.target.value)}>
            <option value="">No team</option>
            {[...TEAMS].sort((a, b) => a.city.localeCompare(b.city)).map((t) => <option key={t.abbr} value={t.abbr}>{t.city} {t.name}</option>)}
          </select>
        </div>
      </Row>
      <div className="ms-form-foot">
        {error && <span className="ms-error" role="alert">{error}</span>}
        <button type="submit" className="pill pill-red" disabled={!dirty || saving}>{saving ? 'Saving' : 'Save changes'}</button>
      </div>
    </form>
  );
}

const DELETE_WORD = 'DELETE';

function AccountCard() {
  const { user, requestPasswordReset, signOut } = useAuth();
  const [sent, setSent] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (user) getHiddenFromLeaderboards(user.id).then(setHidden).catch(() => {}); }, [user]);
  if (!user) return null;

  const toggleHidden = async () => {
    const next = !hidden;
    setHidden(next);
    const error = await setHiddenFromLeaderboards(user.id, next);
    if (error) { setHidden(!next); toast(`Couldn't save: ${error}`); return; }
    toast(next ? "You're hidden from leaderboards." : "You're back on the leaderboards.");
  };
  const remove = async () => {
    setBusy(true);
    const error = await deleteMyAccount();
    setBusy(false);
    if (error) { toast(`Couldn't delete the account: ${error}`); return; }
    toast('Your account and picks were deleted.');
    await signOut();
  };
  const reset = async () => {
    const { error } = await requestPasswordReset(user.email);
    if (error) { toast(`Couldn't send the email: ${error.message}`); return; }
    setSent(true);
  };
  return (
    <section className="ms-card">
      <div className="ms-ch"><h2>Account</h2></div>
      <Row label="Email"><span>{user.email}</span></Row>
      <Row label="Password">
        {sent ? <span className="gr-muted">Check your email for a reset link.</span> : <button type="button" className="pill pill-line" onClick={reset}>Email me a reset link</button>}
      </Row>
      <Row label="Leaderboards" hint="Your picks still count; your name just isn't shown to others">
        <label className="ms-switch">
          <input type="checkbox" checked={hidden} onChange={toggleHidden} />
          <span>Hide me from leaderboards</span>
        </label>
      </Row>
      <Row label="Sign out"><button type="button" className="pill pill-line" onClick={() => void signOut()}>Sign out</button></Row>
      <Row label="Delete account" hint="Removes your account, picks, chat and comments for good">
        {confirming ? (
          <span className="ms-delete">
            <input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={`Type ${DELETE_WORD}`} aria-label={`Type ${DELETE_WORD} to confirm`} />
            <button type="button" className="pill pill-red" disabled={typed !== DELETE_WORD || busy} onClick={remove}>{busy ? 'Deleting' : 'Delete forever'}</button>
            <button type="button" className="pill pill-line" onClick={() => { setConfirming(false); setTyped(''); }}>Cancel</button>
          </span>
        ) : <button type="button" className="pill pill-line" onClick={() => setConfirming(true)}>Delete my account</button>}
      </Row>
    </section>
  );
}

/** Settings tab: profile and account when signed in, display options always. */
export default function SettingsPanel() {
  const { preference, setTheme } = useTheme();
  const { mode, setMode } = useSeasonMode();
  return (
    <div className="ms-stack ms-settings">
      <ProfileForm />
      <AccountCard />
      <section className="ms-card">
        <div className="ms-ch"><h2>Display</h2></div>
        <Row label="Theme" hint="System follows your device"><Segmented label="Theme" options={THEME_OPTIONS} value={preference} onChange={setTheme} /></Row>
        <Row label="Season data" hint={`The ${DEMO_SEASON} demo grades picks right away. Demo picks don't count toward ${LIVE_SEASON}.`}>
          <Segmented label="Season data" options={SEASON_OPTIONS} value={mode} onChange={setMode} />
        </Row>
      </section>
    </div>
  );
}
