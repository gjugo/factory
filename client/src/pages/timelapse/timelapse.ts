// The time-lapse's words and numbers: how long ago, a day's size and counts, what a speed means, the scrubber's keys.
import type { JournalMark, MarkKind } from '../../../../shared/journal';

const MIN = 60_000;

export const hhmm = (t: number) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
export const dayLabel = (t: number) => new Date(t).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });

export const MARK_LABEL: Record<MarkKind, string> = { merge: 'Merged', 'needs-human': 'Needed you', issue: 'New issue' };

/** How long ago, in words: "25 min ago", "3 h 5 min ago", "2 days ago". */
export function agoText(ms: number): string {
  const min = Math.max(0, Math.round(ms / MIN));
  if (min < 60) return `${min} min ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h ${min % 60 ? `${min % 60} min ` : ''}ago`;
  const d = Math.floor(h / 24);
  return `${d} day${d === 1 ? '' : 's'} ago`;
}

/** How long a stretch lasts: "45 min", "3 h 10 min". */
export function spanText(ms: number): string {
  const min = Math.max(0, Math.round(ms / MIN));
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h${min % 60 ? ` ${min % 60} min` : ''}`;
}

export function sizeText(bytes: number): string {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function markCounts(marks: readonly JournalMark[]): Record<MarkKind, number> {
  const out: Record<MarkKind, number> = { merge: 0, 'needs-human': 0, issue: 0 };
  for (const m of marks) out[m.kind]++;
  return out;
}

/** What a speed means: "an hour in 30 seconds". */
export function speedNote(speed: number): string {
  const s = Math.round(3600 / speed);
  if (s >= 120 && s % 60 === 0) return `an hour in ${s / 60} minutes`;
  return `an hour in ${s} second${s === 1 ? '' : 's'}`;
}

/** Where the scrubber's keys go: arrows a 50th of the stretch, Page keys a tenth, Home and End the ends. Null: not ours. */
export function scrubKey(key: string, time: number, from: number, to: number): number | null {
  const step = (to - from) / 50;
  switch (key) {
    case 'ArrowRight':
    case 'ArrowUp':
      return Math.min(to, time + step);
    case 'ArrowLeft':
    case 'ArrowDown':
      return Math.max(from, time - step);
    case 'PageUp':
      return Math.min(to, time + 5 * step);
    case 'PageDown':
      return Math.max(from, time - 5 * step);
    case 'Home':
      return from;
    case 'End':
      return to;
    default:
      return null;
  }
}
