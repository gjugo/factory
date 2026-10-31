// The installable app (docs/notifications.md): the service worker the office serves at /sw.js (server/pwa.ts), the
// browser's install offer, and Web Push for this device. Push needs a secure context: HTTPS, or localhost.
import { useSyncExternalStore } from 'react';
import { api } from './api';
import { OPEN_EVENT } from './notifications';

/** Chromium's install offer, held until the manager clicks Install app. */
interface InstallPrompt extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let installOffer: InstallPrompt | null = null;
const listeners = new Set<() => void>();
const changed = () => listeners.forEach((l) => l());

/** Registers the worker in a built office (the dev server has none). A new office version replaces it on its own. */
export function registerServiceWorker() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // offered from Settings instead of the browser's own bar
    installOffer = e as InstallPrompt;
    changed();
  });
  window.addEventListener('appinstalled', () => {
    installOffer = null;
    changed();
  });
  if (!import.meta.env.PROD || !('serviceWorker' in navigator) || !window.isSecureContext) return;
  navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).catch((err) => console.warn('no service worker:', err));
  // A clicked notification asks the open office to show what it's about.
  navigator.serviceWorker.addEventListener('message', (e: MessageEvent<{ type?: string; url?: string }>) => {
    if (e.data?.type === OPEN_EVENT) window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: e.data.url }));
  });
}

/** Whether the browser offers to install the office as an app right now, and the click that accepts. */
export function useInstallOffer(): { offered: boolean; install: () => Promise<void> } {
  const offered = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => installOffer !== null,
  );
  const install = async () => {
    const offer = installOffer;
    if (!offer) return;
    await offer.prompt();
    if ((await offer.userChoice).outcome === 'accepted') installOffer = null;
    changed();
  };
  return { offered, install };
}

/** Running as the installed app (its own window), not in a browser tab. */
export const installed = () => typeof matchMedia !== 'undefined' && matchMedia('(display-mode: standalone)').matches;

/** ok, or why this browser can't get push: no HTTPS, no Push API, or the dev server (no worker). */
export type PushSupport = 'ok' | 'insecure' | 'unsupported' | 'dev';

export function pushSupport(): PushSupport {
  if (!window.isSecureContext) return 'insecure';
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || typeof Notification === 'undefined') return 'unsupported';
  return import.meta.env.PROD ? 'ok' : 'dev';
}

/** This device's push subscription, if it has one. */
export async function currentPush(): Promise<PushSubscription | null> {
  const reg = await navigator.serviceWorker.getRegistration();
  return reg ? reg.pushManager.getSubscription() : null;
}

export const fromB64u = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));

/** Whether a subscription was made with this office's key (not another office's on the same address). */
export function sameKey(have: ArrayBuffer | null, key: Uint8Array) {
  return !!have && have.byteLength === key.length && new Uint8Array(have).every((b, i) => b === key[i]);
}

/** Asks to show notifications, subscribes with the office's key and tells the office. Throws why not. */
export async function enablePush(): Promise<void> {
  if (Notification.permission !== 'granted' && (await Notification.requestPermission()) !== 'granted') {
    throw new Error("Notifications are blocked for the office in this browser's site settings.");
  }
  const reg = await navigator.serviceWorker.ready;
  const key = fromB64u((await api.pushKey()).publicKey);
  let sub = await reg.pushManager.getSubscription();
  if (sub && !sameKey(sub.options.applicationServerKey, key)) {
    await sub.unsubscribe(); // made for another office's key
    sub = null;
  }
  sub ??= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
  await api.pushSubscribe(sub.toJSON());
}

/** This device stops getting push: the office forgets it, then the browser drops the subscription. */
export async function disablePush(): Promise<void> {
  const sub = await currentPush();
  if (!sub) return;
  await api.pushUnsubscribe(sub.endpoint).catch(() => undefined);
  await sub.unsubscribe();
}
