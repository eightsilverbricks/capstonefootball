import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown, Info, LogOut, Trophy, Settings } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import TeamLogo from '@/components/TeamLogo';
import { useAuth } from '@/hooks/useAuth';
import { getTeamColors } from '@/data/nflData';

/** 'Zane Wolf' → 'ZW'. Falls back to the first character for single-word names. */
export function initialsOf(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

/**
 * The signed-in header control: an avatar tinted in your team's colors, with
 * the account menu behind it. Renders nothing when signed out — the header
 * shows the sign-in / get-started buttons instead.
 */
const AccountMenu: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const colors = user.favoriteTeam ? getTeamColors(user.favoriteTeam) : null;

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex items-center gap-1.5 rounded-full pl-1 pr-2 py-1 transition-colors hover:bg-white/5 focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-gold)]"
        aria-label={`Account menu for ${user.displayName}`}
      >
        <span
          className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
          style={{
            background: colors ? colors.primary : 'var(--surface-overlay)',
            color: colors ? colors.text : 'var(--text-primary)',
            boxShadow: colors ? `inset 0 0 0 1.5px ${colors.secondary}` : 'inset 0 0 0 1px var(--border-default)',
          }}
        >
          {initialsOf(user.displayName)}
        </span>
        <ChevronDown className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} aria-hidden="true" />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-60"
        style={{ background: 'var(--surface-raised)', borderColor: 'var(--border-default)' }}
      >
        <div className="flex items-center gap-3 px-2 py-2.5">
          {user.favoriteTeam ? (
            <TeamLogo abbr={user.favoriteTeam} size="sm" />
          ) : (
            <span
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ background: 'var(--surface-overlay)', color: 'var(--text-secondary)' }}
            >
              {initialsOf(user.displayName)}
            </span>
          )}
          <div className="min-w-0">
            <p
              className="text-sm font-semibold truncate"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
            >
              {user.displayName}
            </p>
            <p className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>
              @{user.handle}
              {user.favoriteTeam ? ` · ${user.favoriteTeam} fan` : ''}
            </p>
          </div>
        </div>

        <DropdownMenuSeparator style={{ background: 'var(--border-subtle)' }} />

        <DropdownMenuItem asChild>
          <Link to="/my-season" className="flex items-center gap-2 cursor-pointer no-underline">
            <Trophy className="w-4 h-4" aria-hidden="true" />
            My Season
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/settings" className="flex items-center gap-2 cursor-pointer no-underline">
            <Settings className="w-4 h-4" aria-hidden="true" />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/about" className="flex items-center gap-2 cursor-pointer no-underline">
            <Info className="w-4 h-4" aria-hidden="true" />
            About us
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator style={{ background: 'var(--border-subtle)' }} />

        <DropdownMenuItem
          onSelect={handleSignOut}
          className="flex items-center gap-2 cursor-pointer"
          style={{ color: 'var(--stake-negative)' }}
        >
          <LogOut className="w-4 h-4" aria-hidden="true" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default AccountMenu;
