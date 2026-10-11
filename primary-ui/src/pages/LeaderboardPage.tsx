import React from 'react';
import PageShell from '@/components/layout/PageShell';
import Card from '@/components/layout/Card';

/** Placeholder until phase 4 (weekly, season, fanbase and "Beat Clark" boards). */
const LeaderboardPage: React.FC = () => (
  <PageShell title="Leaderboard">
    <Card>
      <p className="pt-4 text-[15px]" style={{ color: 'var(--text-secondary)' }}>
        Leaderboards are not available yet.
      </p>
    </Card>
  </PageShell>
);

export default LeaderboardPage;
