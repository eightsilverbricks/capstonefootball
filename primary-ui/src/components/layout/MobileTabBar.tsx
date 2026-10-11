import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CalendarDays, Home, Radio, Shield, User, type LucideIcon } from 'lucide-react';
import { isNavActive, MOBILE_TABS } from './nav';

const ICONS: Record<string, LucideIcon> = {
  '/': Home,
  '/games': CalendarDays,
  '/live': Radio,
  '/teams': Shield,
  '/my-season': User,
};

/** Fixed bottom navigation on phones (hidden from md up, where the header nav shows). */
const MobileTabBar: React.FC = () => {
  const { pathname } = useLocation();

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 grid grid-cols-5"
      style={{
        height: 'calc(var(--tabbar-h) + env(safe-area-inset-bottom))',
        paddingBottom: 'env(safe-area-inset-bottom)',
        background: 'var(--surface)',
        borderTop: '1px solid var(--divider)',
      }}
      aria-label="Main navigation"
    >
      {MOBILE_TABS.map(({ label, to }) => {
        const active = isNavActive(pathname, to);
        const Icon = ICONS[to];
        return (
          <Link
            key={to}
            to={to}
            className="flex flex-col items-center justify-center gap-1 text-[11px] font-medium no-underline"
            style={{ color: active ? 'var(--brand)' : 'var(--text-tertiary)' }}
            aria-current={active ? 'page' : undefined}
          >
            <Icon className="w-[22px] h-[22px]" strokeWidth={active ? 2.4 : 1.8} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
};

export default MobileTabBar;
