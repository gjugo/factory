import { useMatch } from 'react-router';
import { repoIdFrom } from '@/lib/links';
import { useStore } from '@/store';

/** The project the route is on (`/projects/:owner/:name…`): its id, and its view once the office knows it. */
export function useRouteRepo() {
  const match = useMatch('/projects/:owner/:name/*');
  const repoId = match ? repoIdFrom(match.params) : null;
  const repo = useStore((s) => (repoId ? (s.repos.find((r) => r.id === repoId) ?? null) : null));
  return { repoId, repo };
}
