import React from 'react';
import { Trophy } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-950 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-emerald-500 rounded-lg flex items-center justify-center">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold text-white">GridironAI</span>
              <p className="text-sm text-slate-400">Primary UI for the NFL prediction model</p>
            </div>
          </div>

          <p className="text-xs text-slate-500 max-w-xl md:text-right">
            Predictions are generated from the local trained model and are for analysis only.
            This project is not affiliated with the NFL.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
