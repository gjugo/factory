import type { Watch } from '../../shared/watch';

// What this tab shows of the agents' terminals (shared/watch.ts), from the store: the floor of the project the route
// is on (-1: no project), the agents whose terminal or chat a page has open (useWatchAgents, counted per id so two
// panels on one agent don't drop it when one closes) and whether a workers list is out (useWorkersWatch). net.ts sends
// it on change.

export interface WatchInputs {
  floor: number;
  watched: Record<string, number>;
  workers: number;
}

export function currentWatch(s: WatchInputs): Watch {
  const agents = Object.keys(s.watched)
    .filter((id) => s.watched[id] > 0)
    .sort();
  return { floor: s.floor, agents, workers: s.workers > 0 };
}

/** The floor a route's project is on: `owner/name` among the repos, -1 when the route has none or it isn't connected. */
export function routeFloor(repos: readonly { id: string; floor: number }[], repoId: string | null): number {
  if (!repoId) return -1;
  return repos.find((r) => r.id === repoId)?.floor ?? -1;
}

/** `watched` with each id counted up (+1) or down (-1); ids that reach 0 are dropped. */
export function countWatch(watched: Record<string, number>, ids: readonly string[], by: 1 | -1): Record<string, number> {
  const next = { ...watched };
  for (const id of new Set(ids)) {
    const n = (next[id] ?? 0) + by;
    if (n > 0) next[id] = n;
    else delete next[id];
  }
  return next;
}
