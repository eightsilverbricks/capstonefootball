import React from 'react';
import { ModelRecord } from '@/lib/modelRecord';
import { useCountUp } from '@/hooks/useCountUp';

interface Stat {
  value: number;
  /** How to render the counted value. */
  format: (n: number) => string;
  label: string;
  note: string;
}

const CountStat: React.FC<{ stat: Stat; index: number }> = ({ stat, index }) => {
  const { value, ref } = useCountUp<HTMLLIElement>(stat.value);

  return (
    <li
      ref={ref}
      className="flex-1 min-w-[8.5rem] py-5 px-5 flex flex-col gap-1 rise-in"
      style={{
        borderLeft: index > 0 ? '1px solid var(--border-subtle)' : 'none',
        '--rise-delay': `${index * 90}ms`,
      } as React.CSSProperties}
    >
      <span
        className="font-bold tabular-nums leading-none"
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(1.9rem, 4.5vw, 3rem)',
          color: 'var(--accent-gold)',
        }}
      >
        {stat.format(value)}
      </span>
      <span className="text-[11px] uppercase tracking-[0.18em] mt-1" style={{ color: 'var(--text-secondary)' }}>
        {stat.label}
      </span>
      <span className="text-xs leading-snug" style={{ color: 'var(--text-muted)' }}>
        {stat.note}
      </span>
    </li>
  );
};

interface ProofStripProps {
  record: ModelRecord;
}

/**
 * Four numbers that make the pitch instead of describing it. Every figure is
 * computed live from the shipped dataset (see lib/modelRecord.ts) — nothing
 * here is a hardcoded marketing claim that can drift out of date.
 */
const ProofStrip: React.FC<ProofStripProps> = ({ record }) => {
  const highBucket = record.buckets.find((b) => b.label === 'High');

  const stats: Stat[] = [
    {
      value: record.accuracy * 100,
      format: (n) => `${n.toFixed(1)}%`,
      label: 'Clark called it',
      note: `${record.correct} of ${record.played} games in the 2024 season.`,
    },
    {
      value: record.played,
      format: (n) => Math.round(n).toLocaleString(),
      label: 'Games broken down',
      note: 'Every one with its own plain-English report.',
    },
    {
      value: (highBucket?.accuracy ?? 0) * 100,
      format: (n) => `${Math.round(n)}%`,
      label: 'When Clark is sure',
      note: `Hit rate across ${highBucket?.played ?? 0} high-confidence reads.`,
    },
    {
      value: 0,
      format: () => '$0',
      label: 'What it costs',
      note: 'No card, no odds, no catch. Bragging rights only.',
    },
  ];

  return (
    <section aria-label="The Clark Index by the numbers" className="max-w-5xl mx-auto px-4">
      <ul
        className="flex flex-wrap list-none p-0 m-0 rounded-xl overflow-hidden"
        style={{ background: 'var(--surface)', border: '1px solid var(--border-subtle)' }}
      >
        {stats.map((stat, i) => (
          <CountStat key={stat.label} stat={stat} index={i} />
        ))}
      </ul>
    </section>
  );
};

export default ProofStrip;
