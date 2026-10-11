import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

interface PageShellProps {
  title?: string;
  /** Right-hand column on desktop (4 of 12); drops below the main column on phones. */
  sidebar?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Standard page frame: header, a 12-column grid (8 main + 4 sidebar on
 * desktop), footer. Pages without a sidebar get the full width.
 */
const PageShell: React.FC<PageShellProps> = ({ title, sidebar, children }) => (
  <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>
    <Header />
    <main className="flex-1 w-full mx-auto px-4 pt-6 pb-12" style={{ maxWidth: 'var(--content-max)' }}>
      {title && (
        <h1 className="mb-5 font-bold tracking-tight" style={{ fontSize: 'var(--text-title)', color: 'var(--text-primary)' }}>
          {title}
        </h1>
      )}
      {sidebar ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 min-w-0">{children}</div>
          <aside className="lg:col-span-4 min-w-0 space-y-4">{sidebar}</aside>
        </div>
      ) : (
        children
      )}
    </main>
    <Footer />
  </div>
);

export default PageShell;
