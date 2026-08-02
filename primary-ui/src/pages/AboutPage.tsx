import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import FoundersPortrait from '@/components/brand/FoundersPortrait';
import TeamLogo from '@/components/TeamLogo';
import { useAuth } from '@/hooks/useAuth';
import { openAuthDialog } from '@/hooks/useAuthDialog';
import { FOUNDERS, FOUNDER_SIGNATURE } from '@/data/founders';
import { getTeamColors } from '@/data/nflData';

/**
 * Where the landing page's "read our story" link lands. Same founders photo,
 * so the hand-off is visually continuous, then the longer version of what the
 * Index is and who's behind it.
 */
const AboutPage: React.FC = () => {
  const { isSignedIn } = useAuth();

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--text-primary)' }}>
      <Header />

      <main className="pb-16">
        {/* ── Hero ── */}
        <section className="field-texture stadium-bloom">
          <div className="max-w-3xl mx-auto px-4 pt-12 pb-8 text-center">
            <span
              className="text-[11px] uppercase tracking-[0.22em]"
              style={{ color: 'var(--accent-gold)' }}
            >
              Who's behind this
            </span>
            <h1
              className="font-bold leading-[0.95] tracking-tight mt-3 mb-6"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(2.25rem, 6vw, 4rem)',
                color: 'var(--text-primary)',
              }}
            >
              Three fans, one very long spreadsheet.
            </h1>
            <div className="w-full max-w-sm mx-auto">
              <FoundersPortrait showLabels={false} />
            </div>
          </div>
        </section>

        {/* ── What this is ── */}
        <section className="max-w-3xl mx-auto px-4 mt-10">
          <div className="flex flex-col gap-6">
            <p className="text-base leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              The Clark Index brings football analytics to life by using historical data, advanced
              statistics, and predictive modeling to forecast game outcomes. Whether you're a fan,
              fantasy manager, or sports bettor, The Clark Report helps you dive deeper into every
              matchup with data-driven insights that make every game more exciting.
            </p>
            <p className="text-base leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Compete against friends and football fans in The Clark Competition to prove your
              football IQ. With no financial risk, it's all about making the smartest picks and
              earning the bragging rights that come with them.
            </p>
          </div>
        </section>

        {/* ── The three of us ── */}
        <section className="max-w-3xl mx-auto px-4 mt-12" aria-labelledby="founders-heading">
          <div
            className="flex items-baseline justify-between gap-4 mb-5 pb-3"
            style={{ borderBottom: '1px solid var(--border-subtle)' }}
          >
            <h2
              id="founders-heading"
              className="font-bold"
              style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--text-primary)' }}
            >
              The founders
            </h2>
            <span className="text-[11px] uppercase tracking-[0.2em]" style={{ color: 'var(--text-muted)' }}>
              And who they yell at on Sundays
            </span>
          </div>

          <ul className="grid gap-3 sm:grid-cols-3 list-none p-0 m-0">
            {FOUNDERS.map((founder) => {
              const colors = getTeamColors(founder.team);
              return (
                <li
                  key={founder.id}
                  className="rounded-xl p-5"
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border-subtle)',
                    borderTop: `2px solid ${colors.secondary}`,
                  }}
                >
                  <TeamLogo abbr={founder.team} size="md" className="mb-3" />
                  <p
                    className="font-bold leading-tight"
                    style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', color: 'var(--text-primary)' }}
                  >
                    {founder.name}
                  </p>
                  <p
                    className="text-[10px] uppercase tracking-[0.18em] mt-1"
                    style={{ color: colors.secondary }}
                  >
                    {founder.role} · #{founder.number} {founder.teamName}
                  </p>
                  <p className="text-xs leading-relaxed mt-2.5" style={{ color: 'var(--text-tertiary)' }}>
                    {founder.line}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>

        {/* ── How the model works ── */}
        <section className="max-w-3xl mx-auto px-4 mt-12" aria-labelledby="model-heading">
          <h2
            id="model-heading"
            className="text-xs font-semibold uppercase tracking-widest mb-3"
            style={{ color: 'var(--accent-gold)' }}
          >
            About the model
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Clark is a logistic regression trained on the 2018–2023 seasons and evaluated on all 285
            games of 2024. We kept it deliberately simple: a more complicated model might squeeze out
            another point of accuracy, but it couldn't tell you <em>why</em> — and the why is the
            entire product. Every factor you see in a Clark Report is a real input the model
            weighted, translated into plain English.
          </p>
        </section>

        {/* ── Sign-off ── */}
        <section className="max-w-3xl mx-auto px-4 mt-12">
          <div
            className="rounded-2xl px-6 py-8 sm:px-10 text-center"
            style={{ background: 'var(--surface)', border: '1px solid var(--border-subtle)' }}
          >
            <p
              className="italic text-lg mb-1"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--accent-gold)' }}
            >
              — {FOUNDER_SIGNATURE}
            </p>
            <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
              Thanks for being part of this.
            </p>

            {isSignedIn ? (
              <Link
                to="/games"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold uppercase tracking-wide no-underline"
                style={{ background: 'var(--accent-gold)', color: '#111' }}
              >
                Go make some picks <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => openAuthDialog('signup')}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold uppercase tracking-wide"
                style={{ background: 'var(--accent-gold)', color: '#111' }}
              >
                Join The Clark Competition <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default AboutPage;
