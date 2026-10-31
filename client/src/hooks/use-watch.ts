import { useEffect } from 'react';
import { useStore } from '../store';
import { routeProject } from '../watch';

// The hooks pages use to say what they show of the agents' terminals (watch.ts): the office then sends those lines.

/** Every terminal line of these agents while the calling component is mounted (a terminal, a chat, a log panel). */
export function useWatchAgents(ids: readonly string[]) {
  const key = [...new Set(ids)].sort().join('\n');
  useEffect(() => {
    if (!key) return;
    const list = key.split('\n');
    useStore.getState().watchAgents(list, 1);
    return () => useStore.getState().watchAgents(list, -1);
  }, [key]);
}

/** Everyone's latest line while a workers list is mounted. */
export function useWorkersWatch() {
  useEffect(() => {
    useStore.getState().watchWorkers(1);
    return () => useStore.getState().watchWorkers(-1);
  }, []);
}

/** The route's project (null: none) as the watched project number. Mounted once, by the shell. */
export function useRouteWatch(repoId: string | null) {
  const project = useStore((s) => routeProject(s.repos, repoId));
  useEffect(() => useStore.getState().setProject(project), [project]);
}
