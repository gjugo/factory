import { describe, expect, it } from 'vitest';
import { CEO_ID } from '../../../shared/types';
import { links, parseAgentTab, parseCard, repoIdFrom } from './links';

describe('links', () => {
  it('builds every page', () => {
    expect(links.overview()).toBe('/');
    expect(links.projects()).toBe('/projects');
    expect(links.addProject()).toBe('/projects?add=1');
    expect(links.board('acme/web')).toBe('/projects/acme/web');
    expect(links.projectSettings('acme/web')).toBe('/projects/acme/web/settings');
    expect(links.app('acme/web')).toBe('/projects/acme/web/app');
    expect(links.agents()).toBe('/agents');
    expect(links.agent(CEO_ID)).toBe(`/agents/${CEO_ID}`);
    expect(links.ceo()).toBe('/ceo');
    expect(links.settings()).toBe('/settings');
  });

  it('opens an agent on a tab, and the terminal grid', () => {
    expect(links.agent('a1', 'terminal')).toBe('/agents/a1');
    expect(links.agent('a1', 'prompt')).toBe('/agents/a1?tab=prompt');
    expect(links.agentsGrid()).toBe('/agents?view=grid');
    expect(links.agentsGrid(['a1', 'b 2'])).toBe('/agents?view=grid&ids=a1,b%202');
    expect(parseAgentTab('screen')).toBe('screen');
    expect(parseAgentTab('nope')).toBe('terminal');
    expect(parseAgentTab(null)).toBe('terminal');
  });

  it('opens a card on the board', () => {
    expect(links.board('acme/web', { kind: 'issue', number: 12 })).toBe('/projects/acme/web?card=issue-12');
    expect(links.board('acme/web', { kind: 'pr', number: 34 })).toBe('/projects/acme/web?card=pr-34');
  });

  it('opens the app viewer on main, a PR, or a PR beside main', () => {
    expect(links.app('acme/web', { pr: null })).toBe('/projects/acme/web/app');
    expect(links.app('acme/web', { pr: 7 })).toBe('/projects/acme/web/app?pr=7');
    expect(links.app('acme/web', { pr: 7, compare: true })).toBe('/projects/acme/web/app?compare=7');
    expect(links.app('acme/web', { compare: true })).toBe('/projects/acme/web/app');
  });

  it('encodes what a path cannot hold', () => {
    expect(links.board('my org/a#b')).toBe('/projects/my%20org/a%23b');
    expect(links.agent('a/b')).toBe('/agents/a%2Fb');
  });
});

describe('parseCard and repoIdFrom', () => {
  it('read a card back, and nothing else', () => {
    expect(parseCard('issue-12')).toEqual({ kind: 'issue', number: 12 });
    expect(parseCard('pr-34')).toEqual({ kind: 'pr', number: 34 });
    for (const bad of [null, '', 'pr-', 'pull-3', 'issue-1x']) expect(parseCard(bad)).toBeNull();
  });

  it('turn route params into a repo id', () => {
    expect(repoIdFrom({ owner: 'acme', name: 'web' })).toBe('acme/web');
    expect(repoIdFrom({ owner: 'acme' })).toBeNull();
  });
});
