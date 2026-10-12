import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { usePredictions } from '@/hooks/usePredictions';
import { groupByDivision } from '@/data/teams';
import { getEspnLogoUrl, getTeamColors } from '@/data/nflData';
import { teamRecord } from '@/lib/teamPage';

/** All 32 teams by division, each linking to its team page. */
export default function TeamsPage() {
  const { predictions } = usePredictions();
  const groups = useMemo(() => groupByDivision(), []);
  return (
    <div className="min-h-screen">
      <Header />
      <main className="tm-wrap tm-index">
        <h1 className="gp-title">Teams</h1>
        <div className="tm-grid">
          {groups.map((group) => (
            <section key={group.label}>
              <h2 className="hm-h2">{group.label}</h2>
              {group.teams.map((t) => {
                const rec = teamRecord(t.abbr, predictions);
                return (
                  <Link key={t.abbr} to={`/team/${t.abbr}`} className="tm-tile" style={{ ['--tc' as string]: getTeamColors(t.abbr).primary }}>
                    <img src={getEspnLogoUrl(t.abbr)} alt="" width={30} height={30} loading="lazy" />
                    <span><b>{t.name}</b><small>{t.city}</small></span>
                    {rec.w + rec.l > 0 && <span className="tm-rec">{rec.w}–{rec.l}</span>}
                  </Link>
                );
              })}
            </section>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
