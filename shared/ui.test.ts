import { describe, expect, it } from 'vitest';
import { DEFAULT_UI, uiSettings } from './ui.ts';

describe('uiSettings', () => {
  it('starts from the defaults for an office saved before the field existed', () => {
    expect(uiSettings(DEFAULT_UI, undefined)).toEqual({ theme: 'system', sidebarCollapsed: false });
  });

  it('takes a valid theme and sidebar state', () => {
    expect(uiSettings(DEFAULT_UI, { theme: 'dark', sidebarCollapsed: true })).toEqual({ theme: 'dark', sidebarCollapsed: true });
    expect(uiSettings({ theme: 'dark', sidebarCollapsed: true }, { theme: 'light' })).toEqual({ theme: 'light', sidebarCollapsed: true });
  });

  it('ignores values it does not know, keeping what was there', () => {
    const base = { theme: 'dark' as const, sidebarCollapsed: true };
    expect(uiSettings(base, { theme: 'neon', sidebarCollapsed: 'yes' })).toEqual(base);
    expect(uiSettings(base, null)).toEqual(base);
    expect(uiSettings(base, 'dark')).toEqual(base);
  });
});
