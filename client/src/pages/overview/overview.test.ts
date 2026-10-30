import { describe, expect, it } from 'vitest';
import type { OpsFloor, TickerItem } from '../../../../shared/types';
import { EMPTY_NUMBERS } from '../../ops';
import { feedItems, nextSort, pipelineSegments, pipelineText, sortFloors, sparkPoints, sparkSummary, type FloorRow } from './overview';

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
