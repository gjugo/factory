import { describe, expect, it } from 'vitest';
import type { RepoView } from '../../../shared/types';
import type { Agent, KanbanColumns } from '../store';
import {
  activityLabel,
  assignChoices,
  canMessage,
  cliLabel,
  defaultGridPicks,
  elapsedLabel,
  gridRows,
  groupAgents,
  CLOUD_STATE,
  moveBlocked,
  modelLabel,
  parseGridIds,
  parseStatusFilter,
  presentIds,
  signInFor,
  taskInfo,
  toggleGridPick,
} from './agents';

const agent = (over: Partial<Agent>): Agent =>
  ({
    id: 'a',
    name: 'Ada',
    repoId: 'acme/web',
    role: 'agent',
    task: null,
    desk: 0,
    model: '',
    effort: '',
    cli: '',
    terminal: true,
    status: 'idle',
    issueNumber: null,
    issueTitle: null,
    branch: null,
    prNumber: null,
    prUrl: null,
    currentTool: null,
    startedAt: null,
    endedAt: null,
    costUsd: 0,
    turns: 0,
    career: null,
    ...over,
  }) as Agent;

const repo = (id: string, floor: number) => ({ id, floor, fullName: id }) as RepoView;
const settings = { runtime: 'terminal' as const, defaultCli: 'claude' as const, defaultModel: 'claude-opus-5-5', defaultEffort: 'medium' as const };

describe('task labels', () => {
  it('links a build to its issue card, QA and fixes to their PR card', () => {
    expect(taskInfo(agent({ status: 'working', task: 'issue', issueNumber: 12, issueTitle: 'Add login' }))).toEqual({
      kind: 'build',
      label: 'Build',
      text: '#12 Add login',
      href: '/projects/acme/web?card=issue-12',
      prUrl: null,
    });
    const qa = taskInfo(agent({ status: 'working', task: 'qa', prNumber: 34, prUrl: 'https://github.com/acme/web/pull/34', issueTitle: 'Add login' }));
    expect(qa).toMatchObject({ kind: 'qa', label: 'QA', text: 'PR #34 Add login', href: '/projects/acme/web?card=pr-34' });
    expect(taskInfo(agent({ status: 'error', task: 'fix', prNumber: 34 }))).toMatchObject({ label: 'Fix', text: 'PR #34' });
  });

  it('has nothing for the free and for the CEO', () => {
    expect(taskInfo(agent({ status: 'idle', task: 'issue', issueNumber: 1 }))).toBeNull();
    expect(taskInfo(agent({ role: 'ceo', status: 'working', task: 'issue', issueNumber: 1 }))).toBeNull();
  });

  it('puts the activity, the elapsed time and the machine in words', () => {
    expect(activityLabel(agent({ status: 'working', activity: { kind: 'edit', detail: 'store.ts' } }))).toBe('editing · store.ts');
    expect(activityLabel(agent({ status: 'working', activity: { kind: 'talk', detail: '' } }))).toBe('talking to you');
    expect(activityLabel(agent({ status: 'preparing' }))).toBe('Setting up');
    expect(activityLabel(agent({ status: 'idle' }))).toBe('');
    const t = 1_700_000_000_000;
    expect(elapsedLabel(agent({ status: 'working', startedAt: t }), t + 65_000)).toBe('1m 05s');
    expect(elapsedLabel(agent({ status: 'done', startedAt: t, endedAt: t + 9_000 }), t + 99_999_999)).toBe('9s');
    expect(elapsedLabel(agent({ status: 'working', startedAt: t }), t + 3_725_000)).toBe('1h 02m');
    expect(elapsedLabel(agent({}), 1)).toBe('');
    expect(elapsedLabel(agent({ status: 'idle', startedAt: t, endedAt: t + 9_000 }), t + 10_000)).toBe('');
    expect(CLOUD_STATE.ready).toEqual({ label: 'Ready', tone: 'success' });
    expect(CLOUD_STATE['setting-up'].label).toBe('Setting up');
    expect(CLOUD_STATE.error.tone).toBe('danger');
  });

  it('moves an agent between this computer and the cloud only while they have no task', () => {
    expect(moveBlocked(agent({}), true)).toBeNull();
    expect(moveBlocked(agent({ host: 'box' }), false)).toBeNull(); // back home needs no key
    expect(moveBlocked(agent({}), false)).toMatch(/Upstash Box API key/);
    expect(moveBlocked(agent({ task: 'issue', status: 'done' }), true)).toMatch(/on a task/);
    expect(moveBlocked(agent({ status: 'working' }), true)).toMatch(/on a task/);
    expect(moveBlocked(agent({ role: 'ceo' }), true)).toMatch(/CEO/);
  });

  it('names the coding agent, model and sign-in', () => {
    expect(cliLabel(agent({ cli: 'codex' }), settings, [])).toBe('Codex');
    expect(cliLabel(agent({ cli: 'codex' }), { ...settings, runtime: 'sdk' }, [])).toBe('Claude Code');
    expect(modelLabel(agent({}), settings)).toBe('claude-opus-5-5');
    expect(modelLabel(agent({ role: 'ceo', model: 'claude-sonnet-5' }), settings)).toBe('claude-sonnet-5');
    expect(signInFor(agent({ host: 'box', needsSignIn: true }), settings)).toBe('Claude Code');
    expect(signInFor(agent({ host: 'local', needsSignIn: true }), settings)).toBeNull();
  });

  it('lets the manager message a running or resumable session, and the CEO always', () => {
    expect(canMessage(agent({ status: 'working', task: 'qa' }))).toBe(true);
    expect(canMessage(agent({ status: 'done', task: 'issue', branch: 'b' }))).toBe(true);
    expect(canMessage(agent({ status: 'done', task: 'qa', branch: 'b' }))).toBe(false);
    expect(canMessage(agent({ status: 'idle' }))).toBe(false);
    expect(canMessage(agent({ role: 'ceo' }))).toBe(true);
  });
});

describe('groupAgents', () => {
  const agents = {
    ceo: agent({ id: 'ceo', role: 'ceo', name: 'Morgan', repoId: '' }),
    b: agent({ id: 'b', desk: 1, status: 'working' }),
    a: agent({ id: 'a', desk: 0 }),
    c: agent({ id: 'c', repoId: 'acme/api', status: 'error' }),
  };
  const repos = [repo('acme/api', 2), repo('acme/web', 1), repo('acme/empty', 3)];

  it('pins the CEO and sorts projects by floor and agents by desk', () => {
    const g = groupAgents(agents, repos, '', 'all');
    expect(g.ceo?.id).toBe('ceo');
    expect(g.projects.map((p) => [p.repo.id, p.agents.map((a) => a.id)])).toEqual([
      ['acme/web', ['a', 'b']],
      ['acme/api', ['c']],
      ['acme/empty', []],
    ]);
  });

  it('filters by project and status', () => {
    const busy = groupAgents(agents, repos, '', 'busy');
    expect(busy.ceo).toBeNull();
    expect(busy.projects.map((p) => p.repo.id)).toEqual(['acme/web']);
    expect(busy.projects[0].agents.map((a) => a.id)).toEqual(['b']);
    const api = groupAgents(agents, repos, 'acme/api', 'all');
    expect(api.ceo).toBeNull();
    expect(api.projects.map((p) => p.repo.id)).toEqual(['acme/api']);
    expect(groupAgents(agents, repos, 'ceo', 'all')).toEqual({ ceo: agents.ceo, projects: [] });
    expect(parseStatusFilter('error')).toBe('error');
    expect(parseStatusFilter('bogus')).toBe('all');
  });
});

describe('the terminal grid', () => {
  it('reads ids from the URL: each once, at most four', () => {
    expect(parseGridIds(null)).toEqual([]);
    expect(parseGridIds('a, b,,a,c,d,e')).toEqual(['a', 'b', 'c', 'd']);
  });

  it('toggles a pick and refuses a fifth', () => {
    expect(toggleGridPick(['a'], 'b')).toEqual(['a', 'b']);
    expect(toggleGridPick(['a', 'b'], 'a')).toEqual(['b']);
    expect(toggleGridPick(['a', 'b', 'c', 'd'], 'e')).toEqual(['a', 'b', 'c', 'd']);
  });

  it('watches only agents still on the team, and picks the busiest by default', () => {
    const agents = {
      ceo: agent({ id: 'ceo', role: 'ceo', status: 'working' }),
      x: agent({ id: 'x', name: 'Xia' }),
      y: agent({ id: 'y', name: 'Yan', status: 'working' }),
      z: agent({ id: 'z', name: 'Zed', status: 'preparing' }),
      w: agent({ id: 'w', name: 'Wu' }),
      v: agent({ id: 'v', name: 'Val' }),
    };
    expect(presentIds(['x', 'gone', 'y'], agents)).toEqual(['x', 'y']);
    expect(defaultGridPicks(agents)).toEqual(['y', 'z', 'v', 'w']);
  });

  it('lays panels out one row of two, then two by two', () => {
    expect(gridRows(0)).toEqual([]);
    expect(gridRows(1)).toEqual([[0]]);
    expect(gridRows(2)).toEqual([[0, 1]]);
    expect(gridRows(3)).toEqual([[0, 1], [2]]);
    expect(gridRows(4)).toEqual([
      [0, 1],
      [2, 3],
    ]);
  });
});

describe('assignChoices', () => {
  it('offers the backlog and PRs waiting for a tester', () => {
    const cols = {
      backlog: [{ key: 'i-1', number: 1, title: 'One' }],
      progress: [],
      qa: [
        { key: 'pr-2', number: 2, title: 'Two' },
        { key: 'pr-3', number: 3, title: 'Three', qa: { status: 'testing' } },
        { key: 'pr-4', number: 4, title: 'Four', qa: { status: 'queued' } },
      ],
      ready: [],
      merged: [],
    } as unknown as KanbanColumns;
    expect(assignChoices(cols).map((c) => `${c.kind}${c.number}`)).toEqual(['issue1', 'qa2', 'qa4']);
    expect(assignChoices(null)).toEqual([]);
  });
});
