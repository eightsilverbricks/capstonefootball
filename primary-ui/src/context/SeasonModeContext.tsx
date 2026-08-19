// ─── Season mode provider ────────────────────────────────────────────────────
// Holds which dataset the whole app is reading. Lives above the router so that
// flipping the toggle on /settings re-renders every surface at once rather than
// leaving stale 2024 cards behind on pages the user has already visited.

import { createContext, useCallback, useContext, useMemo, useState, ReactNode } from 'react';
import { SeasonConfig, SeasonMode, seasonConfig } from '@/lib/season';
import { readSeasonMode, writeSeasonMode } from '@/lib/seasonMode';

interface SeasonModeValue {
  mode: SeasonMode;
  config: SeasonConfig;
  setMode: (mode: SeasonMode) => void;
}

const SeasonModeContext = createContext<SeasonModeValue | null>(null);

export function SeasonModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<SeasonMode>(() => readSeasonMode());

  const setMode = useCallback((next: SeasonMode) => {
    setModeState(next);
    writeSeasonMode(next);
  }, []);

  const value = useMemo(
    () => ({ mode, config: seasonConfig(mode), setMode }),
    [mode, setMode],
  );

  return (
    <SeasonModeContext.Provider value={value}>{children}</SeasonModeContext.Provider>
  );
}

export function useSeasonMode(): SeasonModeValue {
  const ctx = useContext(SeasonModeContext);
  if (!ctx) {
    throw new Error('useSeasonMode must be used inside a SeasonModeProvider');
  }
  return ctx;
}
