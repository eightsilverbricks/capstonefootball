import React from 'react';
import { modelAccuracy, topFactors } from '@/data/nflData';

const ModelAccuracy: React.FC = () => {
  const pct = ((modelAccuracy.season / modelAccuracy.seasonTotal) * 100).toFixed(1);
  const vegasBaseline = 67.4; // ~historical favorite win rate

  return (
    <div id="model" className="rounded-xl border border-white/8 overflow-hidden bg-[#0f0f1a]">

      {/* Header */}
      <div className="px-6 py-5 border-b border-white/8">
        <h3 className="text-lg font-semibold text-white mb-1">Model transparency</h3>
        <p className="text-sm text-white/40">
          What the model got right, what it missed, and how it works.
        </p>
      </div>

      {/* Accuracy vs baseline */}
      <div className="p-6 border-b border-white/8">
        <p className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-4">
          2024 season accuracy
        </p>
        <div className="space-y-4">
          {/* Clark Index model */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm text-white">The Clark Index model</span>
              <span className="text-sm font-bold text-emerald-400">{pct}%</span>
            </div>
            <div className="h-2 bg-white/8 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-1000"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-xs text-white/30 mt-1">{modelAccuracy.season} of {modelAccuracy.seasonTotal} games correct</p>
          </div>

          {/* Vegas baseline */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm text-white/50">Pick the Vegas favorite (baseline)</span>
              <span className="text-sm font-semibold text-white/40">~{vegasBaseline}%</span>
            </div>
            <div className="h-2 bg-white/8 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-white/20 transition-all duration-1000"
                style={{ width: `${vegasBaseline}%` }}
              />
            </div>
            <p className="text-xs text-white/30 mt-1">Historical NFL favorite win rate</p>
          </div>
        </div>

        <div className="mt-4 px-4 py-3 rounded-lg bg-amber-400/8 border border-amber-400/20">
          <p className="text-xs text-amber-300/70 leading-relaxed">
            <strong className="text-amber-300">Honest note:</strong> Vegas spread is one of the model's 12 features —
            it uses market signals, not just football stats. The model's edge is <em>explaining the football reasons
            behind the probability</em>, not merely beating Vegas.
          </p>
        </div>
      </div>

      {/* Feature groups */}
      <div className="p-6 border-b border-white/8">
        <p className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-4">
          What the model looks at
        </p>
        <div className="space-y-3">
          {topFactors.slice(0, 6).map((factor) => (
            <div key={factor.rank} className="flex items-center gap-3">
              <span className="text-xs text-white/25 w-5 shrink-0 text-right">{factor.rank}</span>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-white/70">{factor.name}</span>
                  <span className="text-xs text-white/30">{factor.importance}%</span>
                </div>
                <div className="h-1 bg-white/8 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(factor.importance / 15) * 100}%`,
                      background: factor.rank <= 3 ? '#c8a96e' : 'rgba(255,255,255,0.2)',
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Methodology */}
      <div className="p-6">
        <p className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-3">
          How predictions are made
        </p>
        <div className="space-y-3 text-sm text-white/50 leading-relaxed">
          <p>
            <strong className="text-white/70">Expanding window:</strong> Each week's prediction is made using only data
            from games already played. Week 10 is never trained on Week 11 results. This simulates real pre-game prediction conditions.
          </p>
          <p>
            <strong className="text-white/70">Logistic regression:</strong> A simple, interpretable model — not a black box.
            Every factor's influence can be traced directly, which is why the Clark Report can show you
            exactly which factors drove each prediction.
          </p>
          <p>
            <strong className="text-white/70">2024 demo data:</strong> This is a historical backtest on the completed 2024 NFL season.
            Trained on 2018–2023 seasons (1,640 games), evaluated on 2024 (285 games).
          </p>
        </div>
      </div>
    </div>
  );
};

export default ModelAccuracy;
