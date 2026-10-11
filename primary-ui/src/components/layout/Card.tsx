import React from 'react';

interface CardProps {
  title?: string;
  /** Optional link or control on the right of the title row. */
  action?: React.ReactNode;
  /** Remove inner padding — for lists that run edge to edge with dividers. */
  flush?: boolean;
  className?: string;
  children: React.ReactNode;
}

/** The one card: white surface, 1px divider border, 8px radius, plain-noun title. */
const Card: React.FC<CardProps> = ({ title, action, flush = false, className = '', children }) => (
  <section
    className={`rounded-lg ${className}`}
    style={{ background: 'var(--surface)', border: '1px solid var(--divider)', boxShadow: 'var(--shadow-card)' }}
  >
    {title && (
      <header className="flex items-center justify-between gap-3 px-4 pt-3.5 pb-2.5">
        <h2 className="font-semibold" style={{ fontSize: 'var(--text-section)', color: 'var(--text-primary)' }}>
          {title}
        </h2>
        {action}
      </header>
    )}
    <div className={flush ? '' : 'px-4 pb-4'}>{children}</div>
  </section>
);

export default Card;
