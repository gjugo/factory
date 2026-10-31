import { describe, expect, it } from 'vitest';
import type { PhoneMessage } from '../../../../shared/types';
import { dayLabel, firstUnreadId, followNewMessage, groupByDay, isAtBottom, readMarkFor, unseenCount } from './thread';
import { hireOverrides, outcomeLabel, presenceLine, setupOf } from './hire';

const at = (y: number, mo: number, d: number, h = 12) => new Date(y, mo - 1, d, h).getTime();
const msg = (id: number, from: PhoneMessage['from'], t: number, extra: Partial<PhoneMessage> = {}): PhoneMessage => ({ id, from, text: `m${id}`, at: t, ...extra });
const NOW = at(2026, 10, 31, 15);

describe('groupByDay', () => {
  it('splits the thread into local days in order, labelled Today and Yesterday', () => {
    const days = groupByDay(
      [msg(1, 'ceo', at(2026, 10, 20, 9)), msg(2, 'manager', at(2026, 10, 30, 23)), msg(3, 'ceo', at(2026, 10, 31, 0)), msg(4, 'office', at(2026, 10, 31, 14))],
      NOW,
    );
    expect(days.map((d) => [d.label === 'Today' || d.label === 'Yesterday' ? d.label : 'date', d.messages.map((m) => m.id)])).toEqual([
      ['date', [1]],
      ['Yesterday', [2]],
      ['Today', [3, 4]],
    ]);
  });

  it('is empty for no messages', () => {
    expect(groupByDay([], NOW)).toEqual([]);
  });

  it('names older days by date, with the year only when it differs', () => {
    expect(dayLabel(at(2026, 3, 3), NOW)).not.toMatch(/2026/);
    expect(dayLabel(at(2025, 3, 3), NOW)).toMatch(/2025/);
  });
});

describe('unread', () => {
  const thread = [msg(1, 'ceo', 100), msg(2, 'manager', 200), msg(3, 'office', 300), msg(4, 'ceo', 400), msg(5, 'ceo', 500, { requestId: 'r1' })];

  it('puts the divider at the first CEO message after the read mark', () => {
    expect(firstUnreadId(thread, 150)).toBe(4);
    expect(firstUnreadId(thread, 50)).toBe(1);
    expect(firstUnreadId(thread, 500)).toBeNull();
  });

  it("counts only the CEO's messages for the jump button", () => {
    expect(unseenCount(thread, 150)).toBe(2);
    expect(unseenCount(thread, 0)).toBe(3);
  });

  it('marks up to the newest message, and nothing once it is read', () => {
    expect(readMarkFor(thread, 150)).toBe(500);
    expect(readMarkFor(thread, 500)).toBeNull();
    expect(readMarkFor([], 0)).toBeNull();
  });
});

describe('scroll anchor', () => {
  it('is at the bottom within the slack', () => {
    expect(isAtBottom({ scrollTop: 600, scrollHeight: 1000, clientHeight: 400 })).toBe(true);
    expect(isAtBottom({ scrollTop: 560, scrollHeight: 1000, clientHeight: 400 })).toBe(true);
    expect(isAtBottom({ scrollTop: 500, scrollHeight: 1000, clientHeight: 400 })).toBe(false);
  });

  it("follows new messages only from the bottom, or the manager's own sent from this thread", () => {
    expect(followNewMessage(true, msg(1, 'ceo', 1), false)).toBe(true);
    expect(followNewMessage(false, msg(1, 'ceo', 1), false)).toBe(false);
    expect(followNewMessage(false, msg(1, 'ceo', 1), true)).toBe(false);
    expect(followNewMessage(false, msg(1, 'office', 1), false)).toBe(false);
    expect(followNewMessage(false, msg(1, 'manager', 1), true)).toBe(true);
    expect(followNewMessage(false, msg(1, 'manager', 1), false)).toBe(false); // sent from another tab
  });
});

describe('team changes', () => {
  const req = { name: 'Ada', cli: 'claude', model: '', effort: '', host: undefined, kind: 'hire', status: 'pending' } as const;

  it("takes the CEO's picks and puts an emptied name back", () => {
    const setup = setupOf(req as never);
    expect(setup).toEqual({ name: 'Ada', cli: 'claude', model: '', effort: '', host: '' });
    expect(hireOverrides(req as never, { ...setup, name: '  ', model: ' gpt-5 ' })).toMatchObject({ name: 'Ada', model: 'gpt-5' });
  });

  it('words decisions', () => {
    expect(outcomeLabel({ kind: 'hire', status: 'approved' })).toBe('Hired');
    expect(outcomeLabel({ kind: 'let-go', status: 'rejected' })).toBe('Kept');
  });

  it("says what the CEO is up to", () => {
    const info = { queue: [], job: null, lastReviewAt: null, nextReviewAt: null };
    expect(presenceLine('idle', info, 0, 0)).toBe('Available');
    expect(presenceLine('working', { ...info, job: { kind: 'chat', label: 'Chat' } }, 1, 0)).toBe('Typing…');
    expect(presenceLine('idle', { ...info, queue: [{ kind: 'chat', label: 'Chat' }] }, 3, 3)).toMatch(/3\/3 busy/);
  });
});
