// The dashboard's own preferences (the theme, the sidebar, the voice's volume). They are office settings, saved with the rest in
// <SWARM_HOME>/state.json, so a fresh browser gets them too; the client keeps a copy in localStorage only to paint the
// first frame in the right theme.

export type UiTheme = 'light' | 'dark' | 'system';

export interface UiSettings {
  theme: UiTheme;
  /** The desktop sidebar is folded down to its icons. */
  sidebarCollapsed: boolean;
  /** How loud messages read aloud play, 0-100 (Settings → Voice). */
  voiceVolume: number;
}

export const UI_THEMES: readonly UiTheme[] = ['light', 'dark', 'system'];

export const DEFAULT_UI: UiSettings = { theme: 'system', sidebarCollapsed: false, voiceVolume: 80 };

/** `base` with what `patch` sets validly; anything else (a bad theme, a non-boolean) keeps `base`'s value. */
export function uiSettings(base: UiSettings, patch: unknown): UiSettings {
  const p = (patch && typeof patch === 'object' ? patch : {}) as Partial<Record<keyof UiSettings, unknown>>;
  const out: UiSettings = { ...base };
  if (UI_THEMES.includes(p.theme as UiTheme)) out.theme = p.theme as UiTheme;
  if (typeof p.sidebarCollapsed === 'boolean') out.sidebarCollapsed = p.sidebarCollapsed;
  if (typeof p.voiceVolume === 'number' && Number.isFinite(p.voiceVolume)) out.voiceVolume = Math.round(Math.min(100, Math.max(0, p.voiceVolume)));
  return out;
}
