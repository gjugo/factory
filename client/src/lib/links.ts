// Every URL in the dashboard, built in one place so pages never hand-write a path. A project is
// addressed by its GitHub owner/name; board cards open from the board's ?card= (issue-12, pr-34).

export const links = {
  overview: () => '/',
  projects: () => '/projects',
  /** The projects page with the add-a-project dialog open. */
  addProject: () => '/projects?add=1',
  board: (repoId: string, card?: BoardCard) => `/projects/${repoPath(repoId)}${card ? `?card=${cardParam(card)}` : ''}`,
  projectSettings: (repoId: string) => `/projects/${repoPath(repoId)}/settings`,
  /** The project's app viewer: main, a PR's app (`pr`), or a PR beside main (`compare`). */
  app: (repoId: string, view: { pr?: number | null; compare?: boolean } = {}) =>
    `/projects/${repoPath(repoId)}/app${view.pr != null ? `?${view.compare ? 'compare' : 'pr'}=${view.pr}` : ''}`,
  agents: () => '/agents',
  /** The terminal grid, watching these agents (none: let the page pick). */
  agentsGrid: (ids: readonly string[] = []) => `/agents?view=grid${ids.length ? `&ids=${ids.map(encodeURIComponent).join(',')}` : ''}`,
  /** An agent's page, on one of its tabs (the terminal when none). */
  agent: (id: string, tab?: AgentTab) => `/agents/${encodeURIComponent(id)}${tab && tab !== 'terminal' ? `?tab=${tab}` : ''}`,
  ceo: () => '/ceo',
  settings: () => '/settings',
  timelapse: () => '/timelapse',
  setup: () => '/setup',
};

export const AGENT_TABS = ['terminal', 'settings', 'prompt', 'screen', 'record'] as const;
export type AgentTab = (typeof AGENT_TABS)[number];

/** An agent page's ?tab= value; the terminal for anything else. */
export const parseAgentTab = (value: string | null): AgentTab => (AGENT_TABS.includes(value as AgentTab) ? (value as AgentTab) : 'terminal');

/** A card on a project's board: an issue or a pull request, by number. */
export type BoardCard = { kind: 'issue' | 'pr'; number: number };

/** `owner/name` as two path segments, each encoded. */
export function repoPath(repoId: string): string {
  const [owner, name = ''] = repoId.split('/');
  return `${encodeURIComponent(owner)}/${encodeURIComponent(name)}`;
}

/** The repo id (`owner/name`) from a project route's params; null when either is missing. */
export function repoIdFrom(params: { owner?: string; name?: string }): string | null {
  return params.owner && params.name ? `${params.owner}/${params.name}` : null;
}

export const cardParam = (card: BoardCard) => `${card.kind}-${card.number}`;

/** A board's ?card= value back to a card; null for anything else. */
export function parseCard(value: string | null): BoardCard | null {
  const m = /^(issue|pr)-(\d+)$/.exec(value ?? '');
  return m ? { kind: m[1] as BoardCard['kind'], number: Number(m[2]) } : null;
}
