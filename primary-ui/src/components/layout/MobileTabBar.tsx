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

/** Fixed bottom navigation on phones (hidden from md up, where the section nav shows). */
export default function MobileTabBar() {
  const { pathname } = useLocation();
  return (
    <nav className="tabbar" aria-label="Main navigation">
      {MOBILE_TABS.map(({ label, to }) => {
        const active = isNavActive(pathname, to);
        const Icon = ICONS[to];
        return (
          <Link key={to} to={to} aria-current={active ? 'page' : undefined}>
            <Icon className="w-[22px] h-[22px]" strokeWidth={active ? 2.4 : 1.8} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
