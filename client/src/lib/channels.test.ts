import { describe, expect, it } from 'vitest';
import type { PrPreviewView, PullInfo } from '../../../shared/types';
import { atPath, channelLabel, channelLed, channelPulls, comparePath, currentChannel, newPathSync, onOfficeComputer, prAsPreview, previewSteps, qaBadge, qaShotUrl, reachable, relayPath, viewFromParams } from './channels';

const pull = (number: number, state: PullInfo['state'] = 'OPEN', title = `Change ${number}`) => ({ number, state, title }) as PullInfo;

describe('app viewer channels', () => {
  it('labels a PR channel with its number, title and QA state', () => {
    expect(channelLabel(pull(212, 'OPEN', 'Outside 5'), { status: 'passed' })).toBe('PR #212 · Outside 5 · QA passed');
    expect(channelLabel(pull(7, 'OPEN', 'Fix it'))).toBe('PR #7 · Fix it');
    expect(channelLabel(pull(8, 'OPEN', 'A very long title that goes on and on and on'), { status: 'testing' }, 12)).toBe('PR #8 · A very long… · Testing');
    expect(qaBadge(null)).toBe('');
  });

  it('lists open PRs only, in number order', () => {
    expect(channelPulls([pull(9), pull(3, 'MERGED'), pull(4), pull(5, 'CLOSED')]).map((p) => p.number)).toEqual([4, 9]);
  });

  it('falls back to main once the picked PR is no longer open', () => {
    const pulls = [pull(4), pull(5, 'MERGED')];
    expect(currentChannel(4, pulls)).toBe(4);
    expect(currentChannel(5, pulls)).toBeNull();
    expect(currentChannel(6, pulls)).toBeNull();
    expect(currentChannel(undefined, pulls)).toBeNull();
    expect(currentChannel(null, pulls)).toBeNull();
  });

  it('shows a PR preview like the main one, stopped until it exists', () => {
    expect(prAsPreview(undefined, 12)).toMatchObject({ status: 'stopped', url: null, ref: 'PR #12', pr: 12, logTail: [] });
    const p = { repoId: 'o/r', pr: 12, status: 'running', port: 6401, url: 'http://localhost:6401/', commit: 'abc1234', startedAt: 5, viewedAt: 6, watched: true, error: null, logTail: ['ok'] } as PrPreviewView;
    expect(prAsPreview(p, 12)).toEqual({ status: 'running', port: 6401, url: 'http://localhost:6401/', ref: 'PR #12', pr: 12, commit: 'abc1234', startedAt: 5, error: null, logTail: ['ok'] });
  });

  it('lights a channel by the preview status', () => {
    expect(channelLed('running')).toBe('live');
    expect(channelLed('installing')).toBe('busy');
    expect(channelLed('error')).toBe('bad');
    expect(channelLed('stopped')).toBe('off');
    expect(channelLed(undefined)).toBe('off');
  });
});

describe('the stage', () => {
  it('walks the steps from check-out to start', () => {
    const states = (s: Parameters<typeof previewSteps>[0]) => previewSteps(s).map((x) => x.state);
    expect(previewSteps('preparing').map((x) => x.label)).toEqual(['Check out the code', 'Install dependencies', 'Start the app']);
    expect(states('preparing')).toEqual(['now', 'todo', 'todo']);
    expect(states('installing')).toEqual(['done', 'now', 'todo']);
    expect(states('starting')).toEqual(['done', 'done', 'now']);
    expect(states('running')).toEqual(['done', 'done', 'done']);
    expect(states('stopped')).toEqual(['todo', 'todo', 'todo']);
  });

  it('reads ?pr= and ?compare= from the URL', () => {
    const view = (q: string) => viewFromParams(new URLSearchParams(q));
    expect(view('')).toEqual({ pr: null, compare: false });
    expect(view('pr=7')).toEqual({ pr: 7, compare: false });
    expect(view('compare=7')).toEqual({ pr: 7, compare: true });
    expect(view('pr=3&compare=7')).toEqual({ pr: 7, compare: true });
    for (const bad of ['pr=x', 'pr=0', 'pr=-2', 'pr=1.5', 'compare=']) expect(view(bad)).toEqual({ pr: null, compare: false });
  });
});

describe('compare paths and QA screenshots', () => {
  it('loads the same path in both frames', () => {
    expect(comparePath('about')).toBe('/about');
    expect(comparePath(' /todos?x=1#top ')).toBe('/todos?x=1#top');
    expect(comparePath('http://localhost:6401/about')).toBe('/about');
    expect(comparePath('')).toBe('/');
    expect(atPath('http://localhost:6301/', '/about')).toBe('http://localhost:6301/about');
    expect(atPath('http://localhost:51234', 'x')).toBe('http://localhost:51234/x');
  });

  it("opens a preview as it is on the office's computer, and through the office anywhere else", () => {
    const home = { hostname: 'localhost', origin: 'http://localhost:4317' };
    const tablet = { hostname: 'office-pc.tailnet.ts.net', origin: 'https://office-pc.tailnet.ts.net' };
    expect(onOfficeComputer(home)).toBe(true);
    expect(onOfficeComputer({ hostname: '127.0.0.1' })).toBe(true);
    expect(onOfficeComputer({ hostname: '[::1]' })).toBe(true);
    expect(onOfficeComputer(tablet)).toBe(false);
    expect(onOfficeComputer({ hostname: '192.168.1.20' })).toBe(false);
    expect(reachable('http://localhost:6301/', home)).toBe('http://localhost:6301/');
    expect(reachable('http://localhost:6301/', tablet)).toBe('https://office-pc.tailnet.ts.net/preview/6301/');
    expect(reachable('http://localhost:51234', tablet)).toBe('https://office-pc.tailnet.ts.net/preview/51234/');
    expect(atPath(reachable('http://localhost:51234', tablet), '/about')).toBe('https://office-pc.tailnet.ts.net/preview/51234/about');
    expect(reachable('https://example.com/app', tablet)).toBe('https://example.com/app');
  });

  it("serves a screenshot by the PR's repo, number and index", () => {
    expect(qaShotUrl('acme/app', 4, 0, 99)).toBe('/api/repos/acme%2Fapp/pulls/4/qa-shots/0?v=99');
  });
});

describe("compare mode's path sync", () => {
  it('sends the other side along when one navigates, but not the echo', () => {
    const s = newPathSync();
    expect(relayPath(s, 'main', '/', 0)).toBe(true); // main loaded first: the PR side follows
    expect(relayPath(s, 'pr', '/', 10)).toBe(false); // the PR side arriving there
    expect(relayPath(s, 'pr', '/about', 500)).toBe(true); // a click on the PR side, right after
    expect(relayPath(s, 'main', '/about', 600)).toBe(false); // main following
    expect(relayPath(s, 'main', '/', 5000)).toBe(true); // and back
  });

  it("doesn't send a side where it already is", () => {
    const s = newPathSync();
    s.at.pr = '/x';
    expect(relayPath(s, 'main', '/x', 0)).toBe(false);
  });

  it('gives up on two apps redirecting each other around', () => {
    const s = newPathSync();
    const sent = ['/a', '/b', '/c', '/d', '/e', '/f'].map((p, i) => relayPath(s, i % 2 ? 'pr' : 'main', p, i * 100));
    expect(sent).toEqual([true, true, true, true, false, false]);
    expect(relayPath(s, 'main', '/g', 5000)).toBe(true);
  });
});
