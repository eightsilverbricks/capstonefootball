// ─── Share cards (§8) — drawn in the browser, no server ──────────────────────
// Three kinds: the pick card (at lock), the result card (after the final),
// and the weekly card (record + ✓/✗ grid). shareLines() is pure and tested;
// drawShareCard() paints it onto a 1200×630 canvas (the link-preview size).

export type ShareSpec =
  | { kind: 'pick'; team: string; pct: number; clarkTeam: string; clarkPct: number; matchup: string }
  | { kind: 'result'; team: string; pct: number; right: boolean; clarkTeam: string; clarkRight: boolean; score: string }
  | { kind: 'week'; week: number; wins: number; losses: number; clarkWins: number; clarkLosses: number; grid: ('W' | 'L')[] };

export interface ShareLines { kicker: string; big: string; sub: string; foot: string }

export function shareLines(s: ShareSpec): ShareLines {
  if (s.kind === 'pick') {
    return { kicker: s.matchup, big: `My pick: ${s.team} ${s.pct}%`, sub: `Clark: ${s.clarkTeam} ${s.clarkPct}%`, foot: 'Make yours at clarkindex.com' };
  }
  if (s.kind === 'result') {
    const called = s.right && !s.clarkRight;
    return {
      kicker: s.score,
      big: `${s.team} at ${s.pct}% ${s.right ? '✓' : '✗'}`,
      sub: called ? `Called it. Clark had ${s.clarkTeam}.` : `Clark had ${s.clarkTeam} ${s.clarkRight ? '✓' : '✗'}`,
      foot: 'The Clark Index',
    };
  }
  return {
    kicker: `The Clark Index · Week ${s.week}`,
    big: `${s.wins}–${s.losses}`,
    sub: `Clark ${s.clarkWins}–${s.clarkLosses}`,
    foot: s.grid.map((r) => (r === 'W' ? '✓' : '✗')).join(' '),
  };
}

const W = 1200;
const H = 630;

export async function drawShareCard(spec: ShareSpec): Promise<Blob> {
  const lines = shareLines(spec);
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');

  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#E23B3B');
  g.addColorStop(1, '#FF8A3D');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(255,255,255,.08)';
  for (let x = -H; x < W; x += 44) { ctx.beginPath(); ctx.moveTo(x, H); ctx.lineTo(x + H, 0); ctx.lineTo(x + H + 18, 0); ctx.lineTo(x + 18, H); ctx.fill(); }

  try {
    const logo = new Image();
    logo.src = '/brand/clark-logo.jpg';
    await logo.decode();
    ctx.save();
    ctx.beginPath(); ctx.arc(110, 110, 56, 0, Math.PI * 2); ctx.clip();
    ctx.drawImage(logo, 54, 54, 112, 112);
    ctx.restore();
  } catch { /* the card still works without the logo */ }

  ctx.fillStyle = '#fff';
  ctx.textBaseline = 'alphabetic';
  ctx.font = '700 34px Montserrat, Inter, sans-serif';
  ctx.fillText(lines.kicker, 190, 122);
  ctx.font = '900 120px Montserrat, Inter, sans-serif';
  ctx.fillText(lines.big, 60, 360, W - 120);
  ctx.font = '700 50px Inter, sans-serif';
  ctx.fillText(lines.sub, 60, 440, W - 120);
  ctx.font = '800 36px Inter, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,.92)';
  ctx.fillText(lines.foot, 60, 570, W - 120);

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Image failed'))), 'image/png'));
}
