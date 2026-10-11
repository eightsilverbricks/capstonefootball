import { useCallback, useEffect, useState } from 'react';
import { ThemePreference, applyTheme, readThemePreference, saveThemePreference } from '@/lib/theme';

/** Current theme preference plus a setter; re-applies when the OS theme flips under "system". */
export function useTheme() {
  const [preference, setPreference] = useState<ThemePreference>(readThemePreference);

  useEffect(() => {
    if (preference !== 'system' || typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme('system');
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [preference]);

  const setTheme = useCallback((next: ThemePreference) => {
    saveThemePreference(next);
    setPreference(next);
  }, []);

  return { preference, setTheme };
}
