// ─── Small shared formatters for stake-scored UI ──────────────────────────────

/** Signed integer with an explicit + on positives (e.g. 30 → "+30", -12 → "-12"). */
export function signed(n: number): string {
  const r = Math.round(n);
  return r > 0 ? `+${r}` : `${r}`;
}

/** Stake semantics color: green when up, red when down, neutral at zero. */
export function stakeColor(n: number): string {
  if (n > 0) return 'var(--stake-positive)';
  if (n < 0) return 'var(--stake-negative)';
  return 'var(--text-secondary)';
}

/** 0–1 fraction → whole-percent string. */
export function pct(x: number): string {
  return `${Math.round(x * 100)}%`;
}
