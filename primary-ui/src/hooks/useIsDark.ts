import { useSyncExternalStore } from 'react';

/** True while the dark theme is on (html.dark, set by lib/theme.ts). */
export function useIsDark(): boolean {
  return useSyncExternalStore(
    (cb) => {
      if (typeof MutationObserver === 'undefined') return () => {};
      const obs = new MutationObserver(cb);
      obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
      return () => obs.disconnect();
    },
    () => document.documentElement.classList.contains('dark'),
    () => false,
  );
}
