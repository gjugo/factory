import type { PreviewStatus, PreviewView, PrPreviewView, PullInfo, QaView } from '../../../shared/types';
import { QA_STATUS } from './status';

// The app viewer's channels (cubefarm's PR theatre), as pure helpers: a project's own preview ("main") or one of its
// open PRs, each PR running in a preview of its own. Ported from cubefarm's client/src/ui/channels.ts, minus the 3D
// big screen's chip strip.

/** What the viewer shows: the project's main preview (null) or an open PR's. */
export type Channel = number | null;

/** A PR's QA state in a few words, '' when QA hasn't seen it. */
export const qaBadge = (qa?: Pick<QaView, 'status'> | null) => (qa ? (QA_STATUS[qa.status]?.label ?? qa.status) : '');

/** Shorten to max characters with an ellipsis. */
const clip = (s: string, max: number) => (s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s);

/** "PR #212 · Outside 5 · QA passed" */
export function channelLabel(pull: Pick<PullInfo, 'number' | 'title'>, qa?: Pick<QaView, 'status'> | null, max = 32): string {
  return [`PR #${pull.number}`, clip(pull.title.trim(), max), qaBadge(qa)].filter(Boolean).join(' · ');
}

/** A project's open PRs, in channel order (oldest first, like channel numbers). */
export const channelPulls = (pulls: PullInfo[]) => pulls.filter((p) => p.state === 'OPEN').sort((a, b) => a.number - b.number);

/** The channel on screen: the picked PR while it's still open, otherwise main. */
export function currentChannel(picked: Channel | undefined, pulls: Pick<PullInfo, 'number' | 'state'>[]): Channel {
  return picked != null && pulls.some((p) => p.number === picked && p.state === 'OPEN') ? picked : null;
}

/** A PR preview in the main preview's shape, for the stage. None yet reads as stopped. */
export function prAsPreview(p: PrPreviewView | undefined, pr: number): PreviewView {
  return {
    status: p?.status ?? 'stopped',
    port: p?.port ?? 0,
    url: p?.url ?? null,
    ref: `PR #${pr}`,
    pr,
    commit: p?.commit ?? null,
    startedAt: p?.startedAt ?? null,
    error: p?.error ?? null,
    logTail: p?.logTail ?? [],
  };
}

export type Led = 'live' | 'busy' | 'bad' | 'off';

/** A channel's status light: live, getting ready, failed, or off. */
export function channelLed(status: PreviewStatus | undefined): Led {
  if (status === 'running') return 'live';
  if (status === 'preparing' || status === 'installing' || status === 'starting') return 'busy';
  return status === 'error' ? 'bad' : 'off';
}

export const LED_LABEL: Record<Led, string> = { live: 'Running', busy: 'Starting', bad: 'Error', off: 'Off' };

/** Where a QA screenshot is served (v: the QA record's update time, so a new round's shots aren't cached). */
export const qaShotUrl = (repoId: string, pr: number, index: number, v: number) => `/api/repos/${encodeURIComponent(repoId)}/pulls/${pr}/qa-shots/${index}?v=${v}`;

/** A path typed in compare mode, as both frames load it: always starting with "/". */
export function comparePath(input: string): string {
  const t = input.trim().replace(/^https?:\/\/[^/]+/i, '');
  return t.startsWith('/') ? t : `/${t}`;
}

/** Load `path` from a preview's address (its url ends with "/"). */
export const atPath = (url: string, path: string) => `${url.replace(/\/+$/, '')}${comparePath(path)}`;

/** The office is open on its own computer, where a preview's http://localhost:<port>/ is the app. */
export const onOfficeComputer = (at: Pick<Location, 'hostname'>) => /^(localhost|127\.0\.0\.1|\[::1\])$/i.test(at.hostname);

/**
 * A preview's address as this browser can open it: as it is on the office's computer; from anywhere else (a tablet
 * over Tailscale) through the office's own address at /preview/<port>/ (server/previewGateway.ts).
 */
export function reachable(url: string, at: Pick<Location, 'hostname' | 'origin'>): string {
  if (onOfficeComputer(at)) return url;
  const m = url.match(/^https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\]):(\d+)(\/.*)?$/i);
  return m ? `${at.origin}/preview/${m[1]}${m[2] || '/'}` : url;
}

// ---------- the stage ----------

export type StepState = 'done' | 'now' | 'todo';

const STEPS: { status: PreviewStatus; label: string }[] = [
  { status: 'preparing', label: 'Check out the code' },
  { status: 'installing', label: 'Install dependencies' },
  { status: 'starting', label: 'Start the app' },
];

/** A starting preview's steps (check out → install → start), each done, under way or still to come. */
export function previewSteps(status: PreviewStatus): { label: string; state: StepState }[] {
  const at = status === 'running' ? STEPS.length : STEPS.findIndex((s) => s.status === status);
  return STEPS.map((s, i) => ({ label: s.label, state: at < 0 ? 'todo' : i < at ? 'done' : i === at ? 'now' : 'todo' }));
}

/** What the viewer's URL asks for: ?pr=N shows PR N, ?compare=N shows it beside main. */
export function viewFromParams(params: URLSearchParams): { pr: number | null; compare: boolean } {
  const num = (v: string | null) => (v && /^\d+$/.test(v) && Number(v) > 0 ? Number(v) : null);
  const compare = num(params.get('compare'));
  if (compare != null) return { pr: compare, compare: true };
  return { pr: num(params.get('pr')), compare: false };
}

// ---------- compare mode's path sync ----------

export type Side = 'main' | 'pr';

/** What compare mode remembers to sync paths: where each side last said it was, and where it was last sent. */
export interface PathSync {
  at: Record<Side, string | null>;
  asked: Record<Side, string | null>;
  relays: number[]; // when paths were passed on lately
}

export const newPathSync = (): PathSync => ({ at: { main: null, pr: null }, asked: { main: null, pr: null }, relays: [] });

/**
 * A side reports its path: whether to send the other side there (and note it). Not when it's the echo of where we
 * sent this side, not when the other side is already there, and at most 4 times in 3 s, so two apps that redirect
 * each other around can't bounce forever.
 */
export function relayPath(s: PathSync, from: Side, path: string, now: number): boolean {
  const to: Side = from === 'main' ? 'pr' : 'main';
  s.at[from] = path;
  if (s.asked[from] === path) {
    s.asked[from] = null;
    return false;
  }
  if (s.at[to] === path) return false;
  s.relays = s.relays.filter((t) => now - t < 3000);
  if (s.relays.length >= 4) return false;
  s.relays.push(now);
  s.asked[to] = path;
  return true;
}
