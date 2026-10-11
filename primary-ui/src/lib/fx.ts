/**
 * Celebration effects: team-color confetti and a small toast. DOM-only and
 * self-cleaning; both no-op under prefers-reduced-motion (the toast still shows).
 */
const reduced = (): boolean =>
  typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const CONFETTI_PIECES = 90;
const GRAVITY = 0.38;
const FADE_PER_FRAME = 0.011;

export function confetti(colors: string[], x = window.innerWidth / 2, y = window.innerHeight / 2): void {
  if (reduced() || colors.length === 0) return;
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  Object.assign(canvas.style, { position: 'fixed', inset: '0', width: '100%', height: '100%', pointerEvents: 'none', zIndex: '90' });
  document.body.appendChild(canvas);
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  const ctx = canvas.getContext('2d');
  if (!ctx) { canvas.remove(); return; }
  ctx.scale(dpr, dpr);
  const bits = Array.from({ length: CONFETTI_PIECES }, () => ({
    x, y, vx: (Math.random() - 0.5) * 14, vy: -Math.random() * 12 - 4, r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.4,
    w: 6 + Math.random() * 6, h: 4 + Math.random() * 4, c: colors[Math.floor(Math.random() * colors.length)], life: 1,
  }));
  const tick = () => {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    bits.forEach((b) => {
      b.x += b.vx; b.y += b.vy; b.vy += GRAVITY; b.vx *= 0.99; b.r += b.vr; b.life -= FADE_PER_FRAME;
      ctx.save(); ctx.globalAlpha = Math.max(0, b.life); ctx.translate(b.x, b.y); ctx.rotate(b.r);
      ctx.fillStyle = b.c; ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h); ctx.restore();
    });
    if (bits.some((b) => b.life > 0)) requestAnimationFrame(tick); else canvas.remove();
  };
  requestAnimationFrame(tick);
}

const TOAST_MS = 2400;
let toastTimer: number | undefined;

export function toast(text: string, imgSrc = '/brand/clark-logo.jpg'): void {
  let el = document.getElementById('clark-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'clark-toast';
    el.className = 'clark-toast';
    el.setAttribute('role', 'status');
    document.body.appendChild(el);
  }
  el.replaceChildren();
  const img = document.createElement('img');
  img.src = imgSrc; img.alt = '';
  el.append(img, document.createTextNode(text));
  el.classList.add('show');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => el?.classList.remove('show'), TOAST_MS);
}
