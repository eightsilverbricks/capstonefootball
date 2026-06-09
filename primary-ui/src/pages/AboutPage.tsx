import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const GLOSSARY = [
  {
    term: 'EPA / Play',
    plain: 'Expected Points Added per play — how many points a team gained (or lost) compared to an average team in the same situation.',
    model_use: 'Used both offensively and defensively over the last 3 games.',
  },
  {
    term: 'Success Rate',
    plain: 'Fraction of plays gaining ≥40% needed yards on 1st, ≥60% on 2nd, or 100% on 3rd/4th.',
    model_use: 'Consistent chain-moving offense. Used both offensively and defensively.',
  },
  {
    term: 'Spread Line',
    plain: 'Vegas point spread — how many points the favored team is expected to win by.',
    model_use: 'The strongest single predictor. Encodes injury news, weather, and info the model can\'t see from box scores.',
  },
  {
    term: 'Moneyline',
    plain: 'Implied win probability from the betting market as American odds (−180 = bet $180 to win $100).',
    model_use: 'Market consensus on outright win probability, used alongside the spread.',
  },
  {
    term: 'Rest Differential',
    plain: 'Difference in days of rest between the two teams.',
    model_use: 'Small but consistent edge for well-rested teams, especially late-season.',
  },
  {
    term: 'Win % Last 3',
    plain: 'Fraction of the last 3 games won — recent momentum over season-long averages.',
    model_use: '3-0 vs 0-3 over recent games is a meaningful short-term signal.',
  },
];

const FEATURES = [
  'spread_line', 'home_moneyline', 'away_moneyline',
  'diff_last3_epa_per_play', 'diff_last3_success_rate', 'diff_last3_point_diff_pg',
  'diff_last3_epa_per_play_allowed', 'diff_last3_success_rate_allowed',
  'diff_last3_win_pct', 'rest_diff', 'div_game',
];

const AboutPage: React.FC = () => (
  <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--text-primary)' }}>
    <Header />

    <main className="max-w-3xl mx-auto px-4 py-12">
      <div className="mb-12">
        <h1 className="font-bold mb-3"
          style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 4vw, 3rem)' }}>
          About the model
        </h1>
        <p className="text-base leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          The Clark Index uses logistic regression trained on NFL play-by-play data to predict game winners.
        </p>
      </div>

      {/* Methodology */}
      <section className="mb-12">
        <h2 className="text-lg font-semibold mb-4">Methodology</h2>
        <div className="rounded-lg p-5 flex flex-col gap-4"
          style={{ background: 'var(--surface)', border: '1px solid var(--border-default)' }}>
          {[
            {
              title: 'Expanding-window backtest',
              body: "Each week's prediction uses only data available before that game. The model re-trains weekly on all prior games — no future leakage. This mirrors real pre-game conditions.",
            },
            {
              title: 'Model type',
              body: 'Logistic regression with standard scaling. Chosen for interpretability — coefficients map directly to feature importance, powering the "Factors to victory" section in each report.',
            },
            {
              title: 'Accuracy',
              body: '71% correct on 2024 games. Vegas closing lines are correct ~67–68% on the spread; straight win/loss is a bit easier. The model combines market signals with recent performance.',
            },
          ].map(({ title, body }, i) => (
            <div key={title}
              style={i > 0 ? { borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' } : {}}>
              <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--accent-gold)' }}>{title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="mb-12">
        <h2 className="text-lg font-semibold mb-4">Model features</h2>
        <div className="rounded-lg p-4"
          style={{ background: 'var(--surface)', border: '1px solid var(--border-default)' }}>
          <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
            {FEATURES.length} features · differentials are home minus away
          </p>
          <div className="flex flex-wrap gap-2">
            {FEATURES.map(f => (
              <code key={f} className="text-xs px-2 py-1 rounded"
                style={{
                  fontFamily: 'var(--font-mono)',
                  background: 'var(--surface-raised)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-tertiary)',
                }}>
                {f}
              </code>
            ))}
          </div>
        </div>
      </section>

      {/* Glossary */}
      <section className="mb-12">
        <h2 className="text-lg font-semibold mb-4">Glossary</h2>
        <div className="flex flex-col gap-3">
          {GLOSSARY.map(item => (
            <div key={item.term} className="rounded-lg p-4"
              style={{ background: 'var(--surface)', border: '1px solid var(--border-default)' }}>
              <h3 className="text-sm font-semibold mb-1">{item.term}</h3>
              <p className="text-sm leading-relaxed mb-2" style={{ color: 'var(--text-secondary)' }}>{item.plain}</p>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                <span style={{ color: 'var(--text-tertiary)' }}>Model use: </span>{item.model_use}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Caveats */}
      <section>
        <h2 className="text-lg font-semibold mb-4">What the model doesn't know</h2>
        <ul className="rounded-lg p-5 flex flex-col gap-2"
          style={{ background: 'var(--surface)', border: '1px solid var(--border-default)' }}>
          {[
            'Injury reports announced after the data cutoff',
            'Coaching adjustments, scheme changes, game plans',
            'Player motivation — playoff push, contract years, rivalry games',
            'Live 2025 season data — this demo uses 2024 historical games only',
          ].map(item => (
            <li key={item} className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <span style={{ color: 'var(--text-muted)' }}>—</span>
              {item}
            </li>
          ))}
        </ul>
      </section>
    </main>

    <Footer />
  </div>
);

export default AboutPage;
