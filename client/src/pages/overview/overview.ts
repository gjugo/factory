// Mission control's derivations: a project's pipeline as bar segments, the projects table's sort, the 24 h merges
// chart's points and its text alternative, the activity feed's filter. Pure, so they're tested without a browser.

import type { OpsAlarm, OpsProject, OpsNumbers, TickerItem } from '../../../../shared/types';
import { links } from '../../lib/links';
import type { Tone } from '@/lib/status';

/** Runs a command; api() has already toasted a failure, so it only resolves to undefined. */
export async function attempt<T>(fn: () => Promise<T>): Promise<T | undefined> {
  try {
    return await fn();
  } catch {
    return undefined;
  }
}

/** Where an alarm opens: a PR's card on its project's board, or the stuck agent's page. */
export const alarmLink = (a: OpsAlarm) =>
  a.kind === 'pr' && a.prNumber !== null ? links.board(a.repoId, { kind: 'pr', number: a.prNumber }) : a.agentId ? links.agent(a.agentId) : links.board(a.repoId);

export type Stage = 'ready' | 'building' | 'inQa' | 'fixing' | 'toMerge' | 'needsYou';

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

export interface ProjectRow {
  project: OpsProject;
  name: string;
}

function sortValue(r: ProjectRow, key: Exclude<SortKey, 'name'>): number | null {
  switch (key) {
    case 'pipeline':
      return pipelineTotal(r.project);
    case 'mergedToday':
      return r.project.mergedToday;
    case 'lead':
      return r.project.leadMs;
    case 'qaPass':
      return r.project.qaPass;
    case 'team':
      return r.project.busy + r.project.idle + r.project.errors;
    case 'alarms':
      return r.project.alarms;
  }
}

/** The projects table's rows in `sort`'s order; missing numbers ("—") go last either way, ties by project. */
export function sortProjects(rows: ProjectRow[], sort: Sort): ProjectRow[] {
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
    return c || a.project.number - b.project.number;
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

/** One project's numbers for the report. */
export interface ReportProject {
  name: string;
  issues: number;
  prs: number;
  ready: number;
  needsYou: number;
  autoAssign: boolean;
  working: number;
  idle: number;
}

export interface ReportInput {
  projects: ReportProject[];
  pending: number; // team changes waiting on the manager
  running: number; // sessions running now
  sessionLimit: number; // 0: none
  ceo: { name: string; job: string | null; nextReviewAt: number | null } | null;
}

export interface ReportLine {
  tone: Tone;
  text: string;
}

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

/**
 * Today's report, cubefarm's phone Company tab: a few plain sentences, most urgent first: PRs to merge, PRs that need
 * the manager, team changes, session slots, projects whose idle agents wait for auto-assign, the busiest project, the CEO.
 */
export function todaysReport(r: ReportInput, clock: (t: number) => string): ReportLine[] {
  if (r.projects.length === 0) return [{ tone: 'neutral', text: 'No projects yet. Add one and the CEO will staff it.' }];
  const lines: ReportLine[] = [];
  const ready = r.projects.filter((p) => p.ready > 0);
  const readyN = ready.reduce((n, p) => n + p.ready, 0);
  if (readyN) {
    const where = ready.map((p) => `${p.name}: ${p.ready}`).join(', ');
    lines.push({ tone: 'success', text: `${readyN} pull ${plural(readyN, 'request passed QA and is', 'requests passed QA and are')} ready for you to merge (${where}).` });
  }
  const stuck = r.projects.reduce((n, p) => n + p.needsYou, 0);
  if (stuck) lines.push({ tone: 'danger', text: `${stuck} pull ${plural(stuck, 'request needs', 'requests need')} your call: the team can't move ${plural(stuck, 'it', 'them')} on alone.` });
  if (r.pending) lines.push({ tone: 'warning', text: `${r.pending} team ${plural(r.pending, 'change is', 'changes are')} waiting for your decision.` });
  lines.push({
    tone: 'neutral',
    text: r.sessionLimit
      ? r.running
        ? `${r.running} of ${r.sessionLimit} session slots are busy right now.`
        : `Nobody is working at the moment (${r.sessionLimit} session slots free).`
      : r.running
        ? `${r.running} ${plural(r.running, 'session is', 'sessions are')} running right now.`
        : 'Nobody is working at the moment.',
  });
  for (const p of r.projects) {
    if (p.issues > 0 && !p.autoAssign && p.working === 0 && p.idle > 0)
      lines.push({ tone: 'info', text: `${p.name} has ${p.issues} open ${plural(p.issues, 'issue', 'issues')} and free agents, but auto-assign is off.` });
  }
  const busiest = [...r.projects].sort((a, b) => b.issues + b.prs - (a.issues + a.prs))[0];
  if (r.projects.length > 1 && busiest.issues + busiest.prs > 0)
    lines.push({ tone: 'neutral', text: `Most work in flight: ${busiest.name} (${busiest.issues} ${plural(busiest.issues, 'issue', 'issues')}, ${busiest.prs} ${plural(busiest.prs, 'PR', 'PRs')}).` });
  if (r.ceo) {
    const { name, job, nextReviewAt } = r.ceo;
    lines.push({
      tone: 'neutral',
      text: job ? `${name} is on: ${job}.` : nextReviewAt ? `${name} reviews the company next at ${clock(nextReviewAt)}.` : `${name}'s periodic reviews are off.`,
    });
  }
  return lines;
}
