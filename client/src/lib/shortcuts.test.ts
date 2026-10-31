import { describe, expect, it } from 'vitest';
import { shortcutFor, SHORTCUT_LIST, type ShortcutKey } from './shortcuts';

const key = (k: string, mods: Partial<ShortcutKey> = {}): ShortcutKey => ({ key: k, ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, ...mods });
const free = { typing: false, dialogOpen: false };

describe('shortcutFor', () => {
  it('maps cubefarm’s global keys', () => {
    expect(shortcutFor(key('p'), free)).toBe('ceo');
    expect(shortcutFor(key('l'), free)).toBe('agents');
    expect(shortcutFor(key('m'), free)).toBe('quiet');
    expect(shortcutFor(key('h'), free)).toBe('help');
    expect(shortcutFor(key('?', { shiftKey: true }), free)).toBe('help');
  });
  it('leaves typing alone', () => {
    expect(shortcutFor(key('p'), { typing: true, dialogOpen: false })).toBeNull();
    expect(shortcutFor(key('?', { shiftKey: true }), { typing: true, dialogOpen: false })).toBeNull();
  });
  it('stays out of the way of an open dialog or sheet', () => {
    expect(shortcutFor(key('l'), { typing: false, dialogOpen: true })).toBeNull();
  });
  it('ignores modified, held and composing keys', () => {
    expect(shortcutFor(key('p', { metaKey: true }), free)).toBeNull();
    expect(shortcutFor(key('p', { ctrlKey: true }), free)).toBeNull();
    expect(shortcutFor(key('p', { altKey: true }), free)).toBeNull();
    expect(shortcutFor(key('P', { shiftKey: true }), free)).toBeNull();
    expect(shortcutFor(key('p', { repeat: true }), free)).toBeNull();
    expect(shortcutFor(key('p', { isComposing: true }), free)).toBeNull();
  });
  it('ignores other keys', () => {
    expect(shortcutFor(key('k'), free)).toBeNull();
    expect(shortcutFor(key('Escape'), free)).toBeNull();
  });
  it('lists every single key it handles', () => {
    const listed = SHORTCUT_LIST.flatMap((s) => s.keys);
    for (const k of ['P', 'L', 'M', '?', 'H']) expect(listed).toContain(k);
  });
});
