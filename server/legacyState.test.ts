import fs from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { PREVIEW_PORT, STATE_FILE } from './config.ts';
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

// Floors became projects (#26): an office whose state file says `floor` keeps every project at its number, so its
// preview keeps its port, with its team, settings and history.
describe('a state file from before floors were called projects', () => {
  it('boots with every project at its number and preview port, its team, settings and history, and saves `number`', async () => {
    const first = new Swarm(createDemoBackend());
    await first.connectRepo('demo-co/weather-api', { mission: 'Forecasts for every city' });
    await first.connectRepo('demo-co/pixel-todo');
    first.updateSettings({ managerName: 'Sam', maxAgents: 7, scaling: 'auto' });
    await (first as unknown as Internals).writeState();

    const old = await readState();
    // the old shape, and numbers the office wouldn't hand out today: they must be kept, not recomputed
    for (const [i, r] of old.repos.entries()) {
      delete r.number;
      r.floor = i === 0 ? 2 : 1;
    }
    old.messages = [{ id: 7, from: 'ceo', text: 'Floor 2 looks healthy.', at: 1 }];
    await fs.writeFile(STATE_FILE, JSON.stringify(old));

    const again = new Swarm(createDemoBackend());
    await again.init();
    const snap = again.snapshot();
    const number = (id: string) => snap.repos.find((r) => r.id === id)?.number;
    expect(number('demo-co/weather-api')).toBe(2);
    expect(number('demo-co/pixel-todo')).toBe(1);
    for (const r of snap.repos) {
      expect(r.preview.port).toBe(PREVIEW_PORT + r.number);
      expect(r).not.toHaveProperty('floor');
    }
    expect(snap.repos.find((r) => r.id === 'demo-co/weather-api')?.mission).toBe('Forecasts for every city');
    for (const a of old.agents) expect(snap.agents.find((x) => x.id === a.id)?.repoId).toBe(a.repoId);
    expect(snap.settings).toMatchObject({ managerName: 'Sam', maxAgents: 7, scaling: 'auto' });
    expect(snap.messages.map((m) => m.id)).toEqual([7]);

    await (again as unknown as Internals).writeState();
    const saved = await readState();
    expect(saved.repos.map((r: { id: string; number: number }) => [r.id, r.number])).toEqual(old.repos.map((r: { id: string; floor: number }) => [r.id, r.floor]));
    for (const r of saved.repos) expect(r).not.toHaveProperty('floor');
  });
});
