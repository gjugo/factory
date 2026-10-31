import { describe, expect, it } from 'vitest';
import { CEO_ID } from '../../../shared/types';
import { links, parseCard, repoIdFrom } from './links';

describe('links', () => {
  it('builds every page', () => {
    expect(links.overview()).toBe('/');
    expect(links.projects()).toBe('/projects');
    expect(links.addProject()).toBe('/projects?add=1');
    expect(links.board('acme/web')).toBe('/projects/acme/web');
    expect(links.projectSettings('acme/web')).toBe('/projects/acme/web/settings');
    expect(links.agents()).toBe('/agents');
    expect(links.agent(CEO_ID)).toBe(`/agents/${CEO_ID}`);
    expect(links.ceo()).toBe('/ceo');
    expect(links.settings()).toBe('/settings');
    expect(links.timelapse()).toBe('/timelapse');
  });

  it('opens a card on the board', () => {
    expect(links.board('acme/web', { kind: 'issue', number: 12 })).toBe('/projects/acme/web?card=issue-12');
    expect(links.board('acme/web', { kind: 'pr', number: 34 })).toBe('/projects/acme/web?card=pr-34');
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
