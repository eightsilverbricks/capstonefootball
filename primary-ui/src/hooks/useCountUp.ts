// ─── useCountUp — numbers that tick up when they scroll into view ─────────────
// Used on the landing page's proof stats. Deliberately cheap: one rAF loop that
// stops the moment it reaches the target, started once by an IntersectionObserver
// so off-screen stats cost nothing.
//
// Under prefers-reduced-motion the hook returns the final value immediately and
// never schedules a frame.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useReducedMotion } from './useReducedMotion';

const DEFAULT_DURATION_MS = 1100;

/** Ease-out cubic — fast start, gentle landing. */
function easeOut(t: number): number {
  return 1 - (1 - t) ** 3;
}

export interface CountUpResult<T extends Element> {
  value: number;
  /** Attach to the element whose visibility should start the count. */
  ref: (node: T | null) => void;
}

export function useCountUp<T extends Element = HTMLElement>(
  target: number,
  durationMs = DEFAULT_DURATION_MS,
): CountUpResult<T> {
  const prefersReducedMotion = useReducedMotion();
  const [value, setValue] = useState(prefersReducedMotion ? target : 0);
  const [node, setNode] = useState<T | null>(null);
  const startedRef = useRef(false);

  const ref = useCallback((next: T | null) => setNode(next), []);

  useEffect(() => {
    if (prefersReducedMotion) {
      setValue(target);
      return;
    }
    if (!node || startedRef.current) return;

    let frame = 0;
    let startTime = 0;

    const step = (now: number) => {
      if (!startTime) startTime = now;
      const progress = Math.min(1, (now - startTime) / durationMs);
      setValue(target * easeOut(progress));
      if (progress < 1) frame = requestAnimationFrame(step);
    };

    // No IntersectionObserver (older webview, jsdom) — just show the number.
    if (typeof IntersectionObserver === 'undefined') {
      setValue(target);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting) || startedRef.current) return;
        startedRef.current = true;
        observer.disconnect();
        frame = requestAnimationFrame(step);
      },
      { threshold: 0.4 },
    );
    observer.observe(node);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [node, target, durationMs, prefersReducedMotion]);

  return { value, ref };
}
