import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useCountUp } from './useCountUp';

function setReducedMotion(reduce: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: reduce && query.includes('prefers-reduced-motion'),
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

describe('useCountUp', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    setReducedMotion(false);
  });

  it('always reaches the exact target — a decorative animation must never display a wrong number', async () => {
    setReducedMotion(false);
    const { result } = renderHook(() => useCountUp(71.2, 20));
    await waitFor(() => expect(result.current.value).toBe(71.2));
  });

  it('shows the target immediately under prefers-reduced-motion', () => {
    setReducedMotion(true);
    const { result } = renderHook(() => useCountUp(285));
    expect(result.current.value).toBe(285);
  });

  it('falls back to the target when requestAnimationFrame is unavailable', () => {
    setReducedMotion(false);
    vi.stubGlobal('requestAnimationFrame', undefined);
    const { result } = renderHook(() => useCountUp(203));
    expect(result.current.value).toBe(203);
  });

  it('does not depend on IntersectionObserver firing', async () => {
    // Regression: gating the count on IO left the landing page showing "0.0%"
    // next to a caption reading "203 of 285 games" wherever IO never fired.
    setReducedMotion(false);
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        observe() {}
        disconnect() {}
        unobserve() {}
      },
    );
    const { result } = renderHook(() => useCountUp(99, 20));
    await waitFor(() => expect(result.current.value).toBe(99));
  });

  it('exposes a ref callback that is safe to attach and detach', () => {
    setReducedMotion(false);
    const { result } = renderHook(() => useCountUp(10, 20));
    expect(() => {
      act(() => {
        result.current.ref(document.createElement('li') as unknown as HTMLElement);
        result.current.ref(null);
      });
    }).not.toThrow();
  });
});
