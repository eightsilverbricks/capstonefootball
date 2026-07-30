// ─── useAuthDialog — one dialog, openable from anywhere ───────────────────────
// The sign-up CTA appears in the header, three places on the landing page, and
// on the empty-state prompts. Rather than each of them owning a copy of the
// dialog, they push a request into this store and the single <AuthDialogHost />
// mounted in App.tsx renders it.
//
// Same module-store + useSyncExternalStore shape as useUserPicks / useAuth.

import { useSyncExternalStore } from 'react';
import type { AuthMode } from '@/components/auth/AuthDialog';

interface AuthDialogState {
  open: boolean;
  mode: AuthMode;
}

const CLOSED: AuthDialogState = { open: false, mode: 'signup' };

let state: AuthDialogState = CLOSED;
const listeners = new Set<() => void>();

function emit(next: AuthDialogState): void {
  state = next;
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function getSnapshot(): AuthDialogState {
  return state;
}

/** Open the account dialog on the sign-up (default) or sign-in side. */
export function openAuthDialog(mode: AuthMode = 'signup'): void {
  emit({ open: true, mode });
}

export function closeAuthDialog(): void {
  // Keep the last mode so the closing animation doesn't visibly swap forms.
  emit({ ...state, open: false });
}

export function useAuthDialog(): AuthDialogState {
  return useSyncExternalStore(subscribe, getSnapshot, () => CLOSED);
}
