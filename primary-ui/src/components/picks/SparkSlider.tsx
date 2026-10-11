import { useEffect, useRef, useState } from 'react';
import { getEspnLogoUrl, getTeamColors } from '@/data/nflData';
import { Pick } from '@/competition/types';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface SparkSliderProps {
  away: string;
  home: string;
  awayName: string;
  homeName: string;
  value: Pick;
  onChange: (pick: Pick) => void;
  /** Fired when the user lets go with a side chosen. */
  onRelease?: (pick: Pick, at: { x: number; y: number }) => void;
}

interface Spark { x: number; y: number; vx: number; vy: number; life: number; c: string; r: number }

const CENTER_SNAP = 3;
const MAX_SPARKS = 90;
const KEY_STEP = 5;

/** Slider position 0…100 (0 = 100% away, 50 = no pick, 100 = 100% home) ↔ Pick. */
export function toPosition(pick: Pick, home: string): number {
  const c = Math.round(pick.confidence * 100);
  if (c <= 50) return 50;
  return pick.team === home ? c : 100 - c;
}

export function toPick(position: number, away: string, home: string): Pick {
  if (position === 50) return { team: home, confidence: 0.5 };
  return position > 50 ? { team: home, confidence: position / 100 } : { team: away, confidence: (100 - position) / 100 };
}

function confidenceWord(pct: number): string {
  if (pct >= 90) return 'Lock it in 🔒';
  if (pct >= 75) return 'Feeling good';
  if (pct >= 60) return 'Leaning';
  return 'Coin flip-ish';
}

/**
 * The pick slider: drag toward a team, further = more confident. The handle
 * shows the team's logo, the bar fills in its color, and sparks in that color
 * fly while dragging. Pointer capture keeps the drag alive off the track.
 */
export default function SparkSlider({ away, home, awayName, homeName, value, onChange, onRelease }: SparkSliderProps) {
  const reduced = useReducedMotion();
  const trackRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sparks = useRef<Spark[]>([]);
  const frame = useRef<number | null>(null);
  const [dragging, setDragging] = useState(false);

  const position = toPosition(value, home);
  const side = position === 50 ? null : position > 50 ? home : away;
  const sideName = side === home ? homeName : awayName;
  const pct = 50 + Math.abs(position - 50);
  const color = side ? getTeamColors(side).primary : 'var(--ink-3)';

  useEffect(() => () => { if (frame.current) cancelAnimationFrame(frame.current); }, []);

  const step = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    sparks.current = sparks.current.filter((p) => p.life > 0);
    sparks.current.forEach((p) => {
      p.x += p.vx; p.y += p.vy; p.vy += 0.18; p.life -= 0.03;
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.c; ctx.shadowColor = p.c; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * p.life + 0.5, 0, Math.PI * 2); ctx.fill();
    });
    frame.current = sparks.current.length ? requestAnimationFrame(step) : null;
  };

  const burst = (clientX: number, clientY: number, c: string, n: number) => {
    const canvas = canvasRef.current;
    if (reduced || !canvas) return;
    const box = canvas.getBoundingClientRect();
    const room = Math.max(0, MAX_SPARKS - sparks.current.length);
    for (let i = 0; i < Math.min(n, room); i++) {
      const a = Math.random() * Math.PI * 2;
      const v = 1.5 + Math.random() * 3.5;
      sparks.current.push({ x: clientX - box.left, y: clientY - box.top, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1.5, life: 1, c, r: 1.5 + Math.random() * 2.5 });
    }
    if (!frame.current) frame.current = requestAnimationFrame(step);
  };

  const positionFrom = (clientX: number): number => {
    const r = trackRef.current?.getBoundingClientRect();
    if (!r) return 50;
    const raw = Math.round(Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100)));
    return Math.abs(raw - 50) < CENTER_SNAP ? 50 : raw;
  };

  const moveTo = (clientX: number) => {
    const next = positionFrom(clientX);
    if (next === position) return;
    const pick = toPick(next, away, home);
    onChange(pick);
    if (next !== 50) {
      const r = trackRef.current!.getBoundingClientRect();
      burst(r.left + (next / 100) * r.width, r.top + r.height / 2, getTeamColors(pick.team).primary, 3 + Math.round(Math.abs(next - 50) / 10));
    }
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* not capturable */ }
    setDragging(true);
    moveTo(e.clientX);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => { if (dragging) moveTo(e.clientX); };
  const finish = (e: React.PointerEvent<HTMLDivElement>, released: boolean) => {
    if (!dragging) return;
    setDragging(false);
    const pick = toPick(positionFrom(e.clientX), away, home);
    if (released && pick.confidence > 0.5) onRelease?.(pick, { x: e.clientX, y: e.clientY });
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const next = Math.min(100, Math.max(0, position + (e.key === 'ArrowRight' ? KEY_STEP : -KEY_STEP)));
    onChange(toPick(next, away, home));
  };

  const fillLeft = position >= 50 ? 50 : position;
  return (
    <div className={`spark-slider${dragging ? ' is-dragging' : ''}`}>
      <div className="ss-labels">
        <span style={side === away ? { color, transform: 'scale(1.1)' } : undefined}>{awayName}</span>
        <span style={side === home ? { color, transform: 'scale(1.1)' } : undefined}>{homeName}</span>
      </div>
      <div
        className="ss-track"
        ref={trackRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={(e) => finish(e, true)}
        onPointerCancel={(e) => finish(e, false)}
      >
        <span className="ss-fill" style={{ left: `${fillLeft}%`, width: `${Math.abs(position - 50)}%`, background: color }} />
        <span className="ss-mid" />
        <span
          className="ss-thumb"
          role="slider"
          tabIndex={0}
          aria-label={`Your pick: ${awayName} or ${homeName}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={position}
          aria-valuetext={side ? `${sideName} ${pct}%` : 'No pick'}
          onKeyDown={onKeyDown}
          style={{ left: `${position}%`, ['--tc' as string]: color }}
        >
          <img src={side ? getEspnLogoUrl(side) : '/brand/clark-logo.jpg'} alt="" draggable={false} />
        </span>
      </div>
      <div className="ss-read">
        {side ? <>{sideName} · {pct}%<small>{confidenceWord(pct)}</small></> : <>Drag toward a team<small>Further = more confident</small></>}
      </div>
      <canvas className="ss-canvas" ref={canvasRef} aria-hidden="true" />
    </div>
  );
}
