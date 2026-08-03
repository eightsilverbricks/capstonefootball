import React from 'react';
import { ArrowRight, Eye } from 'lucide-react';
import SectionIntro from './SectionIntro';
import TeamLogo from '@/components/TeamLogo';
import { getHeroInsight } from '@/lib/heroInsight';
import { ModelRecord, formatAccuracy } from '@/lib/modelRecord';
import { ApiPrediction, getPredictedProbability } from '@/types/prediction';

interface WhyClarkProps {
  /** A real game from the shipped dataset — never a mock. */
  game: ApiPrediction;
  record: ModelRecord;
  onPeek: () => void;
}

interface StatRow {
  label: string;
  value: string;
}

/**
 * The API ships these already suffixed — home_last3_record is literally
 * "1-2 last 3" — so rendering it beside a "last 3" label reads "1-2 last 3
 * last 3". Strip the baked-in suffix and let the label do that job.
 */
function cleanRecord(record: string): string {
  return record.replace(/\s*last\s*3\s*$/i, '').trim();
}

/** The same game as a stat sheet — every figure real, none of it explained. */
function buildStatRows(game: ApiPrediction): StatRow[] {
  const rows: StatRow[] = [];
  const winner = game.predicted_winner;
  const isHome = winner === game.home_team;
  const opponent = isHome ? game.away_team : game.home_team;

  rows.push({ label: 'Win probability', value: `${(getPredictedProbability(game) * 100).toFixed(1)}%` });

  const market = game.market_context;
  if (market?.spread_line != null && market.market_favorite) {
    rows.push({
      label: 'Spread',
      value: `${market.market_favorite} −${Math.abs(market.spread_line)}`,
    });
  }
  const moneyline = isHome ? market?.home_moneyline : market?.away_moneyline;
  if (moneyline != null) {
    rows.push({ label: 'Moneyline', value: moneyline > 0 ? `+${moneyline}` : `${moneyline}` });
  }

  const last3 = isHome ? game.home_last3_record : game.away_last3_record;
  const oppLast3 = isHome ? game.away_last3_record : game.home_last3_record;
  if (last3) rows.push({ label: `${winner} last 3`, value: cleanRecord(last3) });
  if (oppLast3) rows.push({ label: `${opponent} last 3`, value: cleanRecord(oppLast3) });

  const ptsFor = isHome ? game.home_last3_pts_for : game.away_last3_pts_for;
  const ptsAg = isHome ? game.home_last3_pts_ag : game.away_last3_pts_ag;
  if (ptsFor != null && ptsAg != null) {
    const diff = ptsFor - ptsAg;
    rows.push({
      label: 'Pt. differential',
      value: `${diff > 0 ? '+' : ''}${diff.toFixed(1)}`,
    });
  }

  return rows;
}

/**
 * The whole positioning in one screen: everyone else hands you the number, we
 * hand you the reason. Both columns describe the SAME real game from the
 * dataset — the left is that game as a stat sheet, the right is the model's own
 * plain-English read of it. Nothing here is a strawman; the left column is all
 * true, it just doesn't tell you what to do with it.
 */
const WhyClark: React.FC<WhyClarkProps> = ({ game, record, onPeek }) => {
  const insight = getHeroInsight(game);
  const rows = buildStatRows(game);
  const body = insight?.line || game.football_story || '';

  return (
    <section aria-labelledby="why-heading" className="max-w-5xl mx-auto px-4 w-full">
      <SectionIntro
        id="why-heading"
        kicker="The difference"
        heading="Everyone hands you the number. We hand you the reason."
        lede="Here's one real game from last season, told both ways."
      />

      {/* The matchup both columns are about */}
      <div className="flex items-center gap-2 mt-8 mb-3">
        <TeamLogo abbr={game.away_team} size="sm" className="!w-6 !h-6" />
        <span
          className="font-bold"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
        >
          {game.away_team} at {game.home_team}
        </span>
        <TeamLogo abbr={game.home_team} size="sm" className="!w-6 !h-6" />
        <span className="text-[10px] uppercase tracking-[0.2em] ml-1" style={{ color: 'var(--text-muted)' }}>
          {game.week_label ?? `Week ${game.week}`}
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2 items-stretch">
        {/* ── The stat-sheet version ── */}
        <article
          className="rounded-xl p-6 flex flex-col"
          style={{ background: 'var(--surface)', border: '1px solid var(--border-subtle)' }}
        >
          <p className="text-[10px] uppercase tracking-[0.22em] mb-5" style={{ color: 'var(--text-muted)' }}>
            Everywhere else
          </p>

          <dl className="flex flex-col gap-0 mb-5">
            {rows.map((row, i) => (
              <div
                key={row.label}
                className="flex items-baseline justify-between gap-4 py-2.5"
                style={{ borderTop: i > 0 ? '1px solid var(--border-subtle)' : 'none' }}
              >
                <dt className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  {row.label}
                </dt>
                <dd
                  className="text-sm font-semibold tabular-nums"
                  style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}
                >
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>

          <p className="text-sm italic mt-auto" style={{ color: 'var(--text-muted)' }}>
            All true. None of it tells you what's actually going on.
          </p>
        </article>

        {/* ── The Clark Report version ── */}
        <article
          className="rounded-xl p-6 flex flex-col"
          style={{
            background: 'var(--surface)',
            border: '1px solid rgba(200,169,110,0.35)',
            borderTop: '2px solid var(--accent-gold)',
          }}
        >
          <p className="text-[10px] uppercase tracking-[0.22em] mb-5" style={{ color: 'var(--accent-gold)' }}>
            The Clark Report
          </p>

          {insight && (
            <p
              className="font-bold leading-snug mb-3"
              style={{ fontFamily: 'var(--font-display)', fontSize: '1.35rem', color: 'var(--text-primary)' }}
            >
              {insight.headline}
            </p>
          )}
          <p className="text-sm leading-relaxed mb-5" style={{ color: 'var(--text-secondary)' }}>
            {body}
          </p>

          <div className="mt-auto">
            <p className="text-sm italic mb-4" style={{ color: 'var(--text-tertiary)' }}>
              Same game. Now you could explain it to someone else.
            </p>
            <button
              type="button"
              onClick={onPeek}
              className="lift-card inline-flex items-center gap-2 w-full justify-center rounded-lg px-4 py-3 text-sm font-semibold"
              style={{
                background: 'var(--surface-raised)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-primary)',
              }}
            >
              <Eye className="w-4 h-4" style={{ color: 'var(--accent-gold)' }} aria-hidden="true" />
              Read the full report
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </article>
      </div>

      {/* The receipt — proof in voice, not a stat grid */}
      {record.played > 0 && (
        <p
          className="mt-5 text-sm leading-relaxed"
          style={{ color: 'var(--text-tertiary)' }}
        >
          <span className="font-semibold" style={{ color: 'var(--accent-gold)' }}>
            Clark called {record.correct} of {record.played} games last season — {formatAccuracy(record.accuracy)}.
          </span>{' '}
          We show our work on every one of them, including the {record.played - record.correct} it got wrong.
        </p>
      )}
    </section>
  );
};

export default WhyClark;
