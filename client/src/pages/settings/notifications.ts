// Settings → Notifications, the pure part: the words for this browser's permission, push support and devices, and the
// Tailscale Serve line for the office's own port.
import type { PushSupport } from '@/pwa';

export type Permission = NotificationPermission | 'unsupported';

/** The port the office listens on, from the address this page was opened at (factory's default behind a proxy). */
export const officePort = (loc: { hostname: string; port: string }) => (loc.port && /^(localhost|127\.0\.0\.1|\[::1\])$/.test(loc.hostname) ? loc.port : '4517');

/** "No devices get push yet", "1 device gets push", "3 devices get push". */
export const devicesText = (n: number) => (n === 0 ? 'No devices get push yet' : n === 1 ? '1 device gets push' : `${n} devices get push`);

/** Desktop notifications in this browser: allowed, blocked, or can't. Null while it can still ask. */
export function permissionText(p: Permission): { tone: 'ok' | 'bad' | 'muted'; text: string } | null {
  if (p === 'granted') return { tone: 'ok', text: 'Allowed in this browser.' };
  if (p === 'denied') return { tone: 'bad', text: "Blocked in this browser: allow notifications for this site in the browser's site settings." };
  if (p === 'unsupported') return { tone: 'muted', text: "This browser can't show notifications." };
  return null;
}

/** Why push can't be turned on here; null when it can. */
export function pushBlocker(s: PushSupport): string | null {
  if (s === 'insecure') return 'Push needs HTTPS, or localhost on the office’s own computer. Open the office through an HTTPS address such as Tailscale Serve (below).';
  if (s === 'unsupported') return 'This browser has no Web Push. On an iPhone, add the office to the Home Screen first, then turn push on from the installed app.';
  if (s === 'dev') return 'Push works in a built office (npm run build), not under the Vite dev server.';
  return null;
}
