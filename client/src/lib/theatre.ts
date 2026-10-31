import { useEffect } from 'react';
import { api } from '@/api';
import { useStore } from '@/store';
import type { Channel } from './channels';

// The app viewer's ties to the office (cubefarm's theatre.ts): the heartbeat that keeps the PR preview on screen from
// idle-stopping, the word that this tab has left, and window.__swarmPreviews for QA.

/** How often an open viewer tells the office what it has on screen (the office counts a viewer gone after 75 s). */
const WATCH_EVERY_MS = 30_000;

/** This tab, to the office: one viewer, whose latest word on what's on screen replaces its last. */
export const VIEWER = (() => {
  try {
    return crypto.randomUUID();
  } catch {
    return `viewer-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
  }
})();

/** What each project's viewer has on screen in this tab, for window.__swarmPreviews. */
const onScreen = new Map<string, Channel>();

/** Tell the office this tab watches nothing, even while the page unloads (a beacon outlives it; fetch may not). */
function leave() {
  const body = JSON.stringify({ viewer: VIEWER, repoId: null, pr: null });
  if (navigator.sendBeacon?.('/api/previews/watch', new Blob([body], { type: 'application/json' }))) return;
  void api.watchPreview(VIEWER, null, null).catch(() => undefined);
}

/** While the viewer is open: say which PR preview is on screen every 30 s, and that nothing is once it closes. */
export function useWatchPreview(repoId: string, pr: Channel) {
  useEffect(() => {
    onScreen.set(repoId, pr);
    const say = () => void api.watchPreview(VIEWER, pr == null ? null : repoId, pr).catch(() => undefined);
    // Back from the back/forward cache: on screen again.
    const back = (e: PageTransitionEvent) => e.persisted && say();
    say();
    const t = setInterval(say, WATCH_EVERY_MS);
    window.addEventListener('pageshow', back);
    return () => {
      clearInterval(t);
      window.removeEventListener('pageshow', back);
      onScreen.delete(repoId);
    };
  }, [repoId, pr]);
  // Only when the viewer goes (a new channel's word replaces the last by itself, so no "left" in between).
  useEffect(() => {
    window.addEventListener('pagehide', leave);
    return () => {
      window.removeEventListener('pagehide', leave);
      leave();
    };
  }, []);
}

// window.__swarmPreviews: every project's main preview with what this tab's viewer shows, and every PR preview (a fresh
// snapshot per read). QA agents read it to find the apps.
if (typeof window !== 'undefined' && !Object.getOwnPropertyDescriptor(window, '__swarmPreviews')) {
  Object.defineProperty(window, '__swarmPreviews', {
    configurable: true,
    get: () => {
      const s = useStore.getState();
      return {
        main: s.repos.map((r) => ({ repoId: r.id, floor: r.floor, status: r.preview.status, url: r.preview.url, ref: r.preview.ref, port: r.preview.port, channel: onScreen.get(r.id) ?? null })),
        prs: Object.values(s.prPreviews).map((p) => ({
          repoId: p.repoId,
          pr: p.pr,
          status: p.status,
          url: p.url,
          port: p.port,
          commit: p.commit,
          watched: p.watched,
          idleSec: Math.round((Date.now() - p.viewedAt) / 1000),
          error: p.error,
        })),
      };
    },
  });
}
