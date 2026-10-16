import type { ReactNode } from 'react';
import { Lock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { openAuthDialog } from '@/hooks/useAuthDialog';
import { gateView, type GateFeature } from '@/lib/gate';

/** True when this visitor needs an account to see `feature`. */
export function useGate(feature: GateFeature) {
  const { isSignedIn } = useAuth();
  return gateView(feature, isSignedIn);
}

type PreviewShape = 'article' | 'rows' | 'table' | 'field';

/**
 * Stand-in content for the blur. Never real data: a blurred number can still
 * be read, so the preview is shapes in the layout of the thing behind the wall.
 */
export function GatePreview({ shape = 'article' }: { shape?: PreviewShape }) {
  if (shape === 'field') return <div className="gate-sk gate-sk-field" />;
  const lines = shape === 'article' ? [92, 78, 85, 60, 88, 70, 40] : Array.from({ length: 7 }, (_, i) => 60 + ((i * 17) % 35));
  return (
    <div className={`gate-sk gate-sk-${shape}`}>
      {shape === 'article' && <div className="gate-sk-title" />}
      {lines.map((w, i) => (
        <div key={i} className="gate-sk-line">
          {shape !== 'article' && <span className="gate-sk-dot" />}
          <span className="gate-sk-bar" style={{ width: `${w}%` }} />
          {shape !== 'article' && <span className="gate-sk-num" />}
        </div>
      ))}
    </div>
  );
}

interface SignInGateProps {
  feature: GateFeature;
  /** What sits behind the blur. Defaults to an article-shaped placeholder. */
  preview?: ReactNode;
  /** Card only, no blurred preview — for small spots like a sidebar card. */
  compact?: boolean;
  children?: ReactNode;
}

/**
 * The one sign-in wall. Signed in, it renders its children untouched. Signed
 * out, it renders a blurred stand-in with Clark's sign-up card on top. It
 * never redirects: the page around it stays, so people see what they'd get.
 */
export default function SignInGate({ feature, preview, compact = false, children }: SignInGateProps) {
  const gate = useGate(feature);
  if (!gate.locked) return <>{children}</>;

  const card = (
    <div className="gate-card clark-card" role="region" aria-label="Members only">
      <img src="/brand/clark-logo.jpg" alt="" />
      <div className="gate-copy">
        <p>"{gate.quote}"<small>{gate.detail}</small></p>
        <div className="gate-actions">
          <button type="button" className="pill pill-red" onClick={() => openAuthDialog('signup')}>Create free account</button>
          <button type="button" className="gate-signin" onClick={() => openAuthDialog('signin')}>I have an account</button>
        </div>
      </div>
    </div>
  );

  if (compact) return <div className="gate gate-compact" data-gate={feature}>{card}</div>;
  return (
    <div className="gate" data-gate={feature}>
      <div className="gate-preview" aria-hidden="true">{preview ?? <GatePreview />}</div>
      <div className="gate-over">{card}</div>
    </div>
  );
}

/**
 * Inline stand-in for one of Clark's numbers (a pick chip, a rail label).
 * `interactive` renders a button that opens sign-up; leave it off inside links.
 */
export function LockedChip({ label = "Clark's pick", interactive = true }: { label?: string; interactive?: boolean }) {
  const body = <><Lock size={12} aria-hidden="true" />{label}</>;
  if (!interactive) return <span className="gate-chip">{body}</span>;
  return (
    <button type="button" className="gate-chip" onClick={() => openAuthDialog('signup')} aria-label={`${label}: create a free account to see it`}>
      {body}
    </button>
  );
}
