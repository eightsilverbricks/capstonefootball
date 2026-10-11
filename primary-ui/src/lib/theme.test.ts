import { describe, expect, it, beforeEach } from 'vitest';
import { isThemePreference, readThemePreference, resolveTheme, saveThemePreference, THEME_STORAGE_KEY } from './theme';

describe('theme', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  it('defaults to light when nothing is stored', () => {
    expect(readThemePreference()).toBe('light');
  });

  it('ignores an unknown stored value', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'neon');
    expect(readThemePreference()).toBe('light');
  });

  it('resolves system against the OS setting', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });

  it('saving dark stores it and sets the dark class', () => {
    saveThemePreference('dark');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('validates preferences', () => {
    expect(isThemePreference('system')).toBe(true);
    expect(isThemePreference(null)).toBe(false);
  });
});
