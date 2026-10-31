import { describe, expect, it } from 'vitest';
import { DEFAULT_UI, uiSettings } from './ui.ts';

describe('uiSettings', () => {
  it('starts from the defaults for an office saved before the field existed', () => {
    expect(uiSettings(DEFAULT_UI, undefined)).toEqual({ theme: 'system', sidebarCollapsed: false, voiceVolume: 80 });
  });

  it('takes a valid theme and sidebar state', () => {
    expect(uiSettings(DEFAULT_UI, { theme: 'dark', sidebarCollapsed: true })).toEqual({ theme: 'dark', sidebarCollapsed: true, voiceVolume: 80 });
    expect(uiSettings({ ...DEFAULT_UI, theme: 'dark', sidebarCollapsed: true }, { theme: 'light' })).toEqual({ theme: 'light', sidebarCollapsed: true, voiceVolume: 80 });
  });

  it('ignores values it does not know, keeping what was there', () => {
    const base = { theme: 'dark' as const, sidebarCollapsed: true, voiceVolume: 40 };
    expect(uiSettings(base, { theme: 'neon', sidebarCollapsed: 'yes', voiceVolume: 'loud' })).toEqual(base);
    expect(uiSettings(base, { voiceVolume: Number.NaN })).toEqual(base);
    expect(uiSettings(base, null)).toEqual(base);
    expect(uiSettings(base, 'dark')).toEqual(base);
  });

  it('keeps the voice volume a whole number from 0 to 100', () => {
    expect(uiSettings(DEFAULT_UI, { voiceVolume: 33.6 }).voiceVolume).toBe(34);
    expect(uiSettings(DEFAULT_UI, { voiceVolume: 250 }).voiceVolume).toBe(100);
    expect(uiSettings(DEFAULT_UI, { voiceVolume: -5 }).voiceVolume).toBe(0);
  });
});
