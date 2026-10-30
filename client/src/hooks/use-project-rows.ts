import { useMemo } from 'react';
import type { RepoView } from '../../../shared/types';
import type { Tone } from '@/lib/status';
import { agentsOnRepo, needsYouCount, projectHealth, useStore, type ProjectHealth } from '@/store';

// The projects as the sidebar, the switcher and the command menu list them: name, status dot and needs-you count.

export interface ProjectRow {
  repo: RepoView;
  name: string;
  health: ProjectHealth;
  needsYou: number;
  working: number;
}

export const HEALTH_LOOK: Record<ProjectHealth, { tone: Tone; label: string }> = {
  attention: { tone: 'danger', label: 'Needs attention' },
  busy: { tone: 'info', label: 'Agents working' },
  idle: { tone: 'success', label: 'Idle' },
  setup: { tone: 'warning', label: 'Setting up' },
};

export const projectName = (repo: Pick<RepoView, 'fullName' | 'id'>) => (repo.fullName || repo.id).split('/').pop() ?? repo.id;

export function useProjectRows(): ProjectRow[] {
  const repos = useStore((s) => s.repos);
  const agents = useStore((s) => s.agents);
  const qa = useStore((s) => s.qa);
  const ops = useStore((s) => s.ops);
  return useMemo(
    () =>
      repos.map((repo) => {
        const team = agentsOnRepo(agents, repo.id);
        const needsYou = needsYouCount(repo, qa, ops);
        return { repo, name: projectName(repo), health: projectHealth(repo, team, needsYou), needsYou, working: team.filter((a) => a.status === 'working' || a.status === 'preparing').length };
      }),
    [repos, agents, qa, ops],
  );
}
