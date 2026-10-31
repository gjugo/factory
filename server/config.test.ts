import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultProjectsDir, demoScale, demoScaleNote, envMinutes, envPort, isLoopback, localAddress, networkUrls } from './config.ts';

let tmp: string;
beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'factory-config-'));
});
afterEach(() => fs.rmSync(tmp, { recursive: true, force: true }));

describe('defaultProjectsDir', () => {
  it('is the folder a checkout sits in', () => {
    expect(defaultProjectsDir(path.join(tmp, 'Projects', 'factory'), tmp)).toBe(path.join(tmp, 'Projects'));
  });

  it('is a projects folder in your home when installed from npm', () => {
    const installed = path.join(tmp, 'npm', 'node_modules', 'factory');
    expect(defaultProjectsDir(installed, tmp)).toBe(path.join(tmp, 'Projects'));
    fs.mkdirSync(path.join(tmp, 'code'));
    expect(defaultProjectsDir(installed, tmp)).toBe(path.join(tmp, 'code'));
  });
});

describe('preview settings from the environment', () => {
  it('takes a usable port and falls back otherwise', () => {
    expect(envPort('7300', 6700)).toBe(7300);
    for (const bad of [undefined, '', 'abc', '80', '70000', '6700.5']) expect(envPort(bad, 6700)).toBe(6700);
  });

  it('takes positive minutes, fractions included', () => {
    expect(envMinutes('0.5', 20)).toBe(0.5);
    for (const bad of [undefined, '', '0', '-3', 'soon']) expect(envMinutes(bad, 20)).toBe(20);
  });
});

describe('listen address', () => {
  it('knows which addresses stay on this machine', () => {
    for (const h of ['127.0.0.1', '127.1.2.3', 'localhost', '::1', '[::1]']) expect(isLoopback(h)).toBe(true);
    for (const h of ['0.0.0.0', '::', '192.168.1.20', 'mini.local']) expect(isLoopback(h)).toBe(false);
  });

  it('reaches the any-address on loopback and one address at itself', () => {
    expect(localAddress('0.0.0.0')).toBe('127.0.0.1');
    expect(localAddress('::')).toBe('127.0.0.1');
    expect(localAddress('127.0.0.1')).toBe('127.0.0.1');
    expect(localAddress('192.168.1.20')).toBe('192.168.1.20');
    expect(localAddress('::1')).toBe('[::1]');
    expect(localAddress('[fe80::1]')).toBe('[fe80::1]');
  });

  it('lists the network addresses only for the any-address', () => {
    const ifaces = {
      lo: [{ address: '127.0.0.1', family: 'IPv4', internal: true }],
      en0: [
        { address: '192.168.1.20', family: 'IPv4', internal: false },
        { address: 'fe80::1', family: 'IPv6', internal: false },
      ],
    } as unknown as ReturnType<typeof os.networkInterfaces>;
    expect(networkUrls('0.0.0.0', 4517, ifaces)).toEqual(['http://192.168.1.20:4517']);
    expect(networkUrls('127.0.0.1', 4517, ifaces)).toEqual([]);
    expect(networkUrls('192.168.1.20', 4517, ifaces)).toEqual([]);
  });
});

describe('demoScale', () => {
  it('is the usual demo without --projects or --agents', () => {
    expect(demoScale(['node', 'server/index.ts', '--demo'], {})).toBeNull();
  });

  it('reads the big company from the command line or the environment, within what the office holds', () => {
    expect(demoScale(['--demo', '--projects', '10', '--agents', '15'], {})).toEqual({ projects: 10, agents: 15 });
    expect(demoScale(['--projects=3'], {})).toEqual({ projects: 3, agents: 6 });
    expect(demoScale([], { SWARM_DEMO_PROJECTS: '4', SWARM_DEMO_AGENTS: '9' })).toEqual({ projects: 4, agents: 9 });
    expect(demoScale(['--projects', '99', '--agents', '40'], {})).toEqual({ projects: 20, agents: 15 });
    expect(demoScale(['--agents', '0'], {})).toEqual({ projects: 2, agents: 1 });
  });

  it('still takes --floors and SWARM_DEMO_FLOORS, the old names, and says they are deprecated', () => {
    expect(demoScale(['--demo', '--floors', '10', '--agents', '15'], {})).toEqual({ projects: 10, agents: 15 });
    expect(demoScale(['--floors=3'], {})).toEqual({ projects: 3, agents: 6 });
    expect(demoScale([], { SWARM_DEMO_FLOORS: '4' })).toEqual({ projects: 4, agents: 6 });
    expect(demoScale(['--projects', '5', '--floors', '9'], {})).toEqual({ projects: 5, agents: 6 });
    expect(demoScaleNote(['--floors', '10'], {})).toBe('--floors is deprecated: use --projects.');
    expect(demoScaleNote([], { SWARM_DEMO_FLOORS: '4' })).toBe('SWARM_DEMO_FLOORS is deprecated: use SWARM_DEMO_PROJECTS.');
    expect(demoScaleNote(['--projects', '10'], { SWARM_DEMO_PROJECTS: '4' })).toBeNull();
  });
});

describe('defaults with nothing set', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("keep everything in ~/.factory on factory's own ports, clear of the cubefarm office's", async () => {
    for (const name of ['SWARM_HOME', 'SWARM_PORT', 'SWARM_PREVIEW_PORT']) vi.stubEnv(name, undefined);
    vi.resetModules();
    const config = await import('./config.ts');
    expect(config.HOME_DIR).toBe(path.join(os.homedir(), '.factory'));
    expect(config.WORKSPACE_ROOT).toBe(path.join(os.homedir(), '.factory', 'workspaces'));
    expect(path.dirname(config.STATE_FILE)).toBe(path.join(os.homedir(), '.factory'));
    expect(config.PORT).toBe(4517);
    expect(config.PREVIEW_PORT).toBe(6700);
  });
});
