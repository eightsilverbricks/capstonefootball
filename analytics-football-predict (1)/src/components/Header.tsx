import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Menu, X, Search, Bell, User, ChevronDown, Trophy, BarChart3, Play, Users, LogOut, Settings, Target } from 'lucide-react';

interface HeaderProps {
  currentWeek: number;
  onWeekChange: (week: number) => void;
  onOpenAuth: () => void;
  onOpenProfile: () => void;
}

const Header: React.FC<HeaderProps> = ({ currentWeek, onWeekChange, onOpenAuth, onOpenProfile }) => {
  const { user, profile, stats, signOut, loading } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isWeekDropdownOpen, setIsWeekDropdownOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const weeks = Array.from({ length: 18 }, (_, i) => i + 1);

  const navItems = [
    { label: 'Games', icon: Trophy, href: '#games' },
    { label: 'Model', icon: BarChart3, href: '#model' },
    { label: 'Videos', icon: Play, href: '#videos' },
    { label: 'Community', icon: Users, href: '#community' },
  ];

  const handleSignOut = async () => {
    await signOut();
    setIsUserDropdownOpen(false);
  };

  const accuracy = stats && stats.total_predictions > 0
    ? ((stats.correct_predictions / stats.total_predictions) * 100).toFixed(1)
    : '0.0';

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-purple-500 rounded-xl flex items-center justify-center">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">GridironAI</h1>
              <p className="text-xs text-slate-400 hidden sm:block">NFL Predictions</p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="flex items-center gap-2 px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </a>
            ))}
          </nav>

          {/* Right Side */}
          <div className="flex items-center gap-3">
            {/* Week Selector */}
            <div className="relative">
              <button
                onClick={() => setIsWeekDropdownOpen(!isWeekDropdownOpen)}
                className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <span className="text-sm text-slate-300">Week {currentWeek}</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isWeekDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isWeekDropdownOpen && (
                <div className="absolute top-full right-0 mt-2 w-48 bg-slate-800 rounded-lg shadow-xl border border-slate-700 py-2 max-h-64 overflow-y-auto z-50">
                  {weeks.map((week) => (
                    <button
                      key={week}
                      onClick={() => {
                        onWeekChange(week);
                        setIsWeekDropdownOpen(false);
                      }}
                      className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                        week === currentWeek
                          ? 'bg-cyan-500/20 text-cyan-400'
                          : 'text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      Week {week}
                      {week === 16 && <span className="ml-2 text-xs text-emerald-400">(Current)</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Search */}
            <div className="hidden lg:flex items-center bg-slate-800 rounded-lg px-3 py-2">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search teams..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none outline-none text-sm text-white placeholder-slate-400 ml-2 w-32"
              />
            </div>

            {/* User Section */}
            {loading ? (
              <div className="w-10 h-10 bg-slate-800 rounded-lg animate-pulse" />
            ) : user && profile ? (
              <div className="relative">
                <button
                  onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold">
                    {profile.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-medium text-white">{profile.username}</p>
                    <p className="text-xs text-slate-400">{accuracy}% accuracy</p>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isUserDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isUserDropdownOpen && (
                  <div className="absolute top-full right-0 mt-2 w-64 bg-slate-800 rounded-lg shadow-xl border border-slate-700 py-2 z-50">
                    {/* User Info */}
                    <div className="px-4 py-3 border-b border-slate-700">
                      <p className="font-medium text-white">{profile.username}</p>
                      <p className="text-sm text-slate-400">{user.email}</p>
                      {stats && (
                        <div className="flex items-center gap-4 mt-2 text-xs">
                          <span className="text-emerald-400">{stats.correct_predictions}W</span>
                          <span className="text-red-400">{stats.incorrect_predictions}L</span>
                          <span className="text-cyan-400">{accuracy}%</span>
                          {stats.current_streak > 0 && (
                            <span className="text-yellow-400">{stats.current_streak} streak</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Menu Items */}
                    <button
                      onClick={() => {
                        onOpenProfile();
                        setIsUserDropdownOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                    >
                      <Target className="w-4 h-4" />
                      My Predictions
                    </button>
                    <button
                      onClick={() => setIsUserDropdownOpen(false)}
                      className="w-full flex items-center gap-3 px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                      Settings
                    </button>
                    <div className="border-t border-slate-700 mt-2 pt-2">
                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-3 px-4 py-2 text-red-400 hover:text-red-300 hover:bg-slate-700 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-medium rounded-lg hover:opacity-90 transition-opacity"
              >
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">Sign In</span>
              </button>
            )}

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <nav className="md:hidden py-4 border-t border-slate-800">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </a>
            ))}
            
            {/* Mobile User Section */}
            {user && profile ? (
              <>
                <button
                  onClick={() => {
                    onOpenProfile();
                    setIsMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <Target className="w-5 h-5" />
                  My Predictions
                </button>
                <button
                  onClick={() => {
                    handleSignOut();
                    setIsMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:text-red-300 hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  Sign Out
                </button>
              </>
            ) : (
              <button
                onClick={() => {
                  onOpenAuth();
                  setIsMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-cyan-400 hover:text-cyan-300 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <User className="w-5 h-5" />
                Sign In / Create Account
              </button>
            )}

            {/* Mobile Search */}
            <div className="flex items-center bg-slate-800 rounded-lg px-3 py-2 mt-3 mx-4">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search teams..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none outline-none text-sm text-white placeholder-slate-400 ml-2 flex-1"
              />
            </div>
          </nav>
        )}
      </div>
    </header>
  );
};

export default Header;
