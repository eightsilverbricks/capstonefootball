/**
 * Game-chat stream logic, kept apart from React so it's unit-tested: merging
 * messages from the initial load, realtime and your own sends; the spoiler
 * shield; and when to follow the newest message.
 */
import type { ChatMessage } from '@/data/socialRepository';
import type { LivePlay } from '@/data/liveRepository';

export type ChatItem =
  | { kind: 'msg'; at: string; msg: ChatMessage }
  | { kind: 'play'; at: string; play: LivePlay };

/** Add messages that aren't there yet, keeping time order. Same id = same message. */
export function mergeMessages(prev: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  const seen = new Set(prev.map((m) => m.id));
  const fresh = incoming.filter((m) => !seen.has(m.id));
  if (fresh.length === 0) return prev;
  return [...prev, ...fresh].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id - b.id);
}

/** Messages and big plays in one time-ordered stream. */
export function chatStream(messages: ChatMessage[], plays: LivePlay[]): ChatItem[] {
  return [
    ...messages.map((msg) => ({ kind: 'msg' as const, at: msg.createdAt, msg })),
    ...plays.filter((p) => p.is_big).map((play) => ({ kind: 'play' as const, at: play.created_at, play })),
  ].sort((a, b) => a.at.localeCompare(b.at));
}

/**
 * The spoiler shield holds items back until they're `delaySec` old, so chat
 * doesn't spoil a broadcast that's running behind. Your own messages are never
 * held: you already know what you said.
 */
export function applyShield(items: ChatItem[], delaySec: number, now: number, myId: string | null): ChatItem[] {
  if (!delaySec) return items;
  const cutoff = now - delaySec * 1000;
  return items.filter((it) => (it.kind === 'msg' && myId && it.msg.userId === myId) || Date.parse(it.at) <= cutoff);
}

/** How close to the bottom still counts as "reading the newest" (px). */
export const FOLLOW_SLACK_PX = 120;

export function isNearBottom(el: { scrollHeight: number; scrollTop: number; clientHeight: number }): boolean {
  return el.scrollHeight - el.scrollTop - el.clientHeight < FOLLOW_SLACK_PX;
}
