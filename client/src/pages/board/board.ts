import { blockers } from '../../../../shared/issues';
import type { IssueInfo, PullInfo, RepoView } from '../../../../shared/types';
import type { BoardCard } from '@/lib/links';
import type { Tone } from '@/lib/status';
import type { Agent, KanbanCard, KanbanColumns } from '@/store';

// The board's pure logic: cubefarm's five Kanban columns (store.ts kanbanFor) split into the dashboard's six, what a
// card shows beside its note (labels, dependencies, its PR's numbers), the toolbar's filters, and finding a card from
// a ?card= link. The cards themselves, their notes and tones, are kanbanFor's: the same demo state fills the same cards.

export type ColumnKey = 'backlog' | 'building' | 'qa' | 'fixing' | 'merge' | 'merged';

export const COLUMNS: { key: ColumnKey; title: string; short: string; empty: string }[] = [
  { key: 'backlog', title: 'Backlog', short: 'Backlog', empty: 'No open issues.' },
  { key: 'building', title: 'Building', short: 'Building', empty: 'Nobody is coding right now.' },
  { key: 'qa', title: 'QA', short: 'QA', empty: 'Nothing waiting for testing.' },
  { key: 'fixing', title: 'Fixing', short: 'Fixing', empty: 'Nothing being fixed.' },
  { key: 'merge', title: 'To merge / Needs you', short: 'To merge', empty: 'Nothing waiting on you.' },
  { key: 'merged', title: 'Recently merged', short: 'Merged', empty: 'Nothing merged yet.' },
];

export type BoardColumns = Record<ColumnKey, KanbanCard[]>;

/**
 * kanbanFor's "In QA" column split by what happens next: needs-human waits on the manager (beside the passed PRs);
 * failed, fixing, and untested PRs whose checks fail or that conflict go to Fixing; the rest wait for or are in QA.
 */
export function boardColumns(cols: KanbanColumns, pulls: PullInfo[]): BoardColumns {
  const out: BoardColumns = { backlog: cols.backlog, building: cols.progress, qa: [], fixing: [], merge: [], merged: cols.merged };
  for (const c of cols.qa) out[qaColumn(c, pulls.find((p) => p.number === c.prNumber))].push(c);
  // Needs-you first: they wait on the manager; passed PRs may merge by themselves.
  out.merge = [...out.merge, ...cols.ready];
  return out;
}

function qaColumn(c: KanbanCard, pr: PullInfo | undefined): ColumnKey {
  switch (c.qa?.status) {
    case 'needs-human':
      return 'merge';
    case 'failed':
    case 'fixing':
      return 'fixing';
    case 'queued':
    case 'testing':
      return 'qa';
    default:
      return pr && (pr.checks === 'failing' || pr.mergeable === 'CONFLICTING') ? 'fixing' : 'qa';
  }
}

/** The labels the board leaves alone: the scheduler never starts these (server/swarm.ts). */
export const SKIP_LABEL = /^(swarm:skip|wontfix|question)$/i;

export type BacklogState = 'ready' | 'waiting' | 'held' | 'untrusted' | 'skip';

export const BACKLOG_LOOK: Record<BacklogState, { label: string; tone: Tone }> = {
  ready: { label: 'Ready', tone: 'success' },
  waiting: { label: 'Waiting', tone: 'neutral' },
  held: { label: 'Held', tone: 'warning' },
  untrusted: { label: 'Untrusted', tone: 'warning' },
  skip: { label: 'Skipped', tone: 'neutral' },
};

/**
 * Why a backlog issue is (or isn't) next: ready to start, waiting on open issues, held after its PR closed, filed by
 * someone the office doesn't trust (shared/issueTrust.ts), or skipped.
 */
export function backlogState(issue: Pick<IssueInfo, 'number' | 'body' | 'labels'>, repo: Pick<RepoView, 'issues' | 'held'> & Partial<Pick<RepoView, 'untrusted'>>): { state: BacklogState; waits: number[] } {
  const waits = blockers(issue.body, new Set(repo.issues.map((i) => i.number)));
  if ((repo.held ?? []).some((h) => h.issue === issue.number)) return { state: 'held', waits };
  if ((repo.untrusted ?? []).includes(issue.number)) return { state: 'untrusted', waits };
  if (issue.labels.some((l) => SKIP_LABEL.test(l))) return { state: 'skip', waits };
  return { state: waits.length ? 'waiting' : 'ready', waits };
}

/** The ?card= a board card opens with: its PR if it has one, else its issue. */
export const cardRef = (c: Pick<KanbanCard, 'number' | 'prNumber'>): BoardCard => (c.prNumber != null ? { kind: 'pr', number: c.prNumber } : { kind: 'issue', number: c.number });

/** The DOM id-ish key a card is focused by: `issue-12`, `pr-34`. */
export const cardDomKey = (c: Pick<KanbanCard, 'number' | 'prNumber'>) => `${cardRef(c).kind}-${cardRef(c).number}`;

/**
 * The card a ?card= link means, and its column. An issue whose PR is open (or merged) is found on its PR's card, so a
 * link or dependency chip to an issue still lands once the work moved on.
 */
export function findCard(cols: BoardColumns, ref: BoardCard, pulls: PullInfo[]): { card: KanbanCard; column: ColumnKey } | null {
  const all = COLUMNS.flatMap(({ key }) => cols[key].map((card) => ({ card, column: key })));
  if (ref.kind === 'pr') return all.find((x) => x.card.prNumber === ref.number) ?? null;
  const direct = all.find((x) => x.card.prNumber == null && x.card.number === ref.number);
  if (direct) return direct;
  // Prefer the open PR that closes it over a merged one.
  const prs = pulls.filter((p) => p.closesIssues.includes(ref.number)).sort((a, b) => Number(b.state === 'OPEN') - Number(a.state === 'OPEN'));
  for (const p of prs) {
    const hit = all.find((x) => x.card.prNumber === p.number);
    if (hit) return hit;
  }
  return null;
}

export interface CardDetail {
  pull?: PullInfo;
  /** The issue: the card's own, or the first one its PR closes. */
  issue?: IssueInfo;
  labels: string[];
  /** Open issues it waits for ("Depends on #N"). */
  waits: number[];
  /** When it started where it is: filed, started building, PR opened, merged (epoch ms). */
  since: number | null;
}

/** What a card shows beyond kanbanFor's note: labels (its issue's, or those of the issues its PR closes), blockers, age. */
export function cardDetail(card: KanbanCard, column: ColumnKey, repo: Pick<RepoView, 'issues' | 'pulls'>): CardDetail {
  const pull = card.prNumber != null ? repo.pulls.find((p) => p.number === card.prNumber) : undefined;
  const issueNumbers = pull ? pull.closesIssues : [card.number];
  const issues = issueNumbers.map((n) => repo.issues.find((i) => i.number === n)).filter((i): i is IssueInfo => !!i);
  const issue = issues[0];
  const open = new Set(repo.issues.map((i) => i.number));
  const waits = !pull && issue ? blockers(issue.body, open) : [];
  const labels = [...new Set(issues.flatMap((i) => i.labels))];
  const time = (iso: string | null | undefined) => {
    const t = iso ? Date.parse(iso) : NaN;
    return Number.isFinite(t) ? t : null;
  };
  const since =
    column === 'merged' ? time(pull?.mergedAt) : column === 'building' ? (card.agent?.startedAt ?? null) : pull ? time(pull.createdAt) : time(issue?.createdAt);
  return { pull, issue, labels, waits, since };
}

/** A note without kanbanFor's leading emoji ("🔍 testing · round 2" → "testing · round 2"): the board draws its own icons. */
export const plainNote = (note: string | undefined) => (note ?? '').replace(/^[^\p{L}\p{N}#]+/u, '').trim();

/**
 * The note a card shows. A backlog card's note repeats its labels or blockers, which the board draws already; only a
 * held or untrusted issue's note and pacing ("paused", "paced") say more there.
 */
export function shownNote(card: Pick<KanbanCard, 'note'>, column: ColumnKey, backlog?: BacklogState): string {
  const note = plainNote(card.note);
  if (column !== 'backlog' || backlog === 'held' || backlog === 'untrusted') return note;
  return /\b(paused|paced)\b/.test(note) ? note.split(' · ')[0] : '';
}

/** A card's tone (kanbanFor's) as a badge tone; a card without one reads as information. */
export const noteTone = (tone: KanbanCard['tone']): Tone => (tone === 'good' ? 'success' : tone === 'warn' ? 'warning' : tone === 'bad' ? 'danger' : 'info');

export interface BoardFilter {
  query: string;
  label: string; // '' = any
  agentId: string; // '' = anyone
}

export const NO_FILTER: BoardFilter = { query: '', label: '', agentId: '' };

/** Does a card pass the toolbar's search (number or title), label and agent filters? */
export function matchesFilter(card: KanbanCard, labels: string[], f: BoardFilter): boolean {
  if (f.label && !labels.includes(f.label)) return false;
  if (f.agentId && card.agent?.id !== f.agentId) return false;
  const q = f.query.trim().toLowerCase();
  if (!q) return true;
  const num = q.replace(/^(pr\s*)?#?/, '');
  if (/^\d+$/.test(num)) return String(card.number) === num || String(card.prNumber ?? '') === num || card.title.toLowerCase().includes(q);
  return card.title.toLowerCase().includes(q);
}

/** Every column filtered, keeping the order. */
export function filterColumns(cols: BoardColumns, repo: Pick<RepoView, 'issues' | 'pulls'>, f: BoardFilter): BoardColumns {
  if (!f.query.trim() && !f.label && !f.agentId) return cols;
  const out = {} as BoardColumns;
  for (const { key } of COLUMNS) out[key] = cols[key].filter((c) => matchesFilter(c, cardDetail(c, key, repo).labels, f));
  return out;
}

/** The labels on a project's open issues, for the label filter. */
export const repoLabels = (repo: Pick<RepoView, 'issues'>) => [...new Set(repo.issues.flatMap((i) => i.labels))].sort((a, b) => a.localeCompare(b));

/** The agents who can take an issue now: workers who aren't setting up or working (cubefarm's "free"). */
export const freeAgents = (agents: Agent[]) => agents.filter((a) => a.role !== 'ceo' && a.status !== 'working' && a.status !== 'preparing');

/** Initials for an agent's avatar: "Ada Lovelace" → "AL", "Margaret" → "MA". */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}
