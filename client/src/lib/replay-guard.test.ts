import { describe, expect, it, vi } from 'vitest';
import { allowedWhileReplaying, REPLAY_ACTIONS, REPLAY_FREE, REPLAY_TYPING, replayBlocks } from './replay-guard';

vi.mock('sonner', () => ({ toast: { info: vi.fn() } }));

/** An element whose ancestors (itself included) match these of the guard's selectors. */
const el = (...matches: string[]) => ({ closest: (sel: string) => (matches.includes(sel) ? {} : null) });

describe('allowedWhileReplaying', () => {
  it('lets reads through and nothing that changes the office', () => {
    expect(allowedWhileReplaying('GET', '/api/journal/events?from=1&to=2')).toBe(true);
    expect(allowedWhileReplaying('POST', '/api/agents/a1/assign', { issueNumber: 3 })).toBe(false);
    expect(allowedWhileReplaying('DELETE', '/api/repos/acme%2Fapp')).toBe(false);
    expect(allowedWhileReplaying('POST', '/api/journal/sample')).toBe(false);
  });

  it("allows the viewer's own look (theme, sidebar) and no other setting", () => {
    expect(allowedWhileReplaying('PATCH', '/api/settings', { ui: { theme: 'dark' } })).toBe(true);
    expect(allowedWhileReplaying('PATCH', '/api/settings', { ui: { theme: 'dark' }, maxAgents: 9 })).toBe(false);
    expect(allowedWhileReplaying('PATCH', '/api/settings', { autoUpdate: true })).toBe(false);
    expect(allowedWhileReplaying('PATCH', '/api/settings')).toBe(false);
  });
});

describe('replayBlocks', () => {
  it('stops the controls that act and the places where typing acts', () => {
    expect(replayBlocks(el(REPLAY_ACTIONS), 'click')).toBe(true);
    expect(replayBlocks(el(REPLAY_TYPING), 'type')).toBe(true);
  });

  it('lets plain buttons, links and tabs through: the API refuses whatever they would send', () => {
    expect(replayBlocks(el(), 'click')).toBe(false);
    expect(replayBlocks(el(REPLAY_TYPING), 'click')).toBe(false);
    expect(replayBlocks(null, 'click')).toBe(false);
  });

  it('never stops anything in the replay bar, the sidebar, menus or toasts', () => {
    expect(replayBlocks(el(REPLAY_ACTIONS, REPLAY_FREE), 'click')).toBe(false);
    expect(replayBlocks(el(REPLAY_TYPING, REPLAY_FREE), 'type')).toBe(false);
  });
});
