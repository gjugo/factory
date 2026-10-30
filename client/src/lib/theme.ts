import { useEffect, useSyncExternalStore } from 'react';
import { UI_THEMES, type UiTheme } from '../../../shared/ui';
import { api } from '../api';
import { useStore } from '../store';

// Light, dark or the system's: an office setting (settings.ui.theme, saved in ~/.factory), so every browser gets the
// same one. localStorage holds a copy only so the first frame (index.html's inline script) paints in the right theme
// before the snapshot arrives.

export const THEME_CACHE_KEY = 'factory:theme';

const darkQuery = () => (typeof matchMedia === 'undefined' ? null : matchMedia('(prefers-color-scheme: dark)'));

/** Whether a theme shows dark, given what the system prefers. */
export const isDark = (theme: UiTheme, systemDark: boolean) => theme === 'dark' || (theme === 'system' && systemDark);

/** The theme cached for the first paint; 'system' when there's none or it's unreadable. */
export function cachedTheme(): UiTheme {
  try {
    const t = localStorage.getItem(THEME_CACHE_KEY);
    return UI_THEMES.includes(t as UiTheme) ? (t as UiTheme) : 'system';
  } catch {
    return 'system';
  }
}

function paint(theme: UiTheme) {
  document.documentElement.classList.toggle('dark', isDark(theme, darkQuery()?.matches ?? false));
  try {
    localStorage.setItem(THEME_CACHE_KEY, theme);
  } catch {
    // private mode: the next first paint just falls back to the system's
  }
}

function subscribeSystem(cb: () => void) {
  const q = darkQuery();
  q?.addEventListener('change', cb);
  return () => q?.removeEventListener('change', cb);
}

/** Keeps <html class="dark"> in step with the office's theme and, on 'system', with the system's. Mount once. */
export function useApplyTheme() {
  const loaded = useStore((s) => s.loaded);
  const theme = useStore((s) => s.settings.ui?.theme ?? 'system');
  const systemDark = useSyncExternalStore(subscribeSystem, () => darkQuery()?.matches ?? false);
  useEffect(() => {
    // Before the snapshot the store only has defaults: keep what index.html painted from the cache.
    paint(loaded ? theme : cachedTheme());
  }, [loaded, theme, systemDark]);
}

/** The office's theme and a setter that saves it there (shown at once, put back if the office refuses). */
export function useTheme(): [UiTheme, (t: UiTheme) => void] {
  const ui = useStore((s) => s.settings.ui);
  const theme = ui?.theme ?? 'system';
  const set = (next: UiTheme) => {
    const s = useStore.getState();
    const before = s.settings;
    useStore.setState({ settings: { ...before, ui: { ...before.ui, theme: next } } });
    api.updateSettings({ ui: { ...before.ui, theme: next } }).catch(() => useStore.setState({ settings: { ...useStore.getState().settings, ui: before.ui } }));
  };
  return [theme, set];
}
