// The office's ledger (#226): every agent's career, derived from what the office already sees (PRs opened, QA
// verdicts, fixes, merges, sessions) and kept in the state file. Pure, and idempotent: an event seen twice changes
// nothing, so the swarm can report what it notices on every sync.
import { newCareer, RECENT_KEEP, WEEK_MS, type CareerView } from '../shared/careers.ts';

/** An open PR the ledger is following, until it merges or goes away. */
export interface PrTrack {
  author: string | null;
  title: string;
  qaPass: number;
  qaFail: number;
  /** Its first QA round's verdict (a PR first seen after round 1 counts as 'fail': not a first-time pass). */
  first: 'pass' | 'fail' | null;
  fixRounds: number;
  /** When the ledger started following it. */
  since: number;
}

export interface LedgerState {
  /** Keys of events already counted (newest last, capped): the same event twice counts once. */
  seen: string[];
  /** `${repoId}#${pr}` -> its track, while it's open. */
  prs: Record<string, PrTrack>;
  careers: Record<string, CareerView>;
}

export type LedgerEvent =
  | { kind: 'hired'; agentId: string; at: number }
  | { kind: 'let-go'; agentId: string }
  /** An open PR on GitHub, as a sync sees it. */
  | { kind: 'pr-open'; repoId: string; pr: number; title: string; author: string | null; at: number }
  /** An agent's session building an issue ended with this PR open. */
  | { kind: 'opened'; repoId: string; pr: number; title: string; author: string; at: number }
  | { kind: 'qa'; repoId: string; pr: number; round: number; pass: boolean; tester: string | null; author: string | null; at: number }
  /** A fix round started; `key` tells rounds apart. */
  | { kind: 'fix'; repoId: string; pr: number; key: string; at: number }
  | { kind: 'merged'; repoId: string; pr: number; title: string; author: string | null; at: number }
  /** A sync's PR lists: tracks of PRs in neither went away (closed), once they're old enough not to be brand new. */
  | { kind: 'listed'; repoId: string; numbers: number[]; at: number }
  | { kind: 'session'; agentId: string; key: string; costUsd: number; turns: number };

/** What an event changed, for the swarm to send on. */
export interface Effects {
  changed: boolean;
  /** Agents whose careers changed. */
  careers: string[];
}

const SEEN_KEEP = 600;
/** A track this new isn't dropped for missing from a sync's lists: that sync may have started before the PR existed. */
const LISTED_GRACE_MS = 10 * 60_000;

export function emptyLedger(): LedgerState {
  return { seen: [], prs: {}, careers: {} };
}

const fx = (): Effects => ({ changed: false, careers: [] });
const prKey = (repoId: string, pr: number) => `${repoId}#${pr}`;
function markSeen(s: LedgerState, key: string) {
  if (s.seen.includes(key)) return false;
  s.seen.push(key);
  if (s.seen.length > SEEN_KEEP) s.seen.splice(0, s.seen.length - SEEN_KEEP);
  return true;
}

/** Someone's career, noted as changed; null for anyone not on the team (let go, or never hired). */
function careerOf(s: LedgerState, agentId: string, out: Effects): CareerView | null {
  const c = s.careers[agentId];
  if (c && !out.careers.includes(agentId)) out.careers.push(agentId);
  return c ?? null;
}

function track(s: LedgerState, repoId: string, pr: number, at: number): PrTrack {
  return (s.prs[prKey(repoId, pr)] ??= { author: null, title: '', qaPass: 0, qaFail: 0, first: null, fixRounds: 0, since: at });
}

/** Apply one thing the office saw. Mutates `s`; the effects say what changed. */
export function apply(s: LedgerState, ev: LedgerEvent): Effects {
  const out = fx();
  switch (ev.kind) {
    case 'hired': {
      if (s.careers[ev.agentId]) break;
      s.careers[ev.agentId] = newCareer(ev.at);
      out.careers.push(ev.agentId);
      out.changed = true;
      break;
    }
    case 'let-go': {
      if (!s.careers[ev.agentId]) break;
      delete s.careers[ev.agentId];
      out.changed = true;
      break;
    }
    case 'pr-open': {
      const key = prKey(ev.repoId, ev.pr);
      const before = JSON.stringify(s.prs[key] ?? null);
      const t = track(s, ev.repoId, ev.pr, ev.at);
      if (ev.title) t.title = ev.title.slice(0, 80);
      t.author ??= ev.author;
      out.changed = JSON.stringify(t) !== before;
      break;
    }
    case 'opened': {
      const t = track(s, ev.repoId, ev.pr, ev.at);
      t.author = ev.author;
      t.title = ev.title.slice(0, 80) || t.title;
      out.changed = true;
      const c = markSeen(s, `open:${prKey(ev.repoId, ev.pr)}`) ? careerOf(s, ev.author, out) : null;
      if (c) c.opened++;
      break;
    }
    case 'qa': {
      if (!markSeen(s, `qa:${prKey(ev.repoId, ev.pr)}:${ev.round}`)) break;
      out.changed = true;
      const t = track(s, ev.repoId, ev.pr, ev.at);
      t.author ??= ev.author;
      if (ev.pass) t.qaPass++;
      else t.qaFail++;
      const first = t.first === null;
      if (first) t.first = ev.pass && ev.round === 1 ? 'pass' : 'fail';
      const c = t.author ? careerOf(s, t.author, out) : null;
      if (c) {
        if (ev.pass) c.qaPass++;
        else c.qaFail++;
        if (first && ev.round === 1) {
          if (ev.pass) {
            c.firstPass++;
            c.run++;
            c.best = Math.max(c.best, c.run);
          } else c.run = 0;
        }
      }
      const tester = ev.tester ? careerOf(s, ev.tester, out) : null;
      if (tester) tester.reviews++;
      break;
    }
    case 'fix': {
      if (!markSeen(s, `fix:${prKey(ev.repoId, ev.pr)}:${ev.key}`)) break;
      track(s, ev.repoId, ev.pr, ev.at).fixRounds++;
      out.changed = true;
      break;
    }
    case 'merged':
      merged(s, ev, out);
      break;
    case 'listed': {
      const keep = new Set(ev.numbers);
      for (const [key, t] of Object.entries(s.prs)) {
        if (!key.startsWith(`${ev.repoId}#`) || keep.has(Number(key.slice(ev.repoId.length + 1)))) continue;
        if (t.since > ev.at - LISTED_GRACE_MS) continue;
        delete s.prs[key];
        out.changed = true;
      }
      break;
    }
    case 'session': {
      const c = markSeen(s, `session:${ev.key}`) ? careerOf(s, ev.agentId, out) : null;
      if (!c) break;
      c.costUsd = Math.round((c.costUsd + Math.max(0, ev.costUsd)) * 1e4) / 1e4;
      c.turns += Math.max(0, Math.round(ev.turns));
      out.changed = true;
      break;
    }
  }
  return out;
}

function merged(s: LedgerState, ev: Extract<LedgerEvent, { kind: 'merged' }>, out: Effects) {
  const key = prKey(ev.repoId, ev.pr);
  const t = s.prs[key];
  // Only PRs the ledger watched while they were open: a merge seen again, or one from before, counts for nothing.
  if (!t || !markSeen(s, `merge:${key}`)) return;
  delete s.prs[key];
  out.changed = true;
  const title = (ev.title || t.title).slice(0, 80);
  const author = t.author ?? ev.author;
  const c = author ? careerOf(s, author, out) : null;
  if (c) {
    c.merged++;
    c.fixRounds += t.fixRounds;
    c.recent = [{ n: ev.pr, title, at: ev.at }, ...c.recent].slice(0, RECENT_KEEP);
    c.week = [...c.week.filter((x) => x > ev.at - WEEK_MS), ev.at].slice(-100);
  }
}

const num = (v: unknown, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {});

/**
 * The ledger from the state file: anything missing or malformed starts empty. What an older office kept here (floors'
 * coins and decorations, achievements, coffees, day counters) is dropped.
 */
export function loadLedger(raw: unknown): LedgerState {
  const r = obj(raw);
  const s = emptyLedger();
  s.seen = Array.isArray(r.seen) ? r.seen.filter((k): k is string => typeof k === 'string').slice(-SEEN_KEEP) : [];
  for (const [key, t] of Object.entries(obj(r.prs))) {
    const x = obj(t);
    s.prs[key] = {
      author: typeof x.author === 'string' ? x.author : null,
      title: typeof x.title === 'string' ? x.title : '',
      qaPass: num(x.qaPass),
      qaFail: num(x.qaFail),
      first: x.first === 'pass' || x.first === 'fail' ? x.first : null,
      fixRounds: num(x.fixRounds),
      since: num(x.since, Date.now()),
    };
  }
  for (const [id, c] of Object.entries(obj(r.careers))) {
    const x = obj(c);
    s.careers[id] = {
      ...newCareer(num(x.since, Date.now())),
      opened: num(x.opened),
      merged: num(x.merged),
      firstPass: num(x.firstPass),
      qaPass: num(x.qaPass),
      qaFail: num(x.qaFail),
      fixRounds: num(x.fixRounds),
      run: num(x.run),
      best: num(x.best),
      reviews: num(x.reviews),
      costUsd: num(x.costUsd),
      turns: num(x.turns),
      recent: (Array.isArray(x.recent) ? x.recent : [])
        .map(obj)
        .filter((m) => typeof m.n === 'number')
        .map((m) => ({ n: m.n as number, title: typeof m.title === 'string' ? m.title : '', at: num(m.at) }))
        .slice(0, RECENT_KEEP),
      week: Array.isArray(x.week) ? x.week.filter((t): t is number => typeof t === 'number') : [],
    };
  }
  return s;
}
