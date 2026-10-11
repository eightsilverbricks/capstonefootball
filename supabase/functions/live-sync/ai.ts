// ─── Optional free AI note (Gemini free tier) ─────────────────────────────────
// Only big plays are sent, about 20 a game. If the key is missing, the call
// fails, times out, hits a rate limit, or returns something unusable, this
// returns null and the template note from plays.ts is used. Nothing on the
// page ever depends on the AI being up.

import type { LivePlay } from './espnAdapter.ts';
import type { PlayContext } from './plays.ts';
import { scoreline } from './plays.ts';

const DEFAULT_MODEL = 'gemini-2.5-flash-lite';
const TIMEOUT_MS = 4000;
const MAX_CHARS = 220;

export interface AiConfig {
  apiKey: string | undefined;
  model?: string;
  fetchFn?: typeof fetch;
}

export function buildPrompt(p: LivePlay, ctx: PlayContext, template: string): string {
  const wp = ctx.wpAfter != null ? `${ctx.home} win chance now ${Math.round(ctx.wpAfter * 100)}%.` : '';
  return [
    'You write one-sentence notes for casual NFL fans watching live.',
    'Explain what this play means for the game in plain English.',
    'Rules: one sentence, at most 25 words, no statistics jargon (no EPA, no win probability added),',
    'use only the facts below, do not invent player names, injuries or history.',
    '',
    `Game: ${ctx.away} at ${ctx.home}. Quarter ${p.quarter}, ${p.clock} left. ${scoreline(p, ctx)}. ${wp}`,
    `Play: ${p.text}`,
    `Plain summary: ${template}`,
    '',
    'Note:',
  ].join('\n');
}

/** Reject anything that isn't a single short sentence of plain text. */
export function cleanAiText(text: string | undefined): string | null {
  const t = (text ?? '').trim().replace(/^["'“]|["'”]$/g, '');
  if (!t || t.length > MAX_CHARS || t.includes('\n')) return null;
  if (/\bEPA\b|as an ai|i cannot/i.test(t)) return null;
  return /[.!?]$/.test(t) ? t : `${t}.`;
}

export async function aiNote(
  p: LivePlay, ctx: PlayContext, template: string, config: AiConfig,
): Promise<string | null> {
  if (!config.apiKey) return null;
  const fetchFn = config.fetchFn ?? fetch;
  const model = config.model ?? DEFAULT_MODEL;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetchFn(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: buildPrompt(p, ctx, template) }] }],
          generationConfig: { maxOutputTokens: 60, temperature: 0.4 },
        }),
        signal: controller.signal,
      },
    );
    if (!res.ok) return null;
    const data = await res.json();
    return cleanAiText(data?.candidates?.[0]?.content?.parts?.[0]?.text);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
