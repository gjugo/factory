import { describe, expect, it } from 'vitest';
import { links } from '../client/src/lib/links.ts';
import { DEFAULT_NOTIFY, noteUrl, notifySettings, officeLink, officeUrl } from './notify.ts';

describe('notification settings', () => {
  it('start with every event but merges on, on every channel', () => {
    expect(notifySettings(DEFAULT_NOTIFY, undefined)).toEqual(DEFAULT_NOTIFY);
    expect(DEFAULT_NOTIFY.events.merge).toBe(false);
    expect(Object.values(DEFAULT_NOTIFY.channels).every(Boolean)).toBe(true);
  });

  it('take a patch field by field and ignore anything else', () => {
    const s = notifySettings(DEFAULT_NOTIFY, { events: { merge: true, ceoMessage: 'yes', bogus: true }, channels: { ntfy: false, slack: true }, officeUrl: ' https://office.tail1234.ts.net ' });
    expect(s.events).toEqual({ ...DEFAULT_NOTIFY.events, merge: true });
    expect(s.channels).toEqual({ ...DEFAULT_NOTIFY.channels, ntfy: false });
    expect(s.officeUrl).toBe('https://office.tail1234.ts.net/');
    expect(notifySettings(s, { officeUrl: 'javascript:alert(1)' }).officeUrl).toBe('https://office.tail1234.ts.net/');
    expect(notifySettings(s, { officeUrl: '' }).officeUrl).toBe('');
    // An older saved state without the newer fields gets their defaults.
    expect(notifySettings(DEFAULT_NOTIFY, { events: { needsHuman: false } }).events.usage).toBe(true);
  });

  it('accept only http(s) office URLs', () => {
    expect(officeUrl('http://localhost:4517')).toBe('http://localhost:4517/');
    expect(officeUrl('ftp://x')).toBeNull();
    expect(officeUrl('not a url')).toBeNull();
    expect(officeUrl(42)).toBeNull();
    expect(officeUrl('  ')).toBe('');
  });

  it('link each note to the page it is about', () => {
    expect(noteUrl('needsHuman', { repoId: 'acme/web app', prNumber: 34 })).toBe('/projects/acme/web%20app?card=pr-34');
    expect(noteUrl('needsHuman', { repoId: 'acme/web' })).toBe('/projects/acme/web');
    expect(noteUrl('needsHuman')).toBe('/');
    expect(noteUrl('ceoMessage')).toBe('/ceo');
    expect(noteUrl('hire', { repoId: 'acme/web' })).toBe('/ceo');
    expect(noteUrl('agentError', { agentId: 'a 1' })).toBe('/agents/a%201');
    expect(noteUrl('agentError')).toBe('/agents');
    expect(noteUrl('usage')).toBe('/');
    expect(noteUrl('merge', { repoId: 'acme/web', prNumber: 3 })).toBe('/projects/acme/web');
    expect(noteUrl('merge')).toBe('/projects');
  });

  it('match the dashboard routes', () => {
    expect(noteUrl('needsHuman', { repoId: 'acme/web', prNumber: 34 })).toBe(links.board('acme/web', { kind: 'pr', number: 34 }));
    expect(noteUrl('merge', { repoId: 'acme/web' })).toBe(links.board('acme/web'));
    expect(noteUrl('agentError', { agentId: 'dev-1' })).toBe(links.agent('dev-1'));
    expect(noteUrl('ceoMessage')).toBe(links.ceo());
  });

  it('put a link on the office address', () => {
    expect(officeLink('', '/ceo')).toBe('');
    expect(officeLink('https://pc.tail1.ts.net/', '/ceo')).toBe('https://pc.tail1.ts.net/ceo');
    expect(officeLink('https://pc.tail1.ts.net/office', '/agents/a')).toBe('https://pc.tail1.ts.net/office/agents/a');
  });
});
