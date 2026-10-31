import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AgentView, IssueInfo, LogLine, OpsAlarm, PhoneMessage, PullInfo, QaStatus, QaView, RepoView, WorldSnapshot } from '../../shared/types';
import { CEO_ID } from '../../shared/types';

// Toasts go to sonner, which needs a page to show them: here they are only recorded.
vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }) }));

const { projectPrCounts, kanbanFor, needsYouCount, projectHealth, qaKey, totalNeedsYou, useStore } = await import('./store');
const { toast } = await import('sonner');
const { EMPTY_OPS } = await import('./ops');

const pr = (number: number, state: PullInfo['state'], headRefName = `feature/${number}`) => ({ number, state, headRefName }) as PullInfo;
const repo = (project: number, ...pulls: PullInfo[]) => ({ id: `acme/project${project}`, number: project, pulls }) as RepoView;
const snapshot = (repos: RepoView[], agents: Partial<AgentView>[] = []) =>
  ({ type: 'snapshot', data: { repos, agents, qa: [], requests: [], messages: [], phoneReadAt: 0, settings: {}, ceo: {}, usage: {}, clis: [] } as unknown as WorldSnapshot }) as const;
const alarmFor = (id: string, repoId = 'acme/project1'): OpsAlarm => ({ id, kind: 'pr', repoId, project: 1, prNumber: 7, agentId: null, text: 'PR #7 needs you', since: 1 });

beforeEach(() => {
  useStore.setState({ loaded: false, repos: [], agents: {}, ops: EMPTY_OPS, ceoOpen: false, chatViews: 0, watched: {}, workers: 0, project: -1 });
  vi.mocked(toast).mockClear();
  vi.mocked(toast.error).mockClear();
});

describe('apply: projects', () => {
  it('keeps the projects in project order and patches only what a batch carries', () => {
    const { apply } = useStore.getState();
    apply(snapshot([{ ...repo(2), fullName: 'acme/project2' }, { ...repo(1, pr(3, 'OPEN')), fullName: 'acme/project1' }]));
    expect(useStore.getState().repos.map((r) => r.id)).toEqual(['acme/project1', 'acme/project2']);
    apply({ type: 'repos', repos: [{ id: 'acme/project1', pulls: [pr(3, 'MERGED')] }, { id: 'acme/gone', pulls: [] }] });
    const s = useStore.getState();
    expect(s.repos.map((r) => [r.id, r.fullName])).toEqual([
      ['acme/project1', 'acme/project1'],
      ['acme/project2', 'acme/project2'],
    ]);
    expect(s.repos[0].pulls[0].state).toBe('MERGED');
  });

  it('adds a newly connected project from its full view and drops a removed one', () => {
    const { apply } = useStore.getState();
    apply(snapshot([{ ...repo(1), fullName: 'acme/project1' }]));
    apply({ type: 'repo', repo: { ...repo(2), fullName: 'acme/project2' } });
    expect(useStore.getState().repos.map((r) => r.number)).toEqual([1, 2]);
    apply({ type: 'repoRemoved', repoId: 'acme/project1' });
    expect(useStore.getState().repos.map((r) => r.id)).toEqual(['acme/project2']);
  });

  it('skips the 3D office life events an older office or recording still sends', () => {
    const { apply } = useStore.getState();
    apply(snapshot([{ ...repo(1), fullName: 'acme/project1' }]));
    const before = useStore.getState();
    for (const type of ['pong', 'progress', 'reward', 'weather', 'visitors', 'visitorPose', 'visitorEmote', 'visitorPing']) apply({ type, repoId: 'acme/project1' } as never);
    expect(useStore.getState()).toBe(before);
  });
});

describe('apply: toasts', () => {
  const msg = (id: number, from: PhoneMessage['from'], text: string) => ({ id, from, text, at: 1 }) as PhoneMessage;

  it("shows the server's toasts through sonner", () => {
    useStore.getState().apply({ type: 'toast', level: 'error', text: 'GitHub said no' });
    expect(toast.error).toHaveBeenCalledWith('GitHub said no', expect.anything());
    useStore.getState().apply({ type: 'toast', level: 'info', text: 'Synced' });
    expect(toast).toHaveBeenCalledWith('Synced');
  });

  it('toasts a live CEO message, but not one in the first snapshot or while the chat is open', () => {
    const { apply } = useStore.getState();
    apply({ ...snapshot([], [{ id: CEO_ID, name: 'Morgan', role: 'ceo', log: [] }]), data: { ...snapshot([]).data, agents: [{ id: CEO_ID, name: 'Morgan', role: 'ceo', log: [] } as unknown as AgentView], messages: [msg(0, 'ceo', 'old')] } });
    expect(toast).not.toHaveBeenCalled();
    apply({ type: 'message', message: msg(1, 'ceo', 'Ship it') });
    expect(toast).toHaveBeenCalledWith('Morgan: Ship it', expect.objectContaining({ action: expect.objectContaining({ label: 'Open chat' }) }));
    useStore.getState().setCeoOpen(true);
    apply({ type: 'message', message: msg(2, 'ceo', 'Reading this here') });
    apply({ type: 'message', message: msg(3, 'manager', 'Me') });
    useStore.getState().setCeoOpen(false);
    useStore.getState().watchChat(1); // the CEO page's thread is on screen
    apply({ type: 'message', message: msg(4, 'ceo', 'Seen on the page') });
    expect(toast).toHaveBeenCalledTimes(1);
    expect(useStore.getState().messages.map((m) => m.id)).toEqual([0, 1, 2, 3, 4]);
  });

  it("opens the chat from the toast's action", () => {
    useStore.setState({ loaded: true });
    useStore.getState().apply({ type: 'message', message: msg(5, 'ceo', 'Hi') });
    const opts = vi.mocked(toast).mock.calls[0][1] as unknown as { action: { onClick: () => void } };
    opts.action.onClick();
    expect(useStore.getState().ceoOpen).toBe(true);
  });

  it('never toasts a replayed CEO message, playing or seeking, but shows it in the thread', () => {
    useStore.setState({ loaded: true, messages: [] });
    useStore.getState().apply({ type: 'message', message: msg(6, 'ceo', 'Yesterday') }, 'play');
    useStore.getState().apply({ type: 'message', message: msg(7, 'ceo', 'Earlier') }, 'seek');
    expect(toast).not.toHaveBeenCalled();
    expect(useStore.getState().messages.map((m) => m.id)).toEqual([6, 7]);
  });
});

describe('the watch in the store', () => {
  it('counts agents in and out, and workers lists', () => {
    const s = useStore.getState();
    s.watchAgents(['ken'], 1);
    s.watchAgents(['ken', CEO_ID], 1);
    s.watchAgents(['ken'], -1);
    expect(useStore.getState().watched).toEqual({ ken: 1, [CEO_ID]: 1 });
    s.watchWorkers(1);
    s.watchWorkers(-1);
    s.watchWorkers(-1); // never below nobody
    expect(useStore.getState().workers).toBe(0);
  });
});

describe('projectPrCounts', () => {
  const project = (...pulls: PullInfo[]) => ({ ...repo(1, ...pulls), issues: [], autoMerge: false }) as RepoView;
  const draft = (number: number) => ({ ...pr(number, 'OPEN'), isDraft: true }) as PullInfo;
  const records = (...recs: [number, QaStatus][]) =>
    Object.fromEntries(recs.map(([n, status]) => [qaKey('acme/project1', n), { repoId: 'acme/project1', prNumber: n, status, round: 1 } as QaView]));

  it('counts an open passed PR as ready, but never a merged or closed one', () => {
    const r = project(pr(1, 'OPEN'), pr(2, 'MERGED'), pr(3, 'CLOSED'));
    expect(projectPrCounts(r, records([1, 'passed'], [2, 'passed'], [3, 'failed']))).toEqual({ inQa: 0, ready: 1, needsYou: 0 });
  });

  it('counts needs-human separately, as well as in QA', () => {
    const r = project(pr(1, 'OPEN'), pr(2, 'OPEN'), pr(3, 'OPEN'));
    expect(projectPrCounts(r, records([1, 'needs-human'], [2, 'fixing']))).toEqual({ inQa: 3, ready: 0, needsYou: 1 });
  });

  it('does not count a needs-human PR the CEO is still triaging as needing you', () => {
    const r = project(pr(1, 'OPEN'), pr(2, 'OPEN'));
    const qa = records([1, 'needs-human'], [2, 'needs-human']);
    qa[qaKey('acme/project1', 1)] = { ...qa[qaKey('acme/project1', 1)], ceoLooking: true };
    expect(projectPrCounts(r, qa)).toEqual({ inQa: 2, ready: 0, needsYou: 1 });
  });

  it('matches the Kanban In QA and Ready to merge columns, drafts included', () => {
    const r = project(pr(1, 'OPEN'), draft(2), draft(3), pr(4, 'OPEN'), pr(5, 'OPEN'), pr(6, 'MERGED'), pr(7, 'CLOSED'));
    const qa = records([1, 'passed'], [2, 'passed'], [4, 'testing'], [5, 'needs-human'], [6, 'passed'], [7, 'needs-human']);
    const cols = kanbanFor(r, [], qa);
    const counts = projectPrCounts(r, qa);
    expect(counts).toEqual({ inQa: 3, ready: 2, needsYou: 1 });
    expect([counts.inQa, counts.ready]).toEqual([cols.qa.length, cols.ready.length]);
  });
});

describe('needs-you counts and project health', () => {
  const project = (...pulls: PullInfo[]) => ({ ...repo(1, ...pulls), issues: [], autoMerge: false, cloneStatus: 'ready' }) as RepoView;
  const needsHuman = { [qaKey('acme/project1', 1)]: { repoId: 'acme/project1', prNumber: 1, status: 'needs-human', round: 3 } as QaView };

  it("takes the project's alarms, or its needs-human PRs when there are more of those", () => {
    expect(needsYouCount(project(pr(1, 'OPEN')), needsHuman, EMPTY_OPS)).toBe(1);
    const ops = { ...EMPTY_OPS, alarms: [alarmFor('a'), alarmFor('b'), alarmFor('c', 'acme/other')] };
    expect(needsYouCount(project(pr(1, 'OPEN')), needsHuman, ops)).toBe(2);
  });

  it('adds pending team changes to the office total', () => {
    const requests = [{ id: 'r1', status: 'pending' }, { id: 'r2', status: 'approved' }] as never;
    expect(totalNeedsYou([project(pr(1, 'OPEN'))], needsHuman, EMPTY_OPS, requests)).toBe(2);
  });

  it('is attention for something waiting on you or failing, busy while agents work, else idle', () => {
    const working = { id: 'k', status: 'working' } as AgentView;
    expect(projectHealth(project(), [working], 1)).toBe('attention');
    expect(projectHealth(project(), [{ ...working, status: 'error' }], 0)).toBe('attention');
    expect(projectHealth(project(), [working], 0)).toBe('busy');
    expect(projectHealth(project(), [{ ...working, status: 'idle' }], 0)).toBe('idle');
    expect(projectHealth({ ...project(), cloneStatus: 'cloning' }, [], 0)).toBe('setup');
  });
});

describe('kanbanFor', () => {
  const r = (...pulls: PullInfo[]) => ({ ...repo(1, ...pulls), issues: [{ number: 192, title: 'Cancelled', body: '', labels: [] }], autoMerge: false }) as unknown as RepoView;
  const barbara = (patch: Partial<AgentView>) => ({ id: 'b', name: 'Barbara', role: 'agent', task: 'issue', status: 'working', issueNumber: 192, issueTitle: 'Cancelled', prNumber: null, branch: 'swarm/issue-192-barbara', ...patch }) as AgentView;

  it('shows an agent working on an issue, and one who finished without a PR', () => {
    expect(kanbanFor(r(), [barbara({})], {}).progress.map((c) => c.note)).toEqual(['working']);
    expect(kanbanFor(r(), [barbara({ status: 'done' })], {}).progress.map((c) => c.note)).toEqual(['finished · no PR']);
  });

  it('shows no card once their PR is open, closed or merged', () => {
    const done = barbara({ status: 'done', prNumber: 198 });
    expect(kanbanFor(r(pr(198, 'OPEN')), [done], {}).progress).toEqual([]);
    expect(kanbanFor(r(), [done], {}).progress).toEqual([]);
    expect(kanbanFor(r(pr(198, 'MERGED')), [done], {}).progress).toEqual([]);
  });

  it('never takes the agent testing a PR for its author', () => {
    const tester = barbara({ id: 't', name: 'Tess', task: 'qa', issueNumber: null, prNumber: 198, branch: 'qa/pr-198' });
    const author = barbara({ status: 'done', prNumber: 198 });
    expect(kanbanFor(r(pr(198, 'OPEN')), [tester, author], {}).qa.map((c) => c.agent?.id)).toEqual(['b']);
    expect(kanbanFor(r(pr(198, 'OPEN')), [tester], {}).qa.map((c) => c.agent)).toEqual([undefined]);
  });

  it('marks an issue whose PR was closed as waiting for the manager, in the backlog', () => {
    const held = { ...r(), held: [{ issue: 192, pr: 198 }] } as RepoView;
    expect(kanbanFor(held, [], {}).backlog).toMatchObject([{ number: 192, note: '⏸ PR #198 closed · assign by hand', tone: 'warn' }]);
    expect(kanbanFor(r(), [], {}).backlog[0].tone).toBeUndefined();
  });

  it('marks backlog issues auto-assign would start as paced while Claude usage holds them back', () => {
    const issue = (number: number, body = '', labels: string[] = []) => ({ number, title: `#${number}`, body, url: '', labels, createdAt: '' }) as IssueInfo;
    const rr = { ...repo(1), issues: [issue(1), issue(2, 'Depends on #1'), issue(3, '', ['bug'])], autoAssign: true, autoMerge: true } as RepoView;
    const notes = (usage?: { state: 'normal' | 'pacing' | 'paused' }, autoAssign = true) => kanbanFor({ ...rr, autoAssign }, [], {}, usage).backlog.map((c) => c.note);
    expect(notes()).toEqual([undefined, '⏳ after #1', 'bug']);
    expect(notes({ state: 'pacing' })).toEqual(['⏸ paced', '⏳ after #1', '⏸ paced · bug']);
    expect(notes({ state: 'paused' })).toEqual(['⏸ paused', '⏳ after #1', '⏸ paused · bug']);
    expect(notes({ state: 'pacing' }, false)).toEqual([undefined, '⏳ after #1', 'bug']);
  });
});

describe('batched agents and watched terminal lines', () => {
  const line = (id: number, kind: LogLine['kind'] = 'tool') => ({ id, t: id, kind, text: `line ${id}` }) as LogLine;
  const ken = { id: 'ken', name: 'Ken', role: 'agent', status: 'working', currentTool: 'Read', repoId: 'acme/project1', log: [] } as Partial<AgentView>;

  beforeEach(() => useStore.getState().apply(snapshot([repo(1)], [ken])));

  it('merges a batch of agent changes in one update, and makes someone new from a full view', () => {
    const { apply } = useStore.getState();
    apply({ type: 'agents', agents: [{ id: 'ken', currentTool: 'Edit' }, { ...ken, id: 'ada', name: 'Ada' } as AgentView, { id: 'gone', currentTool: 'Bash' }] });
    const s = useStore.getState();
    expect(s.agents.ken).toMatchObject({ name: 'Ken', currentTool: 'Edit', status: 'working' });
    expect(s.agents.ada.name).toBe('Ada');
    expect(s.agents.gone).toBeUndefined();
    apply({ type: 'agentRemoved', agentId: 'ada' });
    expect(useStore.getState().agents.ada).toBeUndefined();
  });

  it('appends live lines once, replaces the buffer on a catch-up, and keeps the latest listed line', () => {
    const { apply } = useStore.getState();
    apply({ type: 'logs', catchUp: true, tails: { ken: [line(1), line(2, 'result')] } });
    apply({ type: 'logs', tails: { ken: [line(2, 'result'), line(3, 'text')] } });
    expect(useStore.getState().logs.ken.map((l) => l.id)).toEqual([1, 2, 3]);
    expect(useStore.getState().latest.ken.id).toBe(3);
    apply({ type: 'latest', lines: { grace: line(9) } });
    expect(useStore.getState().latest).toMatchObject({ ken: { id: 3 }, grace: { id: 9 } });
    apply({ type: 'logs', catchUp: true, tails: { ken: [line(7)] } });
    expect(useStore.getState().logs.ken.map((l) => l.id)).toEqual([7]);
  });
});
