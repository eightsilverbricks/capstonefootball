import React from 'react';
import { Link } from 'react-router-dom';
import TeamLogo from '@/components/TeamLogo';
import { Storyline, StorylineAngle } from '@/lib/leagueStorylines';

const ANGLE_COLORS: Record<StorylineAngle, string> = {
  read: 'var(--accent-gold)',
  upset: 'var(--stake-negative)',
  battle: 'var(--status-decisive)',
  market: 'var(--status-moderate)',
};

interface StorylineRailProps {
  storylines: Storyline[];
}

/**
 * The week's talking points as a horizontal rail — scroll-snapped cards, each
 * one a real piece of the model's own write-up for a specific game.
 *
 * Called a rail rather than a feed on purpose: these are angles on games that
 * haven't happened, not news that has.
 */
const StorylineRail: React.FC<StorylineRailProps> = ({ storylines }) => {
  if (storylines.length === 0) return null;

  return (
    <ul
      className="rail-scroll flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 list-none m-0"
      aria-label="This week's storylines"
    >
      {storylines.map((story) => {
        const accent = ANGLE_COLORS[story.angle];
        return (
          <li key={story.id} className="shrink-0 w-[19rem] max-w-[85vw]">
            <Link
              to={`/game/${story.game.season}/${story.game.week}/${story.game.away_team}/${story.game.home_team}`}
              className="lift-card flex flex-col h-full gap-3 p-5 rounded-xl no-underline"
              style={{ background: 'var(--surface)', border: '1px solid var(--border-subtle)' }}
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className="text-[10px] uppercase tracking-[0.18em] px-2 py-0.5 rounded"
                  style={{ color: accent, border: `1px solid ${accent}44` }}
                >
                  {story.kicker}
                </span>
                <span className="flex items-center gap-1 shrink-0">
                  <TeamLogo abbr={story.game.away_team} size="sm" className="!w-5 !h-5" />
                  <TeamLogo abbr={story.game.home_team} size="sm" className="!w-5 !h-5" />
                </span>
              </div>

              <h3
                className="font-bold leading-snug"
                style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', color: 'var(--text-primary)' }}
              >
                {story.headline}
              </h3>

              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
                {story.body}
              </p>

              <span
                className="text-[10px] uppercase tracking-[0.18em] mt-auto pt-2"
                style={{ color: 'var(--text-muted)', borderTop: '1px solid var(--border-subtle)' }}
              >
                {story.game.away_team} at {story.game.home_team} · {story.game.week_label ?? `Week ${story.game.week}`}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
};

export default StorylineRail;
