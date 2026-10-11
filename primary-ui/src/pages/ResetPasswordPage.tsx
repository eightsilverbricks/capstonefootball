import React, { useEffect, useId, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Loader2 } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useAuth } from '@/hooks/useAuth';
import { openAuthDialog } from '@/hooks/useAuthDialog';

/** How long to wait for Supabase to turn the emailed link into a session. */
const LINK_CHECK_MS = 4000;

const inputStyle: React.CSSProperties = {
  background: 'var(--bg)',
  border: '1px solid var(--border-default)',
  color: 'var(--text-primary)',
};

/**
 * Where the password-reset email lands. supabase-js reads the token from the
 * URL and signs the user in for recovery; this page then sets the new password.
 */
const ResetPasswordPage: React.FC = () => {
  const { isSignedIn, updatePassword } = useAuth();
  const navigate = useNavigate();
  const fieldId = useId();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [linkChecked, setLinkChecked] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setLinkChecked(true), LINK_CHECK_MS);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    if (password !== confirm) {
      setError("The two passwords don't match.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const { error: updateError } = await updatePassword(password);
    setSubmitting(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    navigate('/', { replace: true });
  };

  let body: React.ReactNode;
  if (isSignedIn) {
    body = (
      <form onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>
        <label htmlFor={`${fieldId}-new`} className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          New password
        </label>
        <input
          id={`${fieldId}-new`}
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters"
          className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
          style={inputStyle}
        />
        <label htmlFor={`${fieldId}-confirm`} className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Confirm new password
        </label>
        <input
          id={`${fieldId}-confirm`}
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
          style={inputStyle}
        />
        {error && (
          <p className="flex items-start gap-1.5 text-xs" role="alert" style={{ color: 'var(--stake-negative)' }}>
            <AlertCircle className="w-3.5 h-3.5 mt-px shrink-0" aria-hidden="true" />
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="mt-1 inline-flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold disabled:opacity-60"
          style={{ background: 'var(--accent-gold)', color: 'var(--brand-contrast)' }}
        >
          {submitting && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
          Save new password
        </button>
      </form>
    );
  } else if (!linkChecked) {
    body = (
      <p className="flex items-center gap-2 text-sm" role="status" style={{ color: 'var(--text-secondary)' }}>
        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
        Checking your reset link…
      </p>
    );
  } else {
    body = (
      <div className="flex flex-col gap-3">
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          This reset link is invalid or has expired. Request a new one.
        </p>
        <button
          type="button"
          onClick={() => openAuthDialog('reset')}
          className="rounded-lg px-4 py-3 text-sm font-semibold"
          style={{ background: 'var(--accent-gold)', color: 'var(--brand-contrast)' }}
        >
          Send a new link
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)', color: 'var(--text-primary)' }}>
      <Header />
      <main className="flex-1 flex items-start justify-center px-4 py-16">
        <section aria-labelledby="reset-heading" className="w-full max-w-sm flex flex-col gap-5">
          <h1 id="reset-heading" className="text-2xl font-semibold">Set a new password</h1>
          {body}
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default ResetPasswordPage;
