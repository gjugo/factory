import { ACTIVITY_LABELS } from '../../../shared/activity';
import { CLAUDE_MODELS, effectiveModel } from '../../../shared/models';
import type { AgentCli, AgentStatus, CliView, CloudMachineState, EffortLevel, RepoView, SwarmSettings } from '../../../shared/types';
import type { Agent, KanbanColumns } from '../store';
import { links } from './links';
import type { Tone } from './status';

// How the agents pages put an agent into words (their coding agent, task, activity, machine), which of them a filter
// keeps, and which ones the terminal grid watches. Pure, so the wording and the picking are tested.

type Runtime = Pick<SwarmSettings, 'runtime' | 'defaultCli'>;

/** The coding agents' names until the office has listed them (CliView.label). */
const CLI_NAMES: Record<AgentCli, string> = { claude: 'Claude Code', codex: 'Codex', opencode: 'OpenCode' };

/** The coding agent someone runs: their own pick in real terminals; the Agent SDK is Claude Code for everyone. */
export const workerCli = (a: Pick<Agent, 'cli' | 'role'>, settings: Runtime): AgentCli =>
  a.role === 'ceo' || settings.runtime !== 'terminal' ? 'claude' : a.cli || settings.defaultCli;

export const cliName = (clis: readonly CliView[], id: AgentCli) => clis.find((c) => c.id === id)?.label ?? CLI_NAMES[id];

/** The coding agent's name as the list shows it. */
export const cliLabel = (a: Pick<Agent, 'cli' | 'role'>, settings: Runtime, clis: readonly CliView[]) => cliName(clis, workerCli(a, settings));

/** The model they run, as configured ('' falls back to the office's default for their coding agent). */
export function modelLabel(a: Pick<Agent, 'cli' | 'role' | 'model'>, settings: Runtime & Pick<SwarmSettings, 'defaultModel'>): string {
  if (a.role === 'ceo') return a.model || CLAUDE_MODELS[0];
  return effectiveModel(a.model, workerCli(a, settings), settings, CLAUDE_MODELS[0]) || 'default model';
}

/** The new name a rename field asks for, or null when it changes nothing (the office ignores a blank name, and keeps 24 characters). */
export function renameTo(input: string, current: string): string | null {
  const name = input.trim().slice(0, 24);
  return name && name !== current ? name : null;
}

export const EFFORTS: EffortLevel[] = ['low', 'medium', 'high', 'xhigh', 'max'];

export const effortLabel = (a: Pick<Agent, 'effort'>, settings: Pick<SwarmSettings, 'defaultEffort'>) => a.effort || settings.defaultEffort;

/**
 * A cloud agent waiting for the manager to sign their coding agent in, in their terminal: its name ("Claude Code"),
 * else null.
 */
export function signInFor(a: Pick<Agent, 'cli' | 'role' | 'host' | 'needsSignIn'>, settings: Pick<SwarmSettings, 'defaultCli'>): string | null {
  return a.role !== 'ceo' && a.host === 'box' && a.needsSignIn ? CLI_NAMES[a.cli || settings.defaultCli] : null;
}

/** A cloud agent's Box, as their machine badge shows it. */
export const CLOUD_STATE: Record<CloudMachineState, { label: string; tone: Tone }> = {
  none: { label: 'No Box yet', tone: 'neutral' },
  creating: { label: 'Creating', tone: 'info' },
  'setting-up': { label: 'Setting up', tone: 'info' },
  ready: { label: 'Ready', tone: 'success' },
  paused: { label: 'Paused', tone: 'neutral' },
  disconnected: { label: 'Disconnected', tone: 'warning' },
  error: { label: 'Error', tone: 'danger' },
};

/**
 * Whether their Settings can move them between this computer and the cloud: never while they have a task (the
 * server refuses), and to the cloud only once an Upstash key is saved. The reason when it can't, else null.
 */
export function moveBlocked(a: Pick<Agent, 'role' | 'task' | 'status' | 'host'>, keySet: boolean): string | null {
  if (a.role === 'ceo') return 'The CEO always works on this computer.';
  if (a.task || isBusyStatus(a.status)) return 'They’re on a task: move them once it’s done.';
  if (a.host !== 'box' && !keySet) return 'Save an Upstash Box API key in Settings → Cloud agents first.';
  return null;
}

export type TaskKind = 'build' | 'qa' | 'fix';

export interface TaskInfo {
  kind: TaskKind;
  /** "Build", "QA", "Fix". */
  label: string;
  /** "#12 Add login" or "PR #34 Add login". */
  text: string;
  /** The card on the project's board this task is about. */
  href: string;
  /** Their pull request on GitHub, when there is one. */
  prUrl: string | null;
}

export const TASK_LABEL: Record<TaskKind, string> = { build: 'Build', qa: 'QA', fix: 'Fix' };

/** What someone is working on, with links; null when they're free (or the CEO). */
export function taskInfo(a: Pick<Agent, 'role' | 'repoId' | 'status' | 'task' | 'issueNumber' | 'issueTitle' | 'prNumber' | 'prUrl'>): TaskInfo | null {
  if (a.role === 'ceo' || a.status === 'idle' || !a.task) return null;
  const title = a.issueTitle ? ` ${a.issueTitle}` : '';
  if ((a.task === 'qa' || a.task === 'fix') && a.prNumber != null) {
    const kind: TaskKind = a.task;
    return { kind, label: TASK_LABEL[kind], text: `PR #${a.prNumber}${title}`, href: links.board(a.repoId, { kind: 'pr', number: a.prNumber }), prUrl: a.prUrl };
  }
  if (a.task === 'issue' && a.issueNumber != null) {
    return { kind: 'build', label: TASK_LABEL.build, text: `#${a.issueNumber}${title}`, href: links.board(a.repoId, { kind: 'issue', number: a.issueNumber }), prUrl: a.prUrl };
  }
  return null;
}

/** What they're doing right now: "editing · store.ts"; "Setting up" while preparing; '' for nothing. */
export function activityLabel(a: Pick<Agent, 'status' | 'activity' | 'currentTool'>): string {
  if (a.activity) return a.activity.detail ? `${ACTIVITY_LABELS[a.activity.kind]} · ${a.activity.detail}` : ACTIVITY_LABELS[a.activity.kind];
  if (a.status === 'preparing') return a.currentTool ? `Setting up · ${a.currentTool}` : 'Setting up';
  return '';
}

export const isBusyStatus = (s: AgentStatus) => s === 'preparing' || s === 'working';

/** Sessions running now (the CEO's included), against the session limit when there is one: "3/8 sessions". */
export function sessionsLabel(agents: Record<string, Pick<Agent, 'status'>>, limit: number): string {
  const running = Object.values(agents).filter((a) => isBusyStatus(a.status)).length;
  return `${limit ? `${running}/${limit}` : running} session${!limit && running === 1 ? '' : 's'}`;
}

/** How long their session has run ("4m 05s", "1h 12m"), up to now while busy; '' before one started or when free. */
export function elapsedLabel(a: Pick<Agent, 'status' | 'startedAt' | 'endedAt'>, now: number): string {
  if (!a.startedAt || a.status === 'idle') return '';
  const end = isBusyStatus(a.status) ? now : (a.endedAt ?? now);
  const s = Math.max(0, Math.floor((end - a.startedAt) / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h) return `${h}h ${String(m).padStart(2, '0')}m`;
  if (m) return `${m}m ${String(s % 60).padStart(2, '0')}s`;
  return `${s}s`;
}

export const costLabel = (usd: number) => `$${usd.toFixed(2)}`;

/** Whether the message box can reach them: a running session, one to resume, or the CEO (always). */
export function canMessage(a: Pick<Agent, 'role' | 'status' | 'task' | 'branch'>): boolean {
  if (a.role === 'ceo') return true;
  return isBusyStatus(a.status) || (a.task !== 'qa' && !!a.branch && a.status !== 'idle');
}

// ---------- the list's filters ----------

/** Any status, the busy ones (setting up or working), or one status. */
export type StatusFilter = 'all' | 'busy' | AgentStatus;
export const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Any status' },
  { value: 'busy', label: 'Busy' },
  { value: 'idle', label: 'Idle' },
  { value: 'working', label: 'Working' },
  { value: 'preparing', label: 'Setting up' },
  { value: 'done', label: 'Done' },
  { value: 'error', label: 'Error' },
  { value: 'stopped', label: 'Stopped' },
];

export const parseStatusFilter = (v: string | null): StatusFilter => (STATUS_FILTERS.some((f) => f.value === v) ? (v as StatusFilter) : 'all');

export const statusMatches = (status: AgentStatus, f: StatusFilter) => f === 'all' || (f === 'busy' ? isBusyStatus(status) : status === f);

export interface AgentGroups {
  /** The CEO, pinned on top; null when filtered out (another project picked, or its status doesn't match). */
  ceo: Agent | null;
  /** Each project (by number) with its agents (by desk) that pass the filter. */
  projects: { repo: RepoView; agents: Agent[] }[];
}

/**
 * The list's sections. `project` is a repo id, 'ceo' or '' (all). A project with nobody passing the status filter is
 * left out, unless no status is picked: then it still shows, so it can get its first agent.
 */
export function groupAgents(agents: Record<string, Agent>, repos: readonly RepoView[], project: string, status: StatusFilter): AgentGroups {
  const all = Object.values(agents);
  const ceoAgent = all.find((a) => a.role === 'ceo') ?? null;
  const ceo = ceoAgent && (!project || project === 'ceo') && statusMatches(ceoAgent.status, status) ? ceoAgent : null;
  const projects = [...repos]
    .sort((a, b) => a.number - b.number)
    .filter((r) => !project || project === r.id)
    .map((repo) => ({
      repo,
      agents: all.filter((a) => a.role !== 'ceo' && a.repoId === repo.id && statusMatches(a.status, status)).sort((a, b) => a.desk - b.desk),
    }))
    .filter((g) => g.agents.length > 0 || status === 'all');
  return { ceo, projects };
}

// ---------- the terminal grid ----------

export const GRID_MAX = 4;

/** The grid's ?ids= (comma-separated) back to agent ids: each once, at most GRID_MAX. */
export function parseGridIds(value: string | null): string[] {
  const ids = (value ?? '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
  return [...new Set(ids)].slice(0, GRID_MAX);
}

/** Picks an agent for the grid, or drops one already in it; a fifth pick is refused (the same list back). */
export function toggleGridPick(ids: readonly string[], id: string): string[] {
  if (ids.includes(id)) return ids.filter((x) => x !== id);
  return ids.length >= GRID_MAX ? [...ids] : [...ids, id];
}

/** The ids still on the team, in order: someone let go leaves the grid. */
export const presentIds = (ids: readonly string[], agents: Record<string, Agent>) => ids.filter((id) => !!agents[id]);

/** What the grid shows when nobody is picked: the busiest workers (busy first, then by name), up to GRID_MAX. */
export function defaultGridPicks(agents: Record<string, Agent>): string[] {
  return Object.values(agents)
    .filter((a) => a.role !== 'ceo')
    .sort((a, b) => Number(isBusyStatus(b.status)) - Number(isBusyStatus(a.status)) || a.name.localeCompare(b.name))
    .slice(0, GRID_MAX)
    .map((a) => a.id);
}

/** The grid's rows of panel indexes: one row of up to two, then a second row (2×2 for four). */
export function gridRows(n: number): number[][] {
  const count = Math.max(0, Math.min(GRID_MAX, n));
  const all = Array.from({ length: count }, (_, i) => i);
  return count <= 2 ? (count ? [all] : []) : [all.slice(0, 2), all.slice(2)];
}

// ---------- assigning work ----------

export interface AssignChoice {
  key: string;
  kind: 'issue' | 'qa';
  number: number;
  title: string;
}

/** What a free agent can take: an issue from the backlog, or a pull request waiting for QA. */
export function assignChoices(cols: KanbanColumns | null): AssignChoice[] {
  if (!cols) return [];
  const testable = cols.qa.filter((c) => !c.qa || c.qa.status === 'needs-human' || c.qa.status === 'queued');
  return [
    ...cols.backlog.map((c) => ({ key: c.key, kind: 'issue' as const, number: c.number, title: c.title })),
    ...testable.map((c) => ({ key: c.key, kind: 'qa' as const, number: c.number, title: c.title })),
  ];
}
