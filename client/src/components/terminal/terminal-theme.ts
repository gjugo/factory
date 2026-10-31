import { useSyncExternalStore } from 'react';
import type { ITheme } from '@xterm/xterm';

// The terminal's colours in each theme. xterm draws on its own and needs concrete colours for the 16 ANSI slots, so
// these are the one place the dashboard spells colours out; the background and text match the app's background in each
// theme. minimumContrastRatio (live-terminal.tsx) nudges anything that would read below 4.5:1.

export const DARK_THEME: ITheme = {
  background: '#0a0a0a',
  foreground: '#ededed',
  cursor: '#ededed',
  cursorAccent: '#0a0a0a',
  selectionBackground: '#3f3f46',
  black: '#27272a',
  red: '#f87171',
  green: '#4ade80',
  yellow: '#facc15',
  blue: '#60a5fa',
  magenta: '#e879f9',
  cyan: '#22d3ee',
  white: '#e4e4e7',
  brightBlack: '#71717a',
  brightRed: '#fca5a5',
  brightGreen: '#86efac',
  brightYellow: '#fde047',
  brightBlue: '#93c5fd',
  brightMagenta: '#f0abfc',
  brightCyan: '#67e8f9',
  brightWhite: '#fafafa',
};

export const LIGHT_THEME: ITheme = {
  background: '#ffffff',
  foreground: '#18181b',
  cursor: '#18181b',
  cursorAccent: '#ffffff',
  selectionBackground: '#bfdbfe',
  black: '#18181b',
  red: '#b91c1c',
  green: '#15803d',
  yellow: '#a16207',
  blue: '#1d4ed8',
  magenta: '#a21caf',
  cyan: '#0e7490',
  white: '#71717a',
  brightBlack: '#52525b',
  brightRed: '#dc2626',
  brightGreen: '#16a34a',
  brightYellow: '#ca8a04',
  brightBlue: '#2563eb',
  brightMagenta: '#c026d3',
  brightCyan: '#0891b2',
  brightWhite: '#27272a',
};

function subscribe(cb: () => void) {
  const obs = new MutationObserver(cb);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  return () => obs.disconnect();
}

/** Whether the dashboard is showing dark (<html class="dark">, kept by lib/theme.ts). */
export function useIsDark(): boolean {
  return useSyncExternalStore(subscribe, () => document.documentElement.classList.contains('dark'));
}
