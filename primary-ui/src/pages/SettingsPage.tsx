import React from 'react';
import PageShell from '@/components/layout/PageShell';
import Card from '@/components/layout/Card';
import { useSeasonMode } from '@/context/SeasonModeContext';
import { useTheme } from '@/hooks/useTheme';
import { ThemePreference } from '@/lib/theme';
import { LIVE_SEASON, DEMO_SEASON } from '@/lib/season';

interface Option<T extends string> {
  id: T;
  label: string;
}

interface SegmentedProps<T extends string> {
  label: string;
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
}

/** A row of mutually exclusive buttons (radio group). */
function Segmented<T extends string>({ label, options, value, onChange }: SegmentedProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex rounded-md p-0.5"
      style={{ background: 'var(--surface-overlay)' }}
    >
      {options.map((option) => {
        const selected = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.id)}
            className="h-8 px-3.5 rounded text-sm font-medium transition-colors"
            style={{
              background: selected ? 'var(--surface)' : 'transparent',
              color: selected ? 'var(--text-primary)' : 'var(--text-tertiary)',
              boxShadow: selected ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

const THEME_OPTIONS: readonly Option<ThemePreference>[] = [
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
  { id: 'system', label: 'System' },
];

const SEASON_OPTIONS: readonly Option<'live' | 'demo'>[] = [
  { id: 'live', label: `${LIVE_SEASON} season` },
  { id: 'demo', label: `${DEMO_SEASON} demo` },
];

const SettingRow: React.FC<{ title: string; detail: string; children: React.ReactNode }> = ({ title, detail, children }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-4" style={{ borderTop: '1px solid var(--divider)' }}>
    <div className="min-w-0">
      <p className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</p>
      <p className="text-[13px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{detail}</p>
    </div>
    {children}
  </div>
);

const SettingsPage: React.FC = () => {
  const { mode, setMode } = useSeasonMode();
  const { preference, setTheme } = useTheme();

  return (
    <PageShell title="Settings">
      <div className="max-w-2xl">
        <Card title="Display" flush>
          <SettingRow title="Theme" detail="System follows your device setting.">
            <Segmented label="Theme" options={THEME_OPTIONS} value={preference} onChange={setTheme} />
          </SettingRow>
          <SettingRow
            title="Season data"
            detail={`The ${DEMO_SEASON} demo uses a finished season, so picks are graded right away. Demo picks don't count toward your ${LIVE_SEASON} record.`}
          >
            <Segmented label="Season data" options={SEASON_OPTIONS} value={mode} onChange={setMode} />
          </SettingRow>
        </Card>
        <p className="text-[13px] mt-3" style={{ color: 'var(--text-tertiary)' }}>
          Saved on this device.
        </p>
      </div>
    </PageShell>
  );
};

export default SettingsPage;
