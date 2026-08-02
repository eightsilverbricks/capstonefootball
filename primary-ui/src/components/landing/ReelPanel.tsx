import React, { useState } from 'react';
import { ExternalLink, Instagram, Play } from 'lucide-react';
import FoundersPortrait from '@/components/brand/FoundersPortrait';

// The reel that introduces us. Swap this one constant to change the video.
const REEL_ID = 'DXu1XJosWMO';
const REEL_URL = `https://www.instagram.com/reel/${REEL_ID}/`;
const REEL_EMBED_URL = `https://www.instagram.com/reel/${REEL_ID}/embed/captioned/`;

/**
 * Our intro reel, loaded on demand.
 *
 * The iframe is NOT rendered until someone clicks play — an Instagram embed
 * pulls in a few hundred KB of third-party JS and sets cookies, and neither
 * belongs on a landing page nobody has interacted with yet. Until then it's a
 * static poster that costs nothing.
 *
 * If the embed is blocked (private post, tracking-prevention, corporate proxy),
 * the "Watch on Instagram" link underneath always works.
 */
const ReelPanel: React.FC = () => {
  const [playing, setPlaying] = useState(false);

  return (
    <section aria-labelledby="reel-heading" className="max-w-5xl mx-auto px-4">
      <div
        className="rounded-2xl overflow-hidden grid md:grid-cols-2 gap-0"
        style={{ background: 'var(--surface)', border: '1px solid var(--border-subtle)' }}
      >
        {/* Copy */}
        <div className="p-6 sm:p-10 flex flex-col justify-center">
          <span
            className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] mb-4"
            style={{ color: 'var(--accent-gold)' }}
          >
            <Instagram className="w-3.5 h-3.5" aria-hidden="true" />
            Watch the intro
          </span>
          <h2
            id="reel-heading"
            className="font-bold leading-tight mb-3"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.6rem, 3.5vw, 2.5rem)',
              color: 'var(--text-primary)',
            }}
          >
            Sixty seconds with the three of us
          </h2>
          <p className="text-sm sm:text-base leading-relaxed mb-6" style={{ color: 'var(--text-secondary)' }}>
            What The Clark Index is, why we built it, and what you actually do with it — from the
            people who made it. Then come back and go make some picks.
          </p>

          <a
            href={REEL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm no-underline self-start transition-colors hover:text-[var(--text-primary)]"
            style={{ color: 'var(--text-tertiary)' }}
          >
            Watch on Instagram
            <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
          </a>
        </div>

        {/* Player */}
        <div
          className="relative flex items-center justify-center p-6 sm:p-8"
          style={{ background: 'var(--bg)', borderLeft: '1px solid var(--border-subtle)' }}
        >
          <div
            className="relative w-full max-w-[300px] aspect-[9/16] rounded-xl overflow-hidden"
            style={{ background: '#000', border: '1px solid var(--border-default)' }}
          >
            {playing ? (
              <iframe
                src={REEL_EMBED_URL}
                title="The Clark Index intro reel"
                className="absolute inset-0 w-full h-full"
                style={{ border: 0 }}
                allow="autoplay; clipboard-write; encrypted-media; picture-in-picture"
                allowFullScreen
                loading="lazy"
                scrolling="no"
              />
            ) : (
              <button
                type="button"
                onClick={() => setPlaying(true)}
                className="absolute inset-0 w-full h-full flex flex-col items-center justify-center gap-4 group"
                style={{
                  background:
                    'radial-gradient(120% 80% at 50% 20%, rgba(200,169,110,0.14) 0%, transparent 60%), #0b0b0d',
                }}
                aria-label="Play The Clark Index intro reel"
              >
                <div className="w-28 opacity-90 pointer-events-none">
                  <FoundersPortrait showLabels={false} animate={false} />
                </div>
                <span
                  className="relative w-14 h-14 rounded-full flex items-center justify-center transition-transform duration-200 group-hover:scale-110"
                  style={{ background: 'var(--accent-gold)', color: '#111' }}
                >
                  <Play className="w-6 h-6 ml-0.5" fill="currentColor" aria-hidden="true" />
                </span>
                <span
                  className="text-[11px] uppercase tracking-[0.2em]"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  Tap to play
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ReelPanel;
