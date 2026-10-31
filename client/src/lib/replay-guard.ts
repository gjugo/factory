import { toast } from 'sonner';

// While the time-lapse plays nothing may reach the office: api.ts refuses every command but the viewer's own look
// (theme, sidebar), and the replay bar stops clicks and typing on the controls that would act (DOM rules below).

export const REPLAY_HINT = 'Replaying — go live to act';

/** Whether a REST call may go out while replaying: reads, and a settings change that only touches the dashboard's look. */
export function allowedWhileReplaying(method: string, url: string, body?: unknown): boolean {
  if (method === 'GET') return true;
  if (method !== 'PATCH' || url !== '/api/settings' || !body || typeof body !== 'object') return false;
  const keys = Object.keys(body);
  return keys.length === 1 && keys[0] === 'ui';
}

/** The hint, once however often it's asked for. */
export function showReplayHint() {
  toast.info(REPLAY_HINT, { id: 'replay-hint', description: 'Press Esc or “Back to live” to return to the live office.' });
}

/** Where everything stays usable: the replay bar, the sidebar, menus and toasts, and what's marked data-replay-ok. */
export const REPLAY_FREE = '[data-replay-ok], [data-sidebar], [data-sonner-toaster], [cmdk-root]';

/** Controls that act the moment they're used: submit buttons, switches and checkboxes. */
export const REPLAY_ACTIONS = 'button[type="submit"], input[type="submit"], [role="switch"], [role="checkbox"], input[type="checkbox"]';

/** Where typing would become an action: text areas, form fields and the agents' terminals. */
export const REPLAY_TYPING = 'textarea, form input, form select, .xterm';

export interface GuardTarget {
  closest(selector: string): unknown;
}

/** What a click, a key or a paste on `el` is while replaying: an action to stop, or anything else (let through). */
export function replayBlocks(el: GuardTarget | null, kind: 'click' | 'type'): boolean {
  if (!el || el.closest(REPLAY_FREE)) return false;
  return !!el.closest(kind === 'click' ? REPLAY_ACTIONS : REPLAY_TYPING);
}
