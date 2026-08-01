import React, { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Lock, Search, ShieldCheck, Trash2, Users } from 'lucide-react';
import ClarkLogo from '@/components/brand/ClarkLogo';
import TeamLogo from '@/components/TeamLogo';
import {
  AdminAccountRow,
  adminDeleteAccount,
  adminListAccounts,
  adminSubscribe,
} from '@/auth/localAuthClient';

// Gates casual stumbling-in only — this is a client-side string, fully visible
// in the shipped bundle, and provides no real security. It exists so /admin
// isn't one accidental click away from showing signup emails on a shared
// screen. Real access control (and a real multi-device user list) arrives
// with the Supabase backend; this page is a local dev tool until then.
const DEV_PASSPHRASE = 'clarkadmin';
const UNLOCK_KEY = 'clark-index:admin-unlocked';

function useAccounts(): AdminAccountRow[] {
  return useSyncExternalStore(adminSubscribe, adminListAccounts, () => []);
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

const PassphraseGate: React.FC<{ onUnlock: () => void }> = ({ onUnlock }) => {
  const [value, setValue] = useState('');
  const [wrong, setWrong] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value === DEV_PASSPHRASE) {
      try {
        window.sessionStorage.setItem(UNLOCK_KEY, '1');
      } catch {
        // sessionStorage unavailable — the gate just re-prompts next reload
      }
      onUnlock();
    } else {
      setWrong(true);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg)' }}>
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-xl p-6 flex flex-col items-center gap-4 text-center"
        style={{ background: 'var(--surface)', border: '1px solid var(--border-default)' }}
      >
        <ClarkMarkWithLock />
        <div>
          <h1 className="font-bold" style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', color: 'var(--text-primary)' }}>
            Developer access
          </h1>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            Internal tool. Not a real security boundary — see the code comment.
          </p>
        </div>
        <input
          type="password"
          autoFocus
          value={value}
          onChange={(e) => { setValue(e.target.value); setWrong(false); }}
          placeholder="Passphrase"
          className="w-full rounded-lg px-3 py-2.5 text-sm text-center outline-none"
          style={{ background: 'var(--bg)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
        />
        {wrong && <p className="text-xs" style={{ color: 'var(--stake-negative)' }}>Wrong passphrase.</p>}
        <button
          type="submit"
          className="w-full rounded-lg px-4 py-2.5 text-sm font-semibold uppercase tracking-wide"
          style={{ background: 'var(--accent-gold)', color: '#111' }}
        >
          Unlock
        </button>
        <Link to="/" className="text-xs no-underline" style={{ color: 'var(--text-tertiary)' }}>
          ← Back to the site
        </Link>
      </form>
    </div>
  );
};

const ClarkMarkWithLock: React.FC = () => (
  <div className="relative">
    <ClarkLogo variant="mark" size={44} />
    <Lock
      className="absolute -bottom-1.5 -right-1.5 w-5 h-5 rounded-full p-1"
      style={{ background: 'var(--surface-overlay)', color: 'var(--accent-gold)' }}
      aria-hidden="true"
    />
  </div>
);

interface StatPillProps {
  label: string;
  value: string | number;
}

const StatPill: React.FC<StatPillProps> = ({ label, value }) => (
  <div
    className="flex flex-col gap-0.5 px-4 py-3 rounded-lg"
    style={{ background: 'var(--surface)', border: '1px solid var(--border-subtle)' }}
  >
    <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{label}</span>
    <span
      className="font-bold tabular-nums"
      style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--text-primary)' }}
    >
      {value}
    </span>
  </div>
);

const AccountsTable: React.FC = () => {
  const accounts = useAccounts();
  const [query, setQuery] = useState('');
  const [pendingDelete, setPendingDelete] = useState<AdminAccountRow | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return accounts;
    return accounts.filter(
      (a) =>
        a.displayName.toLowerCase().includes(q) ||
        a.handle.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q) ||
        (a.favoriteTeam ?? '').toLowerCase().includes(q),
    );
  }, [accounts, query]);

  const withTeam = accounts.filter((a) => a.favoriteTeam).length;
  const today = new Date().toDateString();
  const signedUpToday = accounts.filter((a) => new Date(a.createdAt).toDateString() === today).length;

  const confirmDelete = () => {
    if (!pendingDelete) return;
    adminDeleteAccount(pendingDelete.id);
    setPendingDelete(null);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatPill label="Total accounts" value={accounts.length} />
        <StatPill label="Picked a team" value={withTeam} />
        <StatPill label="Joined today" value={signedUpToday} />
        <StatPill label="This device only" value="✓" />
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} aria-hidden="true" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, handle, email, or team…"
          className="w-full rounded-lg pl-9 pr-3 py-2.5 text-sm outline-none"
          style={{ background: 'var(--surface)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
          aria-label="Search accounts"
        />
      </div>

      {accounts.length === 0 ? (
        <div
          className="rounded-xl px-5 py-10 text-center"
          style={{ background: 'var(--surface)', border: '1px dashed var(--border-default)' }}
        >
          <Users className="w-6 h-6 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} aria-hidden="true" />
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            No accounts on this device yet. Create one from the homepage to see it here.
          </p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-subtle)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr style={{ background: 'var(--surface-raised)' }}>
                  {['Fan', 'Handle', 'Email', 'Team', 'Joined', ''].map((h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 text-[10px] uppercase tracking-widest font-semibold whitespace-nowrap"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr key={a.id} style={{ background: 'var(--surface)', borderTop: '1px solid var(--border-subtle)' }}>
                    <td className="px-4 py-3 font-semibold whitespace-nowrap" style={{ color: 'var(--text-primary)' }}>
                      {a.displayName}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap" style={{ color: 'var(--text-tertiary)' }}>@{a.handle}</td>
                    <td className="px-4 py-3 whitespace-nowrap" style={{ color: 'var(--text-tertiary)' }}>{a.email}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {a.favoriteTeam ? (
                        <span className="inline-flex items-center gap-1.5">
                          <TeamLogo abbr={a.favoriteTeam} size="sm" className="!w-5 !h-5" />
                          {a.favoriteTeam}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap tabular-nums" style={{ color: 'var(--text-muted)' }}>
                      {formatDate(a.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setPendingDelete(a)}
                        className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md transition-colors"
                        style={{ color: 'var(--stake-negative)', border: '1px solid rgba(248,113,113,0.3)' }}
                        aria-label={`Delete ${a.displayName}'s account`}
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <p className="text-center text-sm py-8" style={{ color: 'var(--text-muted)' }}>
              No accounts match "{query}".
            </p>
          )}
        </div>
      )}

      {pendingDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          role="alertdialog"
          aria-modal="true"
          aria-label="Confirm account deletion"
        >
          <div
            className="w-full max-w-sm rounded-xl p-6 flex flex-col gap-4"
            style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-default)' }}
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" style={{ color: 'var(--stake-negative)' }} aria-hidden="true" />
              <div>
                <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Delete {pendingDelete.displayName}'s account?
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  This removes it from this device permanently — picks, profile, everything. It can't be undone.
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                className="px-4 py-2 rounded-lg text-sm"
                style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-4 py-2 rounded-lg text-sm font-semibold"
                style={{ background: 'var(--stake-negative)', color: '#1a0505' }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Developer-only account admin. Lists every account created on THIS device
 * (see the localAdmin comment in localAuthClient.ts for why it can't be more
 * than that yet) with search and delete. Not linked from any nav — reached
 * only by typing /admin.
 */
const AdminPage: React.FC = () => {
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    try {
      setUnlocked(window.sessionStorage.getItem(UNLOCK_KEY) === '1');
    } catch {
      setUnlocked(false);
    }
  }, []);

  if (!unlocked) return <PassphraseGate onUnlock={() => setUnlocked(true)} />;

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--text-primary)' }}>
      <header style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ClarkLogo size={22} />
            <span className="text-[10px] uppercase tracking-[0.2em] px-2 py-0.5 rounded" style={{ color: 'var(--accent-gold)', border: '1px solid rgba(200,169,110,0.3)' }}>
              Admin
            </span>
          </div>
          <Link to="/" className="text-sm no-underline" style={{ color: 'var(--text-tertiary)' }}>
            ← Back to the site
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10 flex flex-col gap-6">
        <div>
          <h1 className="font-bold" style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)', color: 'var(--text-primary)' }}>
            Accounts
          </h1>
          <p className="flex items-start gap-2 text-sm mt-2 max-w-2xl" style={{ color: 'var(--text-secondary)' }}>
            <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--status-decisive)' }} aria-hidden="true" />
            This lists accounts stored in <em>this browser's</em> local storage only — there's no server yet,
            so it can't show signups from anyone else's device. Once the Supabase backend is wired in, this
            page moves server-side and becomes a real cross-device user list.
          </p>
        </div>

        <AccountsTable />
      </main>
    </div>
  );
};

export default AdminPage;
