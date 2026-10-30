// Mission control's derivations: a project's pipeline as bar segments, the projects table's sort, the 24 h merges
// chart's points and its text alternative, the activity feed's filter. Pure, so they're tested without a browser.

import type { OpsFloor, OpsNumbers, TickerItem } from '../../../../shared/types';
import type { Tone } from '@/lib/status';

/** Runs a command; api() has already toasted a failure, so it only resolves to undefined. */
export async function attempt<T>(fn: () => Promise<T>): Promise<T | undefined> {
  try {
    return await fn();
  } catch {
    return undefined;
  }
}

export type Stage ='ready' | 'building' | 'inQa' | 'fixing' | 'toMerge' | 'needsYou';

export const STAGES: { key: Stage; label: string; tone: Tone; hint: string }[] = [
  { key: 'ready', label: 'Ready', tone: 'neutral', hint: 'Backlog issues that can start now' },
  { key: 'building', label: 'Building', tone: 'info', hint: 'Issues an agent is working on' },
  { key: 'inQa', label: 'In QA', tone: 'info', hint: 'Open PRs waiting for QA or being tested' },
  { key: 'fixing', label: 'Fixing', tone: 'warning', hint: 'Back with an agent: QA findings, checks or a conflict' },
  { key: 'toMerge', label: 'To merge', tone: 'success', hint: 'Open PRs that passed QA' },
  { key: 'needsYou', label: 'Needs you', tone: 'danger', hint: 'Open PRs the office can’t move without you' },
];

export interface Segment {
  key: Stage;
  label: string;
  tone: Tone;
  count: number;
  start: number; // 0-100, where the segment starts along the bar
  width: number; // 0-100
}

/** The pipeline's non-empty stages as consecutive segments of a 100-wide bar, in pipeline order. */
export function pipelineSegments(n: Pick<OpsNumbers, Stage>): Segment[] {
  const total = pipelineTotal(n);
  if (total === 0) return [];
  let start = 0;
  return STAGES.filter((s) => n[s.key] > 0).map((s) => {
    const width = (n[s.key] / total) * 100;
    const seg = { key: s.key, label: s.label, tone: s.tone, count: n[s.key], start, width };
    start += width;
    return seg;
  });
}

export const pipelineTotal = (n: Pick<OpsNumbers, Stage>) => STAGES.reduce((sum, s) => sum + n[s.key], 0);

/** "3 ready, 1 building, 2 in QA"; "Nothing in the pipeline" when empty. For screen readers and tooltips. */
export function pipelineText(n: Pick<OpsNumbers, Stage>): string {
  const parts = STAGES.filter((s) => n[s.key] > 0).map((s) => `${n[s.key]} ${s.label.toLowerCase()}`);
  return parts.length ? parts.join(', ') : 'Nothing in the pipeline';
}

export type SortKey = 'name' | 'pipeline' | 'mergedToday' | 'lead' | 'qaPass' | 'team' | 'alarms';
export interface Sort {
  key: SortKey;
  desc: boolean;
}

export interface FloorRow {
  floor: OpsFloor;
  name: string;
}

function sortValue(r: FloorRow, key: Exclude<SortKey, 'name'>): number | null {
  switch (key) {
    case 'pipeline':
      return pipelineTotal(r.floor);
    case 'mergedToday':
      return r.floor.mergedToday;
    case 'lead':
      return r.floor.leadMs;
    case 'qaPass':
      return r.floor.qaPass;
    case 'team':
      return r.floor.busy + r.floor.idle + r.floor.errors;
    case 'alarms':
      return r.floor.alarms;
  }
}

/** The projects table's rows in `sort`'s order; missing numbers ("—") go last either way, ties by floor. */
export function sortFloors(rows: FloorRow[], sort: Sort): FloorRow[] {
  const dir = sort.desc ? -1 : 1;
  return [...rows].sort((a, b) => {
    let c = 0;
    if (sort.key === 'name') c = dir * a.name.localeCompare(b.name);
    else {
      const x = sortValue(a, sort.key);
      const y = sortValue(b, sort.key);
      if (x === null || y === null) c = x === y ? 0 : x === null ? 1 : -1;
      else c = dir * (x - y);
    }
    return c || a.floor.floor - b.floor.floor;
  });
}

/** Clicking a header: the same column flips direction; a new one starts with names A→Z and numbers biggest first. */
export const nextSort = (cur: Sort, key: SortKey): Sort => (cur.key === key ? { key, desc: !cur.desc } : { key, desc: key !== 'name' });

export interface SparkPoint {
  hour: string; // "14:00", the clock hour the merges fell in
  merges: number;
}

/** `spark` (merges per clock hour, oldest first, the current hour last) with each bar's hour, in local time. */
export function sparkPoints(spark: number[], now: number): SparkPoint[] {
  const hourNow = new Date(now).getHours();
  return spark.map((merges, i) => {
    const h = (((hourNow - (spark.length - 1 - i)) % 24) + 24) % 24;
    return { hour: `${String(h).padStart(2, '0')}:00`, merges };
  });
}

/** The chart's text alternative: the total and the busiest hour. */
export function sparkSummary(points: SparkPoint[]): string {
  const total = points.reduce((s, p) => s + p.merges, 0);
  if (total === 0) return 'No merges in the last 24 hours.';
  const best = points.reduce((a, b) => (b.merges > a.merges ? b : a));
  return `${total} merge${total === 1 ? '' : 's'} in the last 24 hours; the busiest hour was ${best.hour} with ${best.merges}.`;
}

/** The activity feed: newest first, one project's or everyone's (repoId null), at most `limit` lines. */
export function feedItems(ticker: TickerItem[], repoId: string | null, limit: number): TickerItem[] {
  const out: TickerItem[] = [];
  for (let i = ticker.length - 1; i >= 0 && out.length < limit; i--) {
    if (repoId === null || ticker[i].repoId === repoId) out.push(ticker[i]);
  }
  return out;
}
