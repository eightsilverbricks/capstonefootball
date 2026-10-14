import { useState } from 'react';
import { drawShareCard, type ShareSpec } from '@/lib/shareImage';
import type { ApiPrediction } from '@/types/prediction';
import { getPredictedProbability } from '@/types/prediction';

const pct = (p: number) => Math.round(p * 100);

export function specFor(game: ApiPrediction, userPick: { team: string; confidence: number }): ShareSpec {
  const clarkPct = pct(getPredictedProbability(game));
  if (game.actual_winner) {
    return {
      kind: 'result', team: userPick.team, pct: pct(userPick.confidence),
      right: userPick.team === game.actual_winner, clarkTeam: game.predicted_winner,
      clarkRight: game.predicted_winner === game.actual_winner,
      score: `${game.away_team} ${game.away_score} – ${game.home_score} ${game.home_team}`,
    };
  }
  return {
    kind: 'pick', team: userPick.team, pct: pct(userPick.confidence),
    clarkTeam: game.predicted_winner, clarkPct, matchup: `${game.away_team} at ${game.home_team} · Week ${game.week}`,
  };
}

/** Phones: the share sheet with the card image. Desktop: download the card or copy the link. */
export function ShareSpecButtons({ spec, url, label = 'Share' }: { spec: ShareSpec; url: string; label?: string }) {
  const [msg, setMsg] = useState('');
  const file = async () => new File([await drawShareCard(spec)], 'clark-index.png', { type: 'image/png' });

  const share = async () => {
    try {
      const f = await file();
      if (navigator.canShare?.({ files: [f] })) { await navigator.share({ files: [f], url }); return; }
      if (navigator.share) { await navigator.share({ url }); return; }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(f);
      a.download = f.name;
      a.click();
      URL.revokeObjectURL(a.href);
      setMsg('Card downloaded');
    } catch { /* cancelled */ }
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setMsg('Link copied'); } catch { setMsg('Copy failed'); }
  };

  return (
    <div className="rc-share">
      <button type="button" onClick={share}>{label}</button>
      <button type="button" onClick={copy}>Copy link</button>
      {msg && <span className="gr-muted" role="status" style={{ alignSelf: 'center', fontSize: 13 }}>{msg}</span>}
    </div>
  );
}

export default function ShareButtons({ game, userPick }: { game: ApiPrediction; userPick: { team: string; confidence: number } | null }) {
  if (!userPick) return null;
  const url = typeof window !== 'undefined' ? window.location.href : 'https://clarkindex.com';
  return <ShareSpecButtons spec={specFor(game, userPick)} url={url} label={game.actual_winner ? 'Share my result' : 'Share my pick'} />;
}
