import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';

const Header: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-[#0a0a12]/95 backdrop-blur-sm border-b border-white/8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">

          {/* Wordmark */}
          <a href="#" className="flex items-center gap-3 group">
            <div
              className="w-8 h-8 rounded-sm flex items-center justify-center text-xs font-bold text-black"
              style={{ background: 'linear-gradient(135deg, #c8a96e 0%, #e8c97e 100%)' }}
            >
              CI
            </div>
            <div className="leading-tight">
              <span className="text-white font-semibold tracking-tight text-lg">The Clark Index</span>
            </div>
          </a>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            <a href="#matchups" className="px-4 py-2 text-sm text-white/60 hover:text-white rounded-md transition-colors hover:bg-white/5">
              Matchups
            </a>
            <a href="#model" className="px-4 py-2 text-sm text-white/60 hover:text-white rounded-md transition-colors hover:bg-white/5">
              Model
            </a>
            <a href="#learn" className="px-4 py-2 text-sm text-white/60 hover:text-white rounded-md transition-colors hover:bg-white/5">
              New to football?
            </a>
          </nav>

          {/* Right: demo badge + mobile toggle */}
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border"
              style={{ borderColor: 'rgba(200,169,110,0.4)', color: '#c8a96e', background: 'rgba(200,169,110,0.08)' }}>
              2024 Demo Season
            </span>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-2 text-white/50 hover:text-white rounded-md"
              aria-label="Toggle navigation"
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav className="md:hidden py-3 border-t border-white/8 space-y-1">
            {['Matchups', 'Model', 'New to football?'].map((label) => (
              <a
                key={label}
                href={`#${label.toLowerCase().replace(/[^a-z]/g, '')}`}
                onClick={() => setMenuOpen(false)}
                className="block px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 rounded-md"
              >
                {label}
              </a>
            ))}
            <div className="px-4 pt-2">
              <span className="text-xs text-[#c8a96e]">2024 Demo Season</span>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
};

export default Header;
