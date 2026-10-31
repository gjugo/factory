import type { PhoneMessage } from '../../../../shared/types';

// The CEO thread's pure decisions: messages grouped by day, where the "new" divider goes, what counts as seen, and
// whether a new message may scroll the view.

export interface ThreadDay {
  key: string; // the local date, YYYY-MM-DD
  label: string; // Today, Yesterday, or the date
  messages: PhoneMessage[];
}

const dayKey = (t: number) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** "Today", "Yesterday", else "Mon, 3 Mar" (with the year when it isn't this year), in the local time zone. */
export function dayLabel(at: number, now: number): string {
  const key = dayKey(at);
  if (key === dayKey(now)) return 'Today';
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (key === dayKey(yesterday.getTime())) return 'Yesterday';
  const sameYear = new Date(at).getFullYear() === new Date(now).getFullYear();
  return new Date(at).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: sameYear ? undefined : 'numeric' });
}

/** The thread split into local days, in the order the messages came. */
export function groupByDay(messages: PhoneMessage[], now: number): ThreadDay[] {
  const days: ThreadDay[] = [];
  for (const m of messages) {
    const key = dayKey(m.at);
    const last = days[days.length - 1];
    if (last?.key === key) last.messages.push(m);
    else days.push({ key, label: dayLabel(m.at, now), messages: [m] });
  }
  return days;
}

/** Messages the manager hasn't read: the CEO's, after `readAt`. */
export const isUnread = (m: PhoneMessage, readAt: number) => m.from === 'ceo' && m.at > readAt;

/** The first unread message's id, where the "New" divider goes; null when everything was read. */
export function firstUnreadId(messages: PhoneMessage[], readAt: number): number | null {
  return messages.find((m) => isUnread(m, readAt))?.id ?? null;
}

/** How many CEO messages came after `seenAt`: the jump button's count while the manager reads older ones. */
export const unseenCount = (messages: PhoneMessage[], seenAt: number) => messages.filter((m) => isUnread(m, seenAt)).length;

/** The read mark to send once the thread's end is on screen: the newest message's time, or null if nothing's new. */
export function readMarkFor(messages: PhoneMessage[], readAt: number): number | null {
  const last = messages[messages.length - 1];
  return last && last.at > readAt ? last.at : null;
}

/** How close (px) to the end of the thread still counts as "at the bottom". */
export const BOTTOM_SLACK = 48;

/** Whether a scroller shows the end of its content (within `slack` px). */
export function isAtBottom(el: { scrollTop: number; scrollHeight: number; clientHeight: number }, slack = BOTTOM_SLACK): boolean {
  return el.scrollHeight - el.scrollTop - el.clientHeight <= slack;
}

/**
 * What a new message does to the view: follow it when the manager was at the bottom or just sent it from this
 * thread, else stay put (and the jump button offers it) so reading older messages is never interrupted. A message
 * sent from another tab doesn't count as sent here.
 */
export function followNewMessage(wasAtBottom: boolean, newest: PhoneMessage | undefined, sentHere: boolean): boolean {
  return wasAtBottom || (sentHere && newest?.from === 'manager');
}
