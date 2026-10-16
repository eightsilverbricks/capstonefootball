import { describe, expect, it } from 'vitest';
import { applyShield, chatStream, isNearBottom, mergeMessages } from './chat';
import type { ChatMessage } from '@/data/socialRepository';
import type { LivePlay } from '@/data/liveRepository';

const msg = (id: number, at: string, userId = 'u1'): ChatMessage => ({ id, userId, body: `m${id}`, createdAt: at, author: null });
const play = (id: string, at: string, big = true) => ({ play_id: id, created_at: at, is_big: big } as LivePlay);

describe('mergeMessages', () => {
  it('adds new messages in time order', () => {
    const out = mergeMessages([msg(1, '2026-10-15T20:00:00Z')], [msg(3, '2026-10-15T20:02:00Z'), msg(2, '2026-10-15T20:01:00Z')]);
    expect(out.map((m) => m.id)).toEqual([1, 2, 3]);
  });

  it('ignores a message it already has (your send, then the realtime echo)', () => {
    const prev = [msg(1, '2026-10-15T20:00:00Z')];
    expect(mergeMessages(prev, [msg(1, '2026-10-15T20:00:00Z')])).toBe(prev);
  });
});

describe('chatStream', () => {
  it('interleaves messages with big plays only', () => {
    const items = chatStream([msg(1, '2026-10-15T20:00:02Z')], [play('a', '2026-10-15T20:00:01Z'), play('b', '2026-10-15T20:00:03Z', false)]);
    expect(items.map((i) => i.kind)).toEqual(['play', 'msg']);
  });
});

describe('applyShield', () => {
  const now = Date.parse('2026-10-15T20:01:00Z');
  const items = chatStream([msg(1, '2026-10-15T20:00:00Z'), msg(2, '2026-10-15T20:00:50Z', 'u2'), msg(3, '2026-10-15T20:00:55Z', 'me')], []);

  it('passes everything through when off', () => {
    expect(applyShield(items, 0, now, 'me')).toHaveLength(3);
  });

  it('holds back items newer than the delay', () => {
    const ids = applyShield(items, 30, now, null).map((i) => (i.kind === 'msg' ? i.msg.id : 0));
    expect(ids).toEqual([1]);
  });

  it('never holds back your own messages', () => {
    const ids = applyShield(items, 30, now, 'me').map((i) => (i.kind === 'msg' ? i.msg.id : 0));
    expect(ids).toEqual([1, 3]);
  });
});

describe('isNearBottom', () => {
  it('follows when the reader is at the bottom', () => {
    expect(isNearBottom({ scrollHeight: 1000, scrollTop: 600, clientHeight: 380 })).toBe(true);
  });
  it('stops following once the reader scrolls up', () => {
    expect(isNearBottom({ scrollHeight: 1000, scrollTop: 200, clientHeight: 380 })).toBe(false);
  });
});
