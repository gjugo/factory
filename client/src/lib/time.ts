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

/** How long something has been up: "45s", "12m", "3h 5m", "2d 4h". */
export function duration(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return m % 60 ? `${h}h ${m % 60}m` : `${h}h`;
  const d = Math.floor(h / 24);
  return h % 24 ? `${d}d ${h % 24}h` : `${d}d`;
}
