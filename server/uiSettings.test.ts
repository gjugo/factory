import fs from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { STATE_FILE } from './config.ts';
import { createDemoBackend } from './demo.ts';
import { Swarm } from './swarm.ts';

// The dashboard's theme is an office setting (shared/ui.ts): it is saved in the state file, so every browser gets it.
describe('the ui settings', () => {
  it('default to the system theme, take a valid patch and refuse a bad theme', () => {
    const swarm = new Swarm(createDemoBackend());
    expect(swarm.snapshot().settings.ui).toEqual({ theme: 'system', sidebarCollapsed: false });
    expect(swarm.updateSettings({ ui: { theme: 'dark', sidebarCollapsed: true } }).ui).toEqual({ theme: 'dark', sidebarCollapsed: true });
    expect(() => swarm.updateSettings({ ui: { theme: 'neon' } as never })).toThrow(/theme must be one of/);
    expect(() => swarm.updateSettings({ ui: 'dark' as never })).toThrow(/ui must be an object/);
    expect(swarm.snapshot().settings.ui.theme).toBe('dark');
  });

  it('come back from the state file', async () => {
    const swarm = new Swarm(createDemoBackend());
    swarm.updateSettings({ ui: { theme: 'light', sidebarCollapsed: false } });
    await (swarm as unknown as { writeState(): Promise<void> }).writeState();
    expect(JSON.parse(await fs.readFile(STATE_FILE, 'utf8')).settings.ui).toEqual({ theme: 'light', sidebarCollapsed: false });
    const again = new Swarm(createDemoBackend());
    await again.init();
    expect(again.snapshot().settings.ui.theme).toBe('light');
  });
});
