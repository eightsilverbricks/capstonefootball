import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="border-t border-white/8 bg-[#0a0a12]">
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">

          <div>
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-6 h-6 rounded-sm flex items-center justify-center text-[10px] font-bold text-black"
                style={{ background: 'var(--accent-gold)' }}
              >
                CI
              </div>
              <span className="font-semibold text-white">The Clark Index</span>
            </div>
            <p className="text-sm text-white/40 max-w-sm">
              Evidence-based NFL football intelligence. Built to explain the game, not predict it blindly.
            </p>
          </div>

          <div className="text-xs text-white/30 md:text-right space-y-1">
            <p>Statistical model trained on 2018–2023 seasons · evaluated on 2024 season (285 games)</p>
            <p>Data sourced from nflfastR / nflverse · Not affiliated with the NFL</p>
            <p>For analysis and education only · Not gambling advice</p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
