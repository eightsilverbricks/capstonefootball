import React from 'react';
import PageShell from '@/components/layout/PageShell';
import Card from '@/components/layout/Card';
import TeamLogo from '@/components/TeamLogo';
import { groupByDivision } from '@/data/teams';

/** All 32 teams by division. Team pages (/team/:abbr) arrive in phase 5. */
const TeamsPage: React.FC = () => (
  <PageShell title="Teams">
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {groupByDivision().map((group) => (
        <Card key={group.label} title={group.label} flush>
          <ul>
            {group.teams.map((team) => (
              <li
                key={team.abbr}
                className="flex items-center gap-3 px-4 py-2.5"
                style={{ borderTop: '1px solid var(--divider)' }}
              >
                <TeamLogo abbr={team.abbr} size="sm" />
                <span className="min-w-0">
                  <span className="block text-[15px] font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>
                    {team.name}
                  </span>
                  <span className="block text-[13px]" style={{ color: 'var(--text-tertiary)' }}>
                    {team.city}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      ))}
    </div>
  </PageShell>
);

export default TeamsPage;
