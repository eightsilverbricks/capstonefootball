import React from 'react';
import { heroImage, modelAccuracy } from '@/data/nflData';
import { Brain, TrendingUp, Target, Zap, ChevronRight, Play } from 'lucide-react';

interface HeroSectionProps {
  onScrollToGames: () => void;
}

const HeroSection: React.FC<HeroSectionProps> = ({ onScrollToGames }) => {
  const seasonAccuracy = ((modelAccuracy.season / modelAccuracy.seasonTotal) * 100).toFixed(1);

  return (
    <section className="relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <img
          src={heroImage}
          alt="NFL Stadium"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/95 to-slate-900/80" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-slate-900/50" />
      </div>

      {/* Animated Grid Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `linear-gradient(rgba(0,212,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '50px 50px',
        }} />
      </div>

      {/* Content */}
      <div className="relative max-w-7xl mx-auto px-4 py-20 lg:py-32">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Text Content */}
          <div>
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/30 rounded-full px-4 py-2 mb-6">
              <Brain className="w-4 h-4 text-cyan-400" />
              <span className="text-sm text-cyan-400 font-medium">AI-Powered Predictions</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
              Predict NFL Games with{' '}
              <span className="bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
                Data-Driven
              </span>{' '}
              Insights
            </h1>

            {/* Subheadline */}
            <p className="text-lg text-slate-300 mb-8 max-w-xl">
              Our 13 Keys prediction model analyzes historical data, player performance, and key factors to give you evidence-based game predictions. Stop guessing, start winning.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-4 mb-10">
              <button
                onClick={onScrollToGames}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity shadow-lg shadow-cyan-500/25"
              >
                View Week 16 Predictions
                <ChevronRight className="w-5 h-5" />
              </button>
              <a
                href="#videos"
                className="flex items-center gap-2 px-6 py-3 bg-slate-800 text-white font-semibold rounded-xl hover:bg-slate-700 transition-colors border border-slate-700"
              >
                <Play className="w-5 h-5" />
                Watch Analysis
              </a>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6">
              <div>
                <div className="text-3xl font-bold text-emerald-400">{seasonAccuracy}%</div>
                <p className="text-sm text-slate-400">Season Accuracy</p>
              </div>
              <div>
                <div className="text-3xl font-bold text-cyan-400">1,200+</div>
                <p className="text-sm text-slate-400">Games Analyzed</p>
              </div>
              <div>
                <div className="text-3xl font-bold text-purple-400">13</div>
                <p className="text-sm text-slate-400">Key Factors</p>
              </div>
            </div>
          </div>

          {/* Right: Feature Cards */}
          <div className="grid grid-cols-2 gap-4">
            {/* Card 1 */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-5 border border-slate-700 hover:border-cyan-500/50 transition-colors">
              <div className="w-12 h-12 bg-cyan-500/20 rounded-xl flex items-center justify-center mb-4">
                <Brain className="w-6 h-6 text-cyan-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">AI Analysis</h3>
              <p className="text-sm text-slate-400">
                Machine learning models trained on years of NFL data
              </p>
            </div>

            {/* Card 2 */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-5 border border-slate-700 hover:border-purple-500/50 transition-colors">
              <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mb-4">
                <TrendingUp className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Live Odds</h3>
              <p className="text-sm text-slate-400">
                Real-time spreads and over/under lines
              </p>
            </div>

            {/* Card 3 */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-5 border border-slate-700 hover:border-emerald-500/50 transition-colors">
              <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center mb-4">
                <Target className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">13 Keys Model</h3>
              <p className="text-sm text-slate-400">
                Weighted factors that predict game outcomes
              </p>
            </div>

            {/* Card 4 */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-5 border border-slate-700 hover:border-orange-500/50 transition-colors">
              <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-orange-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Player Insights</h3>
              <p className="text-sm text-slate-400">
                Key matchups and performance trends
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
        <div className="w-8 h-12 border-2 border-slate-600 rounded-full flex justify-center pt-2">
          <div className="w-1.5 h-3 bg-cyan-400 rounded-full animate-pulse" />
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
