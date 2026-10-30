// Times as the dashboard shows them: "just now", "5m ago", "3h ago", "2d ago", then the date.

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

/** How long ago `at` (epoch ms) was, from `now`; a time in the future reads "in 5m". */
export function relativeTime(at: number, now: number): string {
  const d = now - at;
  const ago = (n: number, unit: string) => (d < 0 ? `in ${n}${unit}` : `${n}${unit} ago`);
  const abs = Math.abs(d);
  if (abs < 45_000) return 'just now';
  if (abs < HOUR) return ago(Math.max(1, Math.round(abs / MIN)), 'm');
  if (abs < DAY) return ago(Math.round(abs / HOUR), 'h');
  if (abs < 7 * DAY) return ago(Math.round(abs / DAY), 'd');
  return new Date(at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: new Date(now).getFullYear() === new Date(at).getFullYear() ? undefined : 'numeric' });
}
