import { CEO_ID } from '../../../shared/types';
import { links, repoPath } from './links';

// The top bar's breadcrumb for a path: where the page sits, each step a link but the last.

export interface Crumb {
  label: string;
  to?: string;
}

export interface CrumbNames {
  /** A project's display name by repo id. */
  project(repoId: string): string | undefined;
  /** An agent's name by id. */
  agent(id: string): string | undefined;
}

export function crumbsFor(pathname: string, names: CrumbNames): Crumb[] {
  const parts = pathname.split('/').filter(Boolean).map(decodeURIComponent);
  const last = (list: Crumb[]) => list.map((c, i) => (i === list.length - 1 ? { label: c.label } : c));
  switch (parts[0]) {
    case undefined:
      return [{ label: 'Overview' }];
    case 'projects': {
      if (parts.length < 3) return [{ label: 'Projects' }];
      const repoId = `${parts[1]}/${parts[2]}`;
      const project = { label: names.project(repoId) ?? parts[2], to: `/projects/${repoPath(repoId)}` };
      return last([{ label: 'Projects', to: links.projects() }, project, ...(parts[3] === 'settings' ? [{ label: 'Settings' }] : parts[3] === 'app' ? [{ label: 'App' }] : [])]);
    }
    case 'agents':
      if (!parts[1]) return [{ label: 'Agents' }];
      return last([{ label: 'Agents', to: links.agents() }, { label: names.agent(parts[1]) ?? (parts[1] === CEO_ID ? 'CEO' : parts[1]) }]);
    case 'ceo':
      return [{ label: 'CEO' }];
    case 'settings':
      return [{ label: 'Settings' }];
    case 'setup':
      return [{ label: 'Setup' }];
    default:
      return [{ label: 'Not found' }];
  }
}
