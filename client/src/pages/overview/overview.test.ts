import { describe, expect, it } from 'vitest';
import type { OpsAlarm, OpsFloor, TickerItem } from '../../../../shared/types';
import { EMPTY_NUMBERS } from '../../ops';
import { alarmLink, feedItems, nextSort, pipelineSegments, pipelineText, sortFloors, sparkPoints, sparkSummary, todaysReport, type FloorRow, type ReportInput, type ReportProject } from './overview';

const floor = (n: number, patch: Partial<OpsFloor> = {}): OpsFloor => ({ ...EMPTY_NUMBERS, repoId: `o/r${n}`, floor: n, alarms: 0, ...patch });
const row = (name: string, f: OpsFloor): FloorRow => ({ name, floor: f });

describe('pipeline segments', () => {
  it('lays the non-empty stages end to end in pipeline order', () => {
    const segs = pipelineSegments({ ready: 2, building: 0, inQa: 1, fixing: 0, toMerge: 1, needsYou: 0 });
    expect(segs.map((s) => [s.key, s.count, s.start, s.width])).toEqual([
      ['ready', 2, 0, 50],
      ['inQa', 1, 50, 25],
      ['toMerge', 1, 75, 25],
    ]);
  });

  it('has nothing to draw for an empty pipeline', () => {
    expect(pipelineSegments(EMPTY_NUMBERS)).toEqual([]);
    expect(pipelineText(EMPTY_NUMBERS)).toBe('Nothing in the pipeline');
  });

  it('reads out as text', () => {
    expect(pipelineText({ ...EMPTY_NUMBERS, ready: 3, inQa: 2, needsYou: 1 })).toBe('3 ready, 2 in qa, 1 needs you');
  });
});

describe('sorting the projects table', () => {
  const a = row('alpha', floor(1, { mergedToday: 3, leadMs: 5000, alarms: 1 }));
  const b = row('beta', floor(2, { mergedToday: 7, leadMs: null, ready: 4 }));
  const c = row('gamma', floor(3, { mergedToday: 3, leadMs: 1000 }));

  it('by name, A→Z or Z→A', () => {
    expect(sortFloors([c, a, b], { key: 'name', desc: false }).map((r) => r.name)).toEqual(['alpha', 'beta', 'gamma']);
    expect(sortFloors([c, a, b], { key: 'name', desc: true }).map((r) => r.name)).toEqual(['gamma', 'beta', 'alpha']);
  });

  it('by a number, ties by floor', () => {
    expect(sortFloors([c, a, b], { key: 'mergedToday', desc: true }).map((r) => r.name)).toEqual(['beta', 'alpha', 'gamma']);
    expect(sortFloors([c, a, b], { key: 'pipeline', desc: true }).map((r) => r.name)).toEqual(['beta', 'alpha', 'gamma']);
  });

  it('puts missing numbers last in both directions', () => {
    expect(sortFloors([b, a, c], { key: 'lead', desc: false }).map((r) => r.name)).toEqual(['gamma', 'alpha', 'beta']);
    expect(sortFloors([b, a, c], { key: 'lead', desc: true }).map((r) => r.name)).toEqual(['alpha', 'gamma', 'beta']);
  });

  it('flips the same column, starts a new one sensibly', () => {
    expect(nextSort({ key: 'name', desc: false }, 'name')).toEqual({ key: 'name', desc: true });
    expect(nextSort({ key: 'name', desc: false }, 'alarms')).toEqual({ key: 'alarms', desc: true });
    expect(nextSort({ key: 'alarms', desc: true }, 'name')).toEqual({ key: 'name', desc: false });
  });
});

describe('the merges chart', () => {
  const now = new Date(2026, 9, 31, 2, 30).getTime();

  it('labels each hour, the current one last, wrapping past midnight', () => {
    const spark = new Array<number>(24).fill(0);
    spark[23] = 2;
    spark[20] = 1;
    const pts = sparkPoints(spark, now);
    expect(pts).toHaveLength(24);
    expect(pts[23]).toEqual({ hour: '02:00', merges: 2 });
    expect(pts[21].hour).toBe('00:00');
    expect(pts[20]).toEqual({ hour: '23:00', merges: 1 });
    expect(pts[0].hour).toBe('03:00');
  });

  it('says what it shows', () => {
    expect(sparkSummary(sparkPoints(new Array<number>(24).fill(0), now))).toBe('No merges in the last 24 hours.');
    const spark = new Array<number>(24).fill(0);
    spark[22] = 3;
    spark[23] = 1;
    expect(sparkSummary(sparkPoints(spark, now))).toBe('4 merges in the last 24 hours; the busiest hour was 01:00 with 3.');
  });
});

describe('the activity feed', () => {
  const item = (id: number, repoId: string): TickerItem => ({ id, repoId, at: id, text: `line ${id}`, tone: 'info' });
  const ticker = [item(1, 'o/a'), item(2, 'o/b'), item(3, 'o/a'), item(4, 'o/a')];

  it('lists newest first, filtered by project, up to the limit', () => {
    expect(feedItems(ticker, null, 10).map((t) => t.id)).toEqual([4, 3, 2, 1]);
    expect(feedItems(ticker, 'o/a', 2).map((t) => t.id)).toEqual([4, 3]);
    expect(feedItems(ticker, 'o/b', 10).map((t) => t.id)).toEqual([2]);
  });
});

describe('alarm links', () => {
  const alarm = (patch: Partial<OpsAlarm>): OpsAlarm => ({ id: 'x', kind: 'pr', repoId: 'demo-co/pixel-todo', floor: 1, prNumber: null, agentId: null, text: '', since: 0, ...patch });

  it('opens a PR alarm at its board card, an agent alarm at the agent', () => {
    expect(alarmLink(alarm({ prNumber: 34 }))).toBe('/projects/demo-co/pixel-todo?card=pr-34');
    expect(alarmLink(alarm({ kind: 'agent', agentId: 'a 1' }))).toBe('/agents/a%201');
    expect(alarmLink(alarm({}))).toBe('/projects/demo-co/pixel-todo');
  });
});

describe("today's report", () => {
  const project = (p: Partial<ReportProject>): ReportProject => ({ name: 'app', issues: 0, prs: 0, ready: 0, needsYou: 0, autoAssign: true, working: 0, idle: 0, ...p });
  const clock = () => '14:30';
  const base = { pending: 0, running: 0, sessionLimit: 0, ceo: null };

  it('says there is nothing yet without projects', () => {
    expect(todaysReport({ ...base, projects: [] }, clock)).toEqual([{ tone: 'neutral', text: 'No projects yet. Add one and the CEO will staff it.' }]);
  });

  it('puts what waits on the manager first', () => {
    const lines = todaysReport(
      { ...base, pending: 1, running: 2, sessionLimit: 4, projects: [project({ name: 'web', ready: 2, needsYou: 1, prs: 3 }), project({ name: 'api', ready: 1, prs: 1 })] },
      clock,
    );
    expect(lines.map((l) => l.tone)).toEqual(['success', 'danger', 'warning', 'neutral', 'neutral']);
    expect(lines[0].text).toBe('3 pull requests passed QA and are ready for you to merge (web: 2, api: 1).');
    expect(lines[1].text).toBe("1 pull request needs your call: the team can't move it on alone.");
    expect(lines[2].text).toBe('1 team change is waiting for your decision.');
    expect(lines[3].text).toBe('2 of 4 session slots are busy right now.');
    expect(lines[4].text).toBe('Most work in flight: web (0 issues, 3 PRs).');
  });

  it('points at idle agents waiting for auto-assign', () => {
    const lines = todaysReport({ ...base, projects: [project({ name: 'web', issues: 2, autoAssign: false, idle: 1 })] }, clock);
    expect(lines.map((l) => l.text)).toContain('web has 2 open issues and free agents, but auto-assign is off.');
    // Busy agents, or auto-assign on, say nothing.
    for (const p of [project({ issues: 2, autoAssign: false, idle: 1, working: 1 }), project({ issues: 2, idle: 1 })])
      expect(todaysReport({ ...base, projects: [p] }, clock).some((l) => l.text.includes('auto-assign is off'))).toBe(false);
  });

  it('ends with the CEO', () => {
    const at = (ceo: ReportInput['ceo']) => todaysReport({ ...base, projects: [project({})], ceo }, clock).at(-1)?.text;
    expect(at({ name: 'Morgan', job: 'Planning web', nextReviewAt: null })).toBe('Morgan is on: Planning web.');
    expect(at({ name: 'Morgan', job: null, nextReviewAt: 1 })).toBe('Morgan reviews the company next at 14:30.');
    expect(at({ name: 'Morgan', job: null, nextReviewAt: null })).toBe("Morgan's periodic reviews are off.");
  });
});
