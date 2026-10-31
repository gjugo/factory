import { describe, expect, it } from 'vitest';
import { apply, emptyLedger, loadLedger, type LedgerEvent, type LedgerState } from './ledger.ts';
import { DAY_MS } from '../shared/careers.ts';

const R = 'demo-co/pixel-todo';
const at = (h: number, m = 0, day = 4) => new Date(2026, 9, day, h, m).getTime();
const NOON = at(12);

function run(s: LedgerState, ...events: LedgerEvent[]) {
  return events.map((e) => apply(s, e)).at(-1)!;
}

const open = (pr: number, extra: Partial<Extract<LedgerEvent, { kind: 'opened' }>> = {}): LedgerEvent => ({ kind: 'opened', repoId: R, pr, title: `PR ${pr}`, author: 'ada', at: NOON, ...extra });
const qa = (pr: number, pass: boolean, round = 1, t = NOON): LedgerEvent => ({ kind: 'qa', repoId: R, pr, round, pass, tester: 'marple', author: null, at: t });
const merge = (pr: number, t = NOON, author: string | null = null): LedgerEvent => ({ kind: 'merged', repoId: R, pr, title: `PR ${pr}`, author, at: t });

describe('merges', () => {
  it('count only for PRs the ledger watched while they were open, once', () => {
    const s = emptyLedger();
    run(s, { kind: 'hired', agentId: 'ada', at: NOON });
    expect(run(s, merge(1, NOON, 'ada')).changed).toBe(false);
    expect(s.careers.ada.merged).toBe(0);

    run(s, open(2));
    expect(run(s, merge(2)).careers).toEqual(['ada']);
    expect(run(s, merge(2)).changed).toBe(false);
    expect(s.careers.ada.merged).toBe(1);
  });
});

describe('careers', () => {
  it('count opened, merged, QA rounds, first-time passes, streaks, reviews and fix rounds', () => {
    const s = emptyLedger();
    run(s, { kind: 'hired', agentId: 'ada', at: at(9) }, { kind: 'hired', agentId: 'marple', at: at(9) });
    run(s, open(1), qa(1, true), merge(1));
    run(s, open(2), qa(2, true), merge(2));
    run(s, open(3), qa(3, false), { kind: 'fix', repoId: R, pr: 3, key: '1:0', at: NOON }, { kind: 'fix', repoId: R, pr: 3, key: '1:0', at: NOON }, qa(3, true, 2), merge(3));
    run(s, open(4), qa(4, true));
    const ada = s.careers.ada;
    expect(ada).toMatchObject({ since: at(9), opened: 4, merged: 3, firstPass: 3, qaPass: 4, qaFail: 1, fixRounds: 1, run: 1, best: 2 });
    expect(ada.recent.map((r) => r.n)).toEqual([3, 2, 1]);
    expect(s.careers.marple.reviews).toBe(5);
  });

  it('count each verdict, opening and session once', () => {
    const s = emptyLedger();
    run(s, { kind: 'hired', agentId: 'ada', at: NOON }, open(1), open(1), qa(1, true), qa(1, true));
    run(s, { kind: 'session', agentId: 'ada', key: 'ada:1', costUsd: 0.5, turns: 12 }, { kind: 'session', agentId: 'ada', key: 'ada:1', costUsd: 0.5, turns: 12 });
    expect(s.careers.ada).toMatchObject({ opened: 1, qaPass: 1, firstPass: 1, costUsd: 0.5, turns: 12 });
  });

  it('keep the last eight merges and a week of merge times', () => {
    const s = emptyLedger();
    run(s, { kind: 'hired', agentId: 'ada', at: NOON - 20 * DAY_MS });
    for (let n = 1; n <= 10; n++) run(s, open(n), merge(n, NOON - (10 - n) * DAY_MS));
    expect(s.careers.ada.recent.map((r) => r.n)).toEqual([10, 9, 8, 7, 6, 5, 4, 3]);
    expect(s.careers.ada.week).toHaveLength(7);
  });

  it('credit the author the office named when the ledger never saw who opened it', () => {
    const s = emptyLedger();
    run(s, { kind: 'hired', agentId: 'grace', at: NOON }, { kind: 'pr-open', repoId: R, pr: 5, title: 'x', author: null, at: NOON });
    expect(run(s, merge(5, NOON, 'grace')).careers).toEqual(['grace']);
    expect(s.careers.grace.merged).toBe(1);
  });

  it('forget a career when they are let go, and never restart one on a second hire event', () => {
    const s = emptyLedger();
    run(s, { kind: 'hired', agentId: 'ada', at: at(9) }, { kind: 'hired', agentId: 'ada', at: at(11) });
    expect(s.careers.ada.since).toBe(at(9));
    run(s, { kind: 'let-go', agentId: 'ada' });
    expect(s.careers.ada).toBeUndefined();
    // their PR merging later credits nobody, and starts no career for them
    run(s, open(1), merge(1));
    expect(s.careers.ada).toBeUndefined();
  });
});

describe('PR tracks', () => {
  it('drop PRs that left the lists (closed), but not ones too new to be listed yet', () => {
    const s = emptyLedger();
    run(s, open(1, { at: at(9) }), open(2, { at: at(11, 55) }));
    run(s, { kind: 'listed', repoId: R, numbers: [], at: at(12) });
    expect(Object.keys(s.prs)).toEqual([`${R}#2`]);
  });

  it('change nothing when a sync sees the same open PR again', () => {
    const s = emptyLedger();
    const seen = () => run(s, { kind: 'pr-open', repoId: R, pr: 1, title: 't', author: null, at: NOON });
    expect(seen().changed).toBe(true);
    expect(seen().changed).toBe(false);
  });
});

describe('the state file', () => {
  it('round-trips through JSON', () => {
    const s = emptyLedger();
    run(s, { kind: 'hired', agentId: 'ada', at: NOON }, open(1), qa(1, true), merge(1), open(2));
    expect(loadLedger(JSON.parse(JSON.stringify(s)))).toEqual(s);
    expect(loadLedger(undefined)).toEqual(emptyLedger());
    expect(loadLedger({ careers: 'nope', prs: 7 })).toEqual(emptyLedger());
  });

  it('loads an older office ledger, keeping careers and dropping coins, decorations and achievements', () => {
    const old = loadLedger({
      seen: ['merge:x#1'],
      prs: { [`${R}#3`]: { author: 'ada', title: 'Sound', qaPass: 1, first: 'pass', ci: 'green', needsHuman: true, since: NOON } },
      projects: { [R]: { coins: 40, earned: 60, merges: 3, owned: { plant: 1 }, placed: { 'f-ne': 'plant' }, firstPr: { n: 1, title: 'x' }, streak: [] } },
      careers: { ada: { since: NOON, merged: 2, reviews: 1 } },
      achievements: [{ id: 'first-merge', at: NOON, detail: '' }],
      coffees: 4,
      merges: 3,
      clean: 2,
      day: { date: '2026-10-04', merges: 1, qaFails: 0 },
    });
    expect(Object.keys(old).sort()).toEqual(['careers', 'prs', 'seen']);
    expect(old.seen).toEqual(['merge:x#1']);
    expect(old.prs[`${R}#3`]).toEqual({ author: 'ada', title: 'Sound', qaPass: 1, qaFail: 0, first: 'pass', fixRounds: 0, since: NOON });
    expect(old.careers.ada).toMatchObject({ merged: 2, reviews: 1 });
  });

  it('loads a ledger saved before agents were interchangeable, dropping specialties', () => {
    const old = loadLedger({
      prs: { [`${R}#3`]: { author: 'ada', title: 'Sound', specialty: 'audio', qaPass: 1, since: NOON } },
      careers: { ada: { since: NOON, merged: 2, reviews: 1, bySpecialty: { audio: 2 } } },
    });
    expect(old.prs[`${R}#3`]).not.toHaveProperty('specialty');
    expect(old.prs[`${R}#3`]).toMatchObject({ author: 'ada', title: 'Sound', qaPass: 1 });
    expect(old.careers.ada).not.toHaveProperty('bySpecialty');
    expect(old.careers.ada).toMatchObject({ merged: 2, reviews: 1 });
  });
});
