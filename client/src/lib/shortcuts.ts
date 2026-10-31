// The dashboard's single-key shortcuts, cubefarm's global keys without the 3D ones: P the CEO chat (the phone), L who's
// working, M stop reading aloud, ? or H this list. Pure, so it's tested without a keyboard.

export type ShortcutAction = 'ceo' | 'agents' | 'quiet' | 'help';

export interface ShortcutKey {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
  repeat?: boolean;
  isComposing?: boolean;
}

/** Where the key landed: typing into a field or a terminal, or with a dialog or sheet open, shortcuts stay out of the way. */
export interface ShortcutPlace {
  typing: boolean;
  dialogOpen: boolean;
}

const PLAIN: Record<string, ShortcutAction> = { p: 'ceo', l: 'agents', m: 'quiet', h: 'help' };

/** The action a key press asks for, or null when it's ordinary typing (or not one of ours). */
export function shortcutFor(e: ShortcutKey, place: ShortcutPlace): ShortcutAction | null {
  if (place.typing || place.dialogOpen || e.ctrlKey || e.metaKey || e.altKey || e.repeat || e.isComposing) return null;
  if (e.key === '?') return 'help';
  if (e.shiftKey) return null;
  return PLAIN[e.key.toLowerCase()] ?? null;
}

/** Whether an element takes typing: a text field, a select, something editable, or an agent's terminal. */
export function isTypingTarget(el: Element | null): boolean {
  if (!el) return false;
  const tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if ((el as HTMLElement).isContentEditable) return true;
  return !!el.closest('.xterm, [contenteditable="true"]');
}

/** Every key the dashboard knows, for the shortcuts dialog, grouped as it shows them. */
export const SHORTCUT_LIST: { group: string; keys: string[]; label: string }[] = [
  { group: 'Anywhere', keys: ['⌘K', 'Ctrl K'], label: 'Jump to a page, project or agent' },
  { group: 'Anywhere', keys: ['P'], label: 'Open the CEO chat' },
  { group: 'Anywhere', keys: ['L'], label: "Who's working (Agents)" },
  { group: 'Anywhere', keys: ['M'], label: 'Stop reading aloud' },
  { group: 'Anywhere', keys: ['?', 'H'], label: 'This list' },
  { group: 'Messages', keys: ['Enter'], label: 'Send' },
  { group: 'Messages', keys: ['Shift Enter'], label: 'New line' },
  { group: 'Messages', keys: ['V (hold)'], label: 'Talk instead of type, where there is a mic' },
  { group: 'Terminals', keys: ['Esc'], label: 'Interrupt the agent (asks the first time)' },
  { group: 'Terminals', keys: ['Shift Esc'], label: 'Leave the terminal' },
  { group: 'Time-lapse', keys: ['← →'], label: 'Step through the replay' },
  { group: 'Time-lapse', keys: ['Esc'], label: 'Back to live' },
];
