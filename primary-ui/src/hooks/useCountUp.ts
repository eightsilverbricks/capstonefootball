// ─── useCountUp — numbers that tick up to their final value ───────────────────
// Used on the landing page's proof stats.
//
// This deliberately does NOT gate on IntersectionObserver. An earlier version
// did, and when IO never fired (throttled tabs, embedded webviews, some
// automation and privacy contexts) the counter stayed pinned at 0 — rendering
// "0.0% CLARK CALLED IT — 203 of 285 games", a stat that contradicts its own
// caption. A decorative animation must never be able to display a wrong number,
// so the animation now always runs to completion on mount and the final value
// is guaranteed.
//
// Under prefers-reduced-motion the target is set immediately and no frame is
// ever scheduled.

import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from './useReducedMotion';

const DEFAULT_DURATION_MS = 1100;

/** Ease-out cubic — fast start, gentle landing. */
function easeOut(t: number): number {
  return 1 - (1 - t) ** 3;
}

export interface CountUpResult<T extends Element> {
  value: number;
  /** Attach to the element being counted. Kept for call-site ergonomics. */
  ref: (node: T | null) => void;
}

export function useCountUp<T extends Element = HTMLElement>(
  target: number,
  durationMs = DEFAULT_DURATION_MS,
): CountUpResult<T> {
  const prefersReducedMotion = useReducedMotion();
  const [value, setValue] = useState(prefersReducedMotion ? target : 0);
  const nodeRef = useRef<T | null>(null);
  const ref = (node: T | null) => {
    nodeRef.current = node;
  };

  useEffect(() => {
    if (prefersReducedMotion) {
      setValue(target);
      return;
    }

    let frame = 0;
    let startTime = 0;

    const step = (now: number) => {
      if (!startTime) startTime = now;
      const progress = Math.min(1, (now - startTime) / durationMs);
      // Land exactly on the target rather than on an eased approximation.
      setValue(progress === 1 ? target : target * easeOut(progress));
      if (progress < 1) frame = requestAnimationFrame(step);
    };

    // No rAF (very old or headless environments) — show the real number.
    if (typeof requestAnimationFrame === 'undefined') {
      setValue(target);
      return;
    }

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs, prefersReducedMotion]);

  return { value, ref };
}
