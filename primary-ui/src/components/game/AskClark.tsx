import { useState } from 'react';
import type { ApiPrediction } from '@/types/prediction';
import { askClark } from '@/lib/clarkVoice';

/** Suggested questions, answered from the report itself (§15: no AI). */
export default function AskClark({ game }: { game: ApiPrediction }) {
  const items = askClark(game);
  const [open, setOpen] = useState<number | null>(null);
  if (!items.length) return null;
  return (
    <section className="gv-panel" aria-labelledby="ask-h">
      <div className="gv-ph"><h2 id="ask-h">Ask Clark</h2><span className="gr-muted">Answers come straight from his report</span></div>
      <div className="gv-pb ask">
        <div className="ask-qs">
          {items.map((it, i) => (
            <button key={it.q} type="button" aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)}>{it.q}</button>
          ))}
        </div>
        {open != null && (
          <div className="ask-a" aria-live="polite">
            <img src="/brand/clark-logo.jpg" alt="" width={34} height={34} />
            <p>{items[open].a}</p>
          </div>
        )}
      </div>
    </section>
  );
}
