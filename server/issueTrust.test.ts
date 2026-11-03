import { describe, expect, it } from 'vitest';
import { createDemoBackend } from './demo.ts';
import { Swarm } from './swarm.ts';

// Only issues from trusted authors start on their own: the demo's pixel-todo has one filed by a stranger (#7).
type Internals = {
  ensureCeo(interrupted: unknown[]): void;
  user: string | null;
  readyIssues(repo: { id: string }): { issue: { number: number } }[];
  companyStatus(): string;
};

const STRANGER = 7;

async function office() {
  const swarm = new Swarm(createDemoBackend());
  const repo = await swarm.connectRepo('demo-co/pixel-todo');
  const internals = swarm as unknown as Internals;
  internals.user = 'demo-manager';
  internals.ensureCeo([]);
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
    expect(view().untrusted).toEqual([STRANGER]);
    const status = internals.companyStatus();
    expect(status).toContain("filed by @drive-by-stranger, who isn't a trusted author");
    expect(status).not.toContain('crypto tip jar'); // the stranger's own words stay out of the CEO's prompt
  });

  it('start once their author is trusted in settings', async () => {
    const { swarm, ready, view } = await office();
    swarm.updateSettings({ trustedAuthors: ['@Drive-By-Stranger'] });
    expect(swarm.snapshot().settings.trustedAuthors).toEqual(['Drive-By-Stranger']);
    expect(ready()).toContain(STRANGER);
    expect(view().untrusted).toEqual([]);
  });

  it('start once the issue has the approved label', async () => {
    const backend = createDemoBackend();
    const { swarm, repo, ready } = await office();
    await backend.editIssue(repo.fullName, STRANGER, { addLabels: ['swarm:approved'] });
    await swarm.syncRepo(repo.id);
    expect(ready()).toContain(STRANGER);
    await backend.editIssue(repo.fullName, STRANGER, { removeLabels: ['swarm:approved'] });
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
