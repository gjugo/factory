import fs from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { STATE_FILE } from './config.ts';
import { createDemoBackend } from './demo.ts';
import { Swarm } from './swarm.ts';

type Internals = { writeState(): Promise<void> };
const readState = async () => JSON.parse(await fs.readFile(STATE_FILE, 'utf8')) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

// The 3D office's life (ping-pong, coins and decorations, weather, the dog, holiday themes) was removed (#24): an office
// whose state file still has it boots, keeps everything else, and drops it on the next save.
describe('a state file from before the office life was removed', () => {
  it('boots with every project, agent, career and setting, and drops the old fields on save', async () => {
    const first = new Swarm(createDemoBackend());
    await first.connectRepo('demo-co/weather-api');
    first.updateSettings({ managerName: 'Sam', maxAgents: 7 });
    await (first as unknown as Internals).writeState();

    const old = await readState();
    const agent = old.agents.find((a: { role: string }) => a.role !== 'ceo');
    const repoId = old.repos[0].id;
    delete old.ledger;
    old.progress = {
      seen: [],
      prs: {},
      floors: { [repoId]: { coins: 40, earned: 60, merges: 3, owned: { plant: 1 }, placed: { 'f-ne': 'plant' }, firstPr: null, streak: [] } },
      careers: { [agent.id]: { since: 1, merged: 5, reviews: 2 } },
      achievements: [{ id: 'first-merge', at: 1, detail: 'PR #1' }],
      coffees: 3,
      merges: 3,
      clean: 1,
      day: { date: '2026-10-04', merges: 1, qaFails: 0 },
    };
    old.pong = { [repoId]: [{ id: 'player', name: 'Sam', wins: 1, losses: 0, pointsFor: 11, pointsAgainst: 4, lastAt: 1 }] };
    Object.assign(old.settings, {
      dogName: 'Rex',
      themes: { mode: 'auto', disabled: [], birthday: null },
      weather: { mode: 'real', place: { name: 'Zagreb', lat: 45.8, lon: 16 } },
      worldEvents: 'often',
    });
    await fs.writeFile(STATE_FILE, JSON.stringify(old));

    const again = new Swarm(createDemoBackend());
    await again.init();
    const snap = again.snapshot() as unknown as Record<string, unknown> & ReturnType<Swarm['snapshot']>;
    expect(snap.repos.map((r) => r.id)).toEqual(old.repos.map((r: { id: string }) => r.id));
    for (const a of old.agents) expect(snap.agents.map((x) => x.id)).toContain(a.id); // and the CEO, who starts at boot
    expect(snap.agents.find((a) => a.id === agent.id)?.career).toMatchObject({ merged: 5, reviews: 2 });
    expect(snap.settings).toMatchObject({ managerName: 'Sam', maxAgents: 7 });
    for (const k of ['pong', 'progress', 'weather', 'visitors']) expect(snap).not.toHaveProperty(k);
    for (const k of ['dogName', 'themes', 'weather', 'worldEvents']) expect(snap.settings).not.toHaveProperty(k);

    await (again as unknown as Internals).writeState();
    const saved = await readState();
    expect(saved).not.toHaveProperty('pong');
    expect(saved).not.toHaveProperty('progress');
    expect(Object.keys(saved.ledger).sort()).toEqual(['careers', 'prs', 'seen']);
    expect(saved.ledger.careers[agent.id]).toMatchObject({ merged: 5, reviews: 2 });
    for (const k of ['dogName', 'themes', 'weather', 'worldEvents']) expect(saved.settings).not.toHaveProperty(k);
    expect(saved.settings.managerName).toBe('Sam');
  });

  it('ignores removed keys in a settings update instead of refusing it', () => {
    const swarm = new Swarm(createDemoBackend());
    const patch = { managerName: 'Alex', dogName: 'Rex', themes: { mode: 'off' }, weather: { mode: 'off' }, worldEvents: 'never' };
    const settings = swarm.updateSettings(patch as never);
    expect(settings.managerName).toBe('Alex');
    for (const k of ['dogName', 'themes', 'weather', 'worldEvents']) expect(settings).not.toHaveProperty(k);
  });
});
