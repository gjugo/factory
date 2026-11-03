import { describe, expect, it } from 'vitest';
import { createDemoBackend } from './demo.ts';
import { Swarm } from './swarm.ts';

// Only issues from trusted authors start on their own. The demo's pixel-todo has two filed by a stranger: #7, and #8 with
// the approved label, which they put on themselves (as an issue template would).
type Internals = {
  ensureCeo(interrupted: unknown[]): void;
  user: string | null;
  readyIssues(repo: { id: string }): { issue: { number: number } }[];
  repoRt: Map<string, { syncing: boolean }>;
  companyStatus(): string;
};

const STRANGER = 7;
const SELF_APPROVED = 8;

async function office(backend = createDemoBackend()) {
  const swarm = new Swarm(backend);
  const repo = await swarm.connectRepo('demo-co/pixel-todo');
  const internals = swarm as unknown as Internals;
  internals.user = 'demo-manager';
  internals.ensureCeo([]);
  // connectRepo's own first sync (before the manager's login was known) runs on; a sync meanwhile would do nothing.
  while (internals.repoRt.get(repo.id)!.syncing) await new Promise((r) => setTimeout(r, 5));
  await swarm.syncRepo(repo.id);
  const ready = () => internals.readyIssues(repo).map((r) => r.issue.number);
  const view = () => swarm.snapshot().repos.find((r) => r.id === repo.id)!;
  return { swarm, repo, internals, ready, view };
}

describe('issues from untrusted authors', () => {
  it("never start on their own, and the board and the CEO's backlog say why", async () => {
    const { internals, ready, view } = await office();
    expect(view().issues.find((i) => i.number === STRANGER)?.author).toBe('drive-by-stranger');
    expect(ready()).not.toContain(STRANGER);
    expect(ready()).toContain(1);
    expect(view().untrusted).toEqual([STRANGER, SELF_APPROVED]);
    const status = internals.companyStatus();
    expect(status).toContain("filed by @drive-by-stranger, who isn't a trusted author");
    expect(status).not.toContain('crypto tip jar'); // the stranger's own words stay out of the CEO's prompt
  });

  it('start once their author is trusted in settings', async () => {
    const { swarm, ready, view } = await office();
    swarm.updateSettings({ trustedAuthors: ['@Drive-By-Stranger'] });
    expect(swarm.snapshot().settings.trustedAuthors).toEqual(['Drive-By-Stranger']);
    expect(ready()).toContain(STRANGER);
    expect(ready()).toContain(SELF_APPROVED);
    expect(view().untrusted).toEqual([]);
  });

  it('start once a trusted author adds the approved label', async () => {
    const backend = createDemoBackend();
    const { swarm, repo, ready } = await office(backend);
    await backend.editIssue(repo.fullName, STRANGER, { addLabels: ['swarm:approved'] }); // through gh: by the manager
    await swarm.syncRepo(repo.id);
    expect(ready()).toContain(STRANGER);
    await backend.editIssue(repo.fullName, STRANGER, { removeLabels: ['swarm:approved'] });
    await swarm.syncRepo(repo.id);
    expect(ready()).not.toContain(STRANGER);
  });

  it("don't start on an approved label anyone else added, and are asked about again on every sync", async () => {
    const backend = createDemoBackend();
    let adder: string | null = 'drive-by-stranger';
    const asked: number[] = [];
    const { swarm, repo, ready, view } = await office({
      ...backend,
      labelAdder: async (_fullName, n) => {
        asked.push(n);
        return adder;
      },
    });
    expect(asked.at(-1)).toBe(SELF_APPROVED);
    expect(new Set(asked)).toEqual(new Set([SELF_APPROVED])); // only the labelled issue from an untrusted author
    expect(ready()).not.toContain(SELF_APPROVED);
    expect(view().untrusted).toContain(SELF_APPROVED);

    adder = 'demo-manager'; // taken off and put back by the manager
    await swarm.syncRepo(repo.id);
    expect(ready()).toContain(SELF_APPROVED);

    adder = null; // a failed or empty read: unapproved again
    await swarm.syncRepo(repo.id);
    expect(ready()).not.toContain(SELF_APPROVED);
  });

  it("all wait while the manager's gh login is unknown", async () => {
    const { internals, ready } = await office();
    internals.user = null;
    expect(ready()).toEqual([]);
  });

  it('refuses a trusted author that is no GitHub login', async () => {
    const { swarm } = await office();
    expect(() => swarm.updateSettings({ trustedAuthors: ['not a login'] as string[] })).toThrow("isn't a GitHub login");
  });
});
