import React from 'react';
import { Link } from 'react-router-dom';
import { FlaskConical, Radio, ArrowRight } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useSeasonMode } from '@/context/SeasonModeContext';
import { LIVE_SEASON, DEMO_SEASON, daysUntilKickoff, isPreSeason } from '@/lib/season';

/**
 * Where demo mode is turned on. Deliberately its own page rather than a header
 * switch: swapping the whole site's dataset is not a control anyone should hit
 * by accident, and it needs room to explain what it actually changes.
 */
const SettingsPage: React.FC = () => {
  const { mode, setMode } = useSeasonMode();
  const days = daysUntilKickoff();

  const options = [
    {
      id: 'live' as const,
      icon: Radio,
      title: `${LIVE_SEASON} season`,
      tag: isPreSeason() ? `Starts in ${days} day${days === 1 ? '' : 's'}` : 'Live',
      body:
        `The season being played. Every game is a genuine forecast — no result exists yet, ` +
        `so your record stays empty until games are played.`,
    },
    {
      id: 'demo' as const,
      icon: FlaskConical,
      title: `${DEMO_SEASON} demo`,
      tag: 'Completed season',
      body:
        `A finished season with every final score. Picks resolve immediately, so records, ` +
        `streaks and the Clark Differential all work. Nothing you do here counts toward ` +
        `your ${LIVE_SEASON} record.`,
    },
  ];

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--text-primary)' }}>
      <Header />

      <main className="pb-16">
        <section className="field-texture">
          <div className="max-w-2xl mx-auto px-4 pt-12 pb-8">
            <span
              className="text-[11px] uppercase tracking-[0.22em]"
              style={{ color: 'var(--accent-gold)' }}
            >
              Settings
            </span>
            <h1
              className="font-bold leading-[0.95] tracking-tight mt-3 mb-4"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(2rem, 5vw, 3rem)',
              }}
            >
              Which season you're seeing
            </h1>
            <p className="text-[15px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              This changes every game, report and record across the whole site.
            </p>
          </div>
        </section>

        <section className="max-w-2xl mx-auto px-4 mt-2">
          <div role="radiogroup" aria-label="Season dataset" className="grid gap-3">
            {options.map((option) => {
              const selected = mode === option.id;
              const Icon = option.icon;
              return (
                <button
                  key={option.id}
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setMode(option.id)}
                  className="text-left rounded-xl p-5 transition-all duration-200"
                  style={{
                    background: selected ? 'var(--surface-raised)' : 'var(--surface)',
                    border: `1px solid ${selected ? 'var(--accent-gold)' : 'var(--border)'}`,
                    boxShadow: selected ? '0 8px 28px rgba(0,0,0,0.28)' : 'none',
                    transform: selected ? 'translateY(-1px)' : 'none',
                  }}
                >
                  <div className="flex items-start gap-3">
                    <Icon
                      size={18}
                      style={{ color: selected ? 'var(--accent-gold)' : 'var(--text-tertiary)' }}
                      className="mt-1 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="font-semibold"
                          style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem' }}
                        >
                          {option.title}
                        </span>
                        <span
                          className="text-[10px] uppercase tracking-[0.16em] px-2 py-0.5 rounded-full"
                          style={{
                            color: 'var(--text-tertiary)',
                            border: '1px solid var(--border)',
                          }}
                        >
                          {option.tag}
                        </span>
                      </div>
                      <p
                        className="text-[13.5px] leading-relaxed mt-2"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {option.body}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <p className="text-[12.5px] mt-5" style={{ color: 'var(--text-tertiary)' }}>
            Saved on this device only. Your picks are stored per game, so the two seasons keep
            entirely separate records.
          </p>

          <Link
            to="/games"
            className="inline-flex items-center gap-1.5 mt-6 text-[13px] no-underline"
            style={{ color: 'var(--accent-gold)' }}
          >
            Back to the slate <ArrowRight size={14} />
          </Link>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default SettingsPage;
