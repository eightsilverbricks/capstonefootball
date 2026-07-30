import React, { useEffect, useId, useState } from 'react';
import { AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { ClarkMark } from '@/components/brand/ClarkLogo';
import TeamPicker from './TeamPicker';
import { useAuth } from '@/hooks/useAuth';
import { AuthError } from '@/auth/types';

export type AuthMode = 'signup' | 'signin';

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Which side of the form to open on. Users can flip once it's open. */
  defaultMode?: AuthMode;
  /** Fired after a successful sign-up or sign-in, once the dialog has closed. */
  onSuccess?: () => void;
}

const inputStyle: React.CSSProperties = {
  background: 'var(--bg)',
  border: '1px solid var(--border-default)',
  color: 'var(--text-primary)',
};

const COPY = {
  signup: {
    title: 'Join The Clark Competition',
    blurb: 'Free, no risk, no card. Make picks, track your record, talk trash.',
    submit: 'Create my account',
    switchPrompt: 'Already have an account?',
    switchAction: 'Sign in',
  },
  signin: {
    title: 'Welcome back',
    blurb: 'Pick up your season right where you left it.',
    submit: 'Sign in',
    switchPrompt: 'New here?',
    switchAction: 'Create an account',
  },
} as const;

/**
 * The one place anyone creates an account or signs in. Opened from the landing
 * page CTAs and the header, so both entry points get exactly the same flow.
 *
 * Accounts are device-local for now (see src/auth/localAuthClient.ts) — this
 * component talks only to useAuth, so it needs no changes when the real backend
 * lands.
 */
const AuthDialog: React.FC<AuthDialogProps> = ({
  open,
  onOpenChange,
  defaultMode = 'signup',
  onSuccess,
}) => {
  const { signUp, signIn } = useAuth();
  const fieldId = useId();

  const [mode, setMode] = useState<AuthMode>(defaultMode);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [team, setTeam] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<AuthError | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Reopening should always land on the mode the caller asked for, with no
  // stale error text from the previous attempt.
  useEffect(() => {
    if (open) {
      setMode(defaultMode);
      setError(null);
      setSubmitting(false);
    }
  }, [open, defaultMode]);

  const isSignUp = mode === 'signup';
  const copy = COPY[mode];

  const switchMode = () => {
    setMode(isSignUp ? 'signin' : 'signup');
    setError(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError(null);

    const result = isSignUp
      ? await signUp({ email, password, displayName, favoriteTeam: team })
      : await signIn({ email, password });

    setSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setDisplayName('');
    setEmail('');
    setPassword('');
    setTeam(null);
    onOpenChange(false);
    onSuccess?.();
  };

  const errorFor = (field: AuthError['field']) => (error?.field === field ? error.message : null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md border"
        style={{ background: 'var(--surface)', borderColor: 'var(--border-default)' }}
      >
        <div className="flex flex-col items-center text-center gap-2 pt-1">
          <ClarkMark size={40} titled={false} />
          <DialogTitle
            className="font-bold"
            style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--text-primary)' }}
          >
            {copy.title}
          </DialogTitle>
          <DialogDescription className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
            {copy.blurb}
          </DialogDescription>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 mt-1" noValidate>
          {isSignUp && (
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor={`${fieldId}-name`}
                className="text-[11px] uppercase tracking-[0.18em]"
                style={{ color: 'var(--text-muted)' }}
              >
                Display name
              </label>
              <input
                id={`${fieldId}-name`}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                autoComplete="name"
                placeholder="What should the leaderboard call you?"
                className="w-full rounded-lg px-3 py-2.5 text-sm outline-none transition-colors focus:border-[var(--accent-gold)]"
                style={inputStyle}
                aria-invalid={errorFor('displayName') != null}
              />
              {errorFor('displayName') && <FieldError message={errorFor('displayName')!} />}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor={`${fieldId}-email`}
              className="text-[11px] uppercase tracking-[0.18em]"
              style={{ color: 'var(--text-muted)' }}
            >
              Email
            </label>
            <input
              id={`${fieldId}-email`}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="you@example.com"
              className="w-full rounded-lg px-3 py-2.5 text-sm outline-none transition-colors focus:border-[var(--accent-gold)]"
              style={inputStyle}
              aria-invalid={errorFor('email') != null}
            />
            {errorFor('email') && <FieldError message={errorFor('email')!} />}
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor={`${fieldId}-password`}
              className="text-[11px] uppercase tracking-[0.18em]"
              style={{ color: 'var(--text-muted)' }}
            >
              Password
            </label>
            <div className="relative">
              <input
                id={`${fieldId}-password`}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                placeholder={isSignUp ? 'At least 8 characters' : '••••••••'}
                className="w-full rounded-lg px-3 py-2.5 pr-10 text-sm outline-none transition-colors focus:border-[var(--accent-gold)]"
                style={inputStyle}
                aria-invalid={errorFor('password') != null}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md"
                style={{ color: 'var(--text-muted)' }}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errorFor('password') && <FieldError message={errorFor('password')!} />}
          </div>

          {isSignUp && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>
                Who do you root for?
              </span>
              <TeamPicker value={team} onChange={setTeam} label="Your favorite team" />
            </div>
          )}

          {error && !error.field && <FieldError message={error.message} />}

          <button
            type="submit"
            disabled={submitting}
            className="mt-1 inline-flex items-center justify-center gap-2 w-full rounded-lg px-4 py-3 text-sm font-semibold uppercase tracking-wide transition-opacity disabled:opacity-60"
            style={{ background: 'var(--accent-gold)', color: '#111' }}
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
            {submitting ? 'One second…' : copy.submit}
          </button>

          <p className="text-center text-xs" style={{ color: 'var(--text-muted)' }}>
            {copy.switchPrompt}{' '}
            <button
              type="button"
              onClick={switchMode}
              className="underline underline-offset-2"
              style={{ color: 'var(--accent-gold)' }}
            >
              {copy.switchAction}
            </button>
          </p>

          {isSignUp && (
            <p className="text-center text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              No money, no odds, no card — The Clark Competition is played for bragging rights only.
            </p>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
};

const FieldError: React.FC<{ message: string }> = ({ message }) => (
  <p className="flex items-start gap-1.5 text-xs" style={{ color: 'var(--stake-negative)' }} role="alert">
    <AlertCircle className="w-3.5 h-3.5 mt-px shrink-0" aria-hidden="true" />
    {message}
  </p>
);

export default AuthDialog;
