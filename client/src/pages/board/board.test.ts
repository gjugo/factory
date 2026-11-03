import { describe, expect, it } from 'vitest';
import type { IssueInfo, PullInfo, QaStatus, QaView, RepoView } from '../../../../shared/types';
import type { Agent, KanbanCard, KanbanColumns } from '@/store';
import { backlogState, boardColumns, cardDetail, cardDomKey, filterColumns, findCard, freeAgents, initials, matchesFilter, NO_FILTER, noteTone, plainNote, repoLabels, shownNote } from './board';

const issue = (number: number, labels: string[] = [], body = ''): IssueInfo => ({ number, title: `Issue ${number}`, body, url: '', labels, createdAt: '2026-10-01T10:00:00Z', author: 'manager' });
const pull = (number: number, over: Partial<PullInfo> = {}): PullInfo =>
  ({ number, title: `PR ${number}`, state: 'OPEN', checks: 'passing', mergeable: 'MERGEABLE', closesIssues: [], createdAt: '2026-10-02T10:00:00Z', mergedAt: null, ...over }) as PullInfo;
const prCard = (number: number, status?: QaStatus): KanbanCard => ({ key: `pr-${number}`, number, prNumber: number, title: `PR ${number}`, qa: status ? ({ status, round: 1 } as QaView) : undefined });
const issueCard = (number: number, agent?: Partial<Agent>): KanbanCard => ({ key: `i-${number}`, number, title: `Issue ${number}`, agent: agent as Agent });
const cols = (over: Partial<KanbanColumns>): KanbanColumns => ({ backlog: [], progress: [], qa: [], ready: [], merged: [], ...over });

describe('boardColumns', () => {
  it("splits kanbanFor's In QA column by what happens next and keeps the other columns as they are", () => {
    const pulls = [pull(1), pull(2), pull(3), pull(4), pull(5), pull(6, { checks: 'failing' }), pull(7, { mergeable: 'CONFLICTING' }), pull(8), pull(9, { checks: 'failing' })];
    const backlog = [issueCard(20)];
    const progress = [issueCard(21)];
    const merged = [prCard(30)];
    const out = boardColumns(
      cols({ backlog, progress, merged, qa: [prCard(1, 'queued'), prCard(2, 'testing'), prCard(3, 'failed'), prCard(4, 'fixing'), prCard(5, 'needs-human'), prCard(6), prCard(7), prCard(8), prCard(9, 'testing')], ready: [prCard(10, 'passed')] }),
      pulls,
    );
    const nums = (k: keyof typeof out) => out[k].map((c) => c.number);
    expect(out.backlog).toBe(backlog);
    expect(out.building).toBe(progress);
    expect(out.merged).toBe(merged);
    expect(nums('qa')).toEqual([1, 2, 8, 9]);
    expect(nums('fixing')).toEqual([3, 4, 6, 7]);
    expect(nums('merge')).toEqual([5, 10]);
  });

  it('loses no card', () => {
    const qa = [prCard(1, 'failed'), prCard(2), prCard(3, 'needs-human')];
    const out = boardColumns(cols({ qa, ready: [prCard(4, 'passed')] }), [pull(1), pull(2), pull(3), pull(4)]);
    expect(Object.values(out).flat()).toHaveLength(4);
  });
});

describe('backlogState', () => {
  const repo = (issues: IssueInfo[], held: RepoView['held'] = [], untrusted: number[] = []) => ({ issues, held, untrusted });

  it('is ready, waiting on open issues, held after a closed PR, or skipped by label', () => {
    const issues = [issue(1), issue(2, [], 'Depends on #1 and #9'), issue(3), issue(4, ['swarm:skip']), issue(5, ['Question'])];
    const r = repo(issues, [{ issue: 3, pr: 12 }]);
    expect(backlogState(issues[0], r)).toEqual({ state: 'ready', waits: [] });
    expect(backlogState(issues[1], r)).toEqual({ state: 'waiting', waits: [1] }); // #9 isn't open: it doesn't count
    expect(backlogState(issues[2], r).state).toBe('held');
    expect(backlogState(issues[3], r).state).toBe('skip');
    expect(backlogState(issues[4], r).state).toBe('skip');
  });

  it("is untrusted when someone the office doesn't trust filed it, even with a skip label", () => {
    const issues = [issue(1), issue(2, ['swarm:skip'])];
    const r = repo(issues, [], [1, 2]);
    expect(backlogState(issues[0], r).state).toBe('untrusted');
    expect(backlogState(issues[1], r).state).toBe('untrusted');
    expect(backlogState(issues[0], { issues, held: [] }).state).toBe('ready'); // an older journal's project has no list
  });
});

describe('findCard', () => {
  const pulls = [pull(40, { closesIssues: [4] }), pull(41, { state: 'MERGED', closesIssues: [5] }), pull(42, { state: 'MERGED', closesIssues: [6] }), pull(43, { closesIssues: [6] })];
  const board = boardColumns(cols({ backlog: [issueCard(1)], progress: [issueCard(2)], qa: [prCard(40), prCard(43)], merged: [prCard(41), prCard(42)] }), pulls);

  it('finds issues and PRs by number with their column', () => {
    expect(findCard(board, { kind: 'issue', number: 1 }, pulls)).toMatchObject({ column: 'backlog', card: { number: 1 } });
    expect(findCard(board, { kind: 'issue', number: 2 }, pulls)?.column).toBe('building');
    expect(findCard(board, { kind: 'pr', number: 41 }, pulls)?.column).toBe('merged');
    expect(findCard(board, { kind: 'pr', number: 99 }, pulls)).toBeNull();
  });

  it("lands an issue's link on its PR once the work moved on, the open one first", () => {
    expect(findCard(board, { kind: 'issue', number: 4 }, pulls)?.card.prNumber).toBe(40);
    expect(findCard(board, { kind: 'issue', number: 5 }, pulls)?.card.prNumber).toBe(41);
    expect(findCard(board, { kind: 'issue', number: 6 }, pulls)?.card.prNumber).toBe(43);
    expect(findCard(board, { kind: 'issue', number: 7 }, pulls)).toBeNull();
  });
});

describe('cardDetail', () => {
  const repo = { issues: [issue(1, ['ui'], 'Depends on #2'), issue(2, ['api']), issue(3, ['ui', 'bug'])], pulls: [pull(10, { closesIssues: [3, 2], additions: 5 }), pull(11, { state: 'MERGED', mergedAt: '2026-10-03T00:00:00Z' })] };

  it("labels an issue card with its issue's labels and its blockers", () => {
    const d = cardDetail(issueCard(1), 'backlog', repo);
    expect(d.labels).toEqual(['ui']);
    expect(d.waits).toEqual([2]);
    expect(d.since).toBe(Date.parse('2026-10-01T10:00:00Z'));
  });

  it("labels a PR card with the labels of every issue it closes, once each, and dates it from the PR", () => {
    const d = cardDetail(prCard(10), 'qa', repo);
    expect(d.issue?.number).toBe(3);
    expect(d.labels).toEqual(['ui', 'bug', 'api']);
    expect(d.waits).toEqual([]);
    expect(d.since).toBe(Date.parse('2026-10-02T10:00:00Z'));
    expect(cardDetail(prCard(11), 'merged', repo).since).toBe(Date.parse('2026-10-03T00:00:00Z'));
  });

  it('dates a building card from when its agent started', () => {
    expect(cardDetail(issueCard(2, { startedAt: 1234 }), 'building', repo).since).toBe(1234);
  });
});

describe('filters', () => {
  const card = { ...prCard(12), title: 'Add dark mode', agent: { id: 'ada' } as Agent };

  it('searches by number (with or without # and PR) and title, case-insensitive', () => {
    for (const query of ['12', '#12', 'PR #12', 'pr12', 'dark', 'DARK MODE', '']) expect(matchesFilter(card, [], { ...NO_FILTER, query })).toBe(true);
    for (const query of ['1', '#13', 'light']) expect(matchesFilter(card, [], { ...NO_FILTER, query })).toBe(false);
  });

  it('filters by label and agent', () => {
    expect(matchesFilter(card, ['ui'], { ...NO_FILTER, label: 'ui' })).toBe(true);
    expect(matchesFilter(card, ['api'], { ...NO_FILTER, label: 'ui' })).toBe(false);
    expect(matchesFilter(card, [], { ...NO_FILTER, agentId: 'ada' })).toBe(true);
    expect(matchesFilter(card, [], { ...NO_FILTER, agentId: 'ken' })).toBe(false);
  });

  it('filters every column, and returns the same columns when nothing is filtered', () => {
    const repo = { issues: [issue(1, ['ui']), issue(2, ['api'])], pulls: [] };
    const board = boardColumns(cols({ backlog: [issueCard(1), issueCard(2)] }), []);
    expect(filterColumns(board, repo, NO_FILTER)).toBe(board);
    expect(filterColumns(board, repo, { ...NO_FILTER, label: 'api' }).backlog.map((c) => c.number)).toEqual([2]);
    expect(repoLabels(repo)).toEqual(['api', 'ui']);
  });
});

describe('card labels', () => {
  it("strips kanbanFor's leading emoji from a note", () => {
    expect(plainNote('🔍 testing · round 2')).toBe('testing · round 2');
    expect(plainNote('⚠️ needs you · conflicts')).toBe('needs you · conflicts');
    expect(plainNote('⏳ after #3, #4')).toBe('after #3, #4');
    expect(plainNote('QA ✓ · conflicts')).toBe('QA ✓ · conflicts');
    expect(plainNote(undefined)).toBe('');
  });

  it("shows a backlog card's note only when it says more than its labels and blockers", () => {
    expect(shownNote({ note: '⏳ after #3' }, 'backlog', 'waiting')).toBe('');
    expect(shownNote({ note: 'ui, bug' }, 'backlog', 'ready')).toBe('');
    expect(shownNote({ note: '⏸ paced · ui, bug' }, 'backlog', 'ready')).toBe('paced');
    expect(shownNote({ note: '⏸ PR #12 closed · assign by hand' }, 'backlog', 'held')).toBe('PR #12 closed · assign by hand');
    expect(shownNote({ note: '🔍 testing · round 2' }, 'qa')).toBe('testing · round 2');
    expect([noteTone('good'), noteTone('warn'), noteTone('bad'), noteTone(undefined)]).toEqual(['success', 'warning', 'danger', 'info']);
  });

  it('keys a card by its PR, else its issue', () => {
    expect(cardDomKey(prCard(7))).toBe('pr-7');
    expect(cardDomKey(issueCard(3))).toBe('issue-3');
  });

  it('makes initials and picks free agents', () => {
    expect(initials('Ada Lovelace')).toBe('AL');
    expect(initials('margaret')).toBe('MA');
    expect(initials('  ')).toBe('?');
    const agents = [
      { id: 'a', role: 'worker', status: 'idle' },
      { id: 'b', role: 'worker', status: 'working' },
      { id: 'c', role: 'ceo', status: 'idle' },
      { id: 'd', role: 'worker', status: 'error' },
    ] as Agent[];
    expect(freeAgents(agents).map((a) => a.id)).toEqual(['a', 'd']);
  });
});
