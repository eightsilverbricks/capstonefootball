/**
 * Theme preference — light is the default (ESPN-style); dark can be chosen
 * explicitly or follow the system. index.html applies the stored value before
 * first paint so there is no flash; this module keeps it in sync afterwards.
 */
export type ThemePreference = 'light' | 'dark' | 'system';

export const THEME_STORAGE_KEY = 'clark-theme';
const DEFAULT_THEME: ThemePreference = 'light';
const THEME_COLORS = { light: '#F2F3F5', dark: '#0E1013' } as const;

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system';
}

export function readThemePreference(): ThemePreference {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(stored) ? stored : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

export function resolveTheme(pref: ThemePreference, systemDark: boolean): 'light' | 'dark' {
  if (pref === 'system') return systemDark ? 'dark' : 'light';
  return pref;
}

function systemPrefersDark(): boolean {
  return typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function applyTheme(pref: ThemePreference): void {
  const resolved = resolveTheme(pref, systemPrefersDark());
  const root = document.documentElement;
  root.classList.toggle('dark', resolved === 'dark');
  root.style.colorScheme = resolved;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[resolved]);
}

export function saveThemePreference(pref: ThemePreference): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, pref);
  } catch {
    // Storage blocked (private mode) — the choice still applies for this visit.
  }
  applyTheme(pref);
}
