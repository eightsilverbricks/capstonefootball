import type { ApiPrediction } from '@/types/prediction';
import type { ClarkReportData, MatchupSection } from '@/types/clarkReport';
import { getEspnLogoUrl } from '@/data/nflData';
import { getTeam } from '@/data/teams';
import { ordinal } from '@/lib/teamPage';
import PlayerLink from '@/components/PlayerLink';

const nick = (t: string) => getTeam(t)?.name ?? t;

function Logo({ team }: { team: string }) {
  return <img src={getEspnLogoUrl(team)} alt="" width={22} height={22} loading="lazy" />;
}

function VsTable({ section }: { section: MatchupSection }) {
  const { table } = section;
  return (
    <div className="cr-vs" role="table" aria-label={section.sub}>
      <div className="cr-vs-h" role="row">
        <span role="columnheader"><Logo team={table.offense_team} />{nick(table.offense_team)} offense</span>
        <span role="columnheader" />
        <span role="columnheader" className="r">{nick(table.defense_team)} defense<Logo team={table.defense_team} /></span>
      </div>
      {table.rows.map((row) => (
        <div className="cr-vs-row" role="row" key={row.label}>
          <span role="cell" className={row.offense.rank < row.defense.rank ? 'up' : undefined}>
            <b>{row.offense.display}</b><small>{ordinal(row.offense.rank)}</small>
          </span>
          <span role="cell" className="m">{row.label}</span>
          <span role="cell" className={`r${row.defense.rank < row.offense.rank ? ' up' : ''}`}>
            <b>{row.defense.display}</b><small>{ordinal(row.defense.rank)}</small>
          </span>
        </div>
      ))}
      {table.edge_team && <div className="cr-edge">Edge: {nick(table.edge_team)}</div>}
    </div>
  );
}

function Matchup({ section }: { section: MatchupSection }) {
  return (
    <>
      <h2>{section.title}</h2>
      <p className="cr-sub">{section.sub}</p>
      <VsTable section={section} />
      {section.body.map((t) => <p key={t}>{t}</p>)}
    </>
  );
}

function Meter({ report, pick, other }: { report: ClarkReportData; pick: string; other: string }) {
  const p = report.meaning.pct;
  return (
    <div className="cr-meter" aria-hidden="true">
      <div className="cr-bar"><span style={{ width: `${p}%` }} /></div>
      <div className="cr-lbls"><span>{nick(pick)} win {p} of 100</span><span>{nick(other)} win {100 - p}</span></div>
    </div>
  );
}

function Injuries({ injuries }: { injuries: NonNullable<ClarkReportData['injuries']> }) {
  return (
    <>
      <h2>{injuries.title}</h2>
      <p>{injuries.body}</p>
      <div className="cr-inj">
        {injuries.teams.map(({ team, players }) => (
          <div key={team}>
            <h3><Logo team={team} />{nick(team)}</h3>
            {players.length === 0
              ? <p className="gr-muted">Nobody important listed.</p>
              : <ul>{players.map((p) => (
                  <li key={p.name}><b><PlayerLink name={p.name} team={team} /></b> <span>{p.position}</span><em className={p.status.toLowerCase()}>{p.status}</em></li>
                ))}</ul>}
          </div>
        ))}
      </div>
    </>
  );
}

function NumbersDrawer({ report }: { report: ClarkReportData }) {
  const { numbers, basis } = report;
  return (
    <details className="cr-drawer">
      <summary>Show all the numbers</summary>
      <table>
        <thead><tr><th>Stat ({basis.label})</th><th>{numbers.away}</th><th>{numbers.home}</th></tr></thead>
        <tbody>
          {numbers.rows.map((r) => <tr key={r.label}><td>{r.label}</td><td>{r.away}</td><td>{r.home}</td></tr>)}
        </tbody>
      </table>
      <p className="gr-muted">
        Ranks are out of 32 teams. EPA (expected points added) measures how much each play changes a team's
        chance to score; success rate is the share of plays that gain enough to stay on schedule.
      </p>
    </details>
  );
}

/** The in-depth Clark Report in Clark's voice (mockups/report.html). */
export default function ClarkReportArticle({ game, report, record }: { game: ApiPrediction; report: ClarkReportData; record: string }) {
  const pick = game.predicted_winner;
  const other = pick === game.home_team ? game.away_team : game.home_team;
  return (
    <article className="gv-panel cr">
      <div className="cr-kicker">The Clark Report · {game.week_label ?? `Week ${game.week}`}</div>
      <h1>{report.headline}</h1>
      <p className="cr-dek">{report.dek}</p>
      <div className="cr-by">
        <img src="/brand/clark-logo.jpg" alt="" width={40} height={40} />
        <div><b>Clark</b><span>The Clark Index's prediction model · {record} this season</span></div>
      </div>

      <div className="cr-pickbox">
        <div className="clark"><b>{pick} {report.meaning.pct}%</b><span>My pick</span></div>
        {report.line
          ? <div><b>{report.line.favorite} −{report.line.spread}</b><span>Betting line (about {report.line.pct}%)</span></div>
          : <div><b>No line yet</b><span>Betting line</span></div>}
      </div>

      <div className="cr-body">
        {report.intro.map((t) => <p key={t}>{t}</p>)}
        <Matchup section={report.deciding} />
        <Matchup section={report.other_side} />

        {report.injuries && <Injuries injuries={report.injuries} />}

        <h2>{report.underdog.title}</h2>
        <ol className="cr-watch">
          {report.underdog.items.map((it, i) => (
            <li key={it.lead}><span className="n">{i + 1}</span><span><b>{it.lead}</b> {it.text}</span></li>
          ))}
        </ol>

        <h2>What would change my mind</h2>
        <ul className="cr-watch">
          {report.change_my_mind.map((t) => <li key={t}><span className="n">→</span><span>{t}</span></li>)}
        </ul>

        <h2>{report.meaning.title}</h2>
        <Meter report={report} pick={pick} other={other} />
        <p>{report.meaning.body}</p>

        {report.line && (<><h2>Me vs the betting line</h2><p>{report.line.body}</p></>)}

        <NumbersDrawer report={report} />
        <div className="cr-signoff">
          <img src="/brand/clark-logo.jpg" alt="" width={36} height={36} />
          <span>{report.signoff} — Clark</span>
        </div>
      </div>
    </article>
  );
}
