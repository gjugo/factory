import { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import type { TermClientMessage, TermServerMessage } from '../../../../shared/types';
import { confirmDialog } from '@/components/shared/confirm-dialog';
import { StatusDot } from '@/components/shared/status-badge';
import { cn } from '@/lib/utils';
import { DARK_THEME, LIGHT_THEME, useIsDark } from './terminal-theme';

// An agent's real terminal: their CLI's screen streamed from the office (/ws/term), and what you type sent back to it.
// Opening it late shows everything so far (the office keeps each agent's screen and scrollback). Every viewer's
// resize goes to the CLI, and the others follow its size. Esc goes to the CLI, where it interrupts the session: the
// first time, the dashboard asks. Shift+Esc leaves the terminal, so Tab can move on from it.

const ESC_OK_KEY = 'factory:terminal-esc-ok';

function escConfirmed(): boolean {
  try {
    return localStorage.getItem(ESC_OK_KEY) === '1';
  } catch {
    return false;
  }
}

async function confirmEsc(name: string): Promise<boolean> {
  const ok = await confirmDialog({
    title: `Interrupt ${name}?`,
    body: `Esc in the terminal goes to ${name}'s coding agent and stops what it's doing, like pressing Esc in Claude Code. Type in the terminal to carry on afterwards. You won't be asked again. Shift+Esc leaves the terminal instead.`,
    confirm: 'Send Esc',
  });
  if (ok) {
    try {
      localStorage.setItem(ESC_OK_KEY, '1');
    } catch {
      // private mode: asked again next time
    }
  }
  return ok;
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Shift+Esc: focus moves to whatever comes after the terminal (the message box, the next panel), out of xterm's Tab. */
function focusAfter(el: HTMLElement) {
  const next = [...document.querySelectorAll<HTMLElement>(FOCUSABLE)].find((x) => !el.contains(x) && el.compareDocumentPosition(x) & Node.DOCUMENT_POSITION_FOLLOWING && x.offsetParent !== null);
  if (next) next.focus();
  else el.focus();
}

export function LiveTerminal({ agentId, name, compact = false, className }: { agentId: string; name: string; compact?: boolean; className?: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const nameRef = useRef(name);
  nameRef.current = name;
  const [live, setLive] = useState(false);
  const [connected, setConnected] = useState(true);
  const [focused, setFocused] = useState(false);
  const dark = useIsDark();

  useEffect(() => {
    const el = host.current!;
    const term = new Terminal({
      fontFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
      fontSize: compact ? 12 : 13,
      cursorBlink: true,
      cursorInactiveStyle: 'none',
      scrollback: 5000,
      allowProposedApi: true,
      scrollOnEraseInDisplay: true,
      theme: document.documentElement.classList.contains('dark') ? DARK_THEME : LIGHT_THEME,
      // Coloured output is nudged until it reads at 4.5:1 on the terminal's background (WCAG AA).
      minimumContrastRatio: 4.5,
    });
    termRef.current = term;
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.loadAddon(new WebLinksAddon((_e, uri) => window.open(uri, '_blank', 'noopener')));
    term.open(el);

    let ws: WebSocket | null = null;
    let closed = false;
    let ready = false; // the snapshot is on screen: sizes we send now describe what the viewer sees
    let retry: number | undefined;
    let frame = 0;
    const send = (m: TermClientMessage) => {
      if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(m));
    };
    const fitAndTell = () => {
      try {
        fit.fit();
      } catch {
        return; // not laid out yet
      }
      if (ready) send({ t: 'resize', cols: term.cols, rows: term.rows });
    };
    const connect = () => {
      const proto = location.protocol === 'https:' ? 'wss' : 'ws';
      const socket = new WebSocket(`${proto}://${location.host}/ws/term?agent=${encodeURIComponent(agentId)}`);
      ws = socket;
      socket.onopen = () => setConnected(true);
      socket.onmessage = (e) => {
        const m = JSON.parse(String(e.data)) as TermServerMessage;
        if (m.t === 'snapshot') {
          // Replayed at the size it was drawn at, then fitted to this viewer (the CLI redraws for the new size).
          ready = false;
          term.reset();
          term.resize(m.cols, m.rows);
          term.write(m.data, () => {
            ready = true;
            fitAndTell();
            term.scrollToBottom();
          });
          setLive(m.live);
        } else if (m.t === 'data') term.write(m.data);
        else if (m.t === 'size' && (m.cols !== term.cols || m.rows !== term.rows)) term.resize(m.cols, m.rows);
        else if (m.t === 'live') setLive(m.live);
      };
      socket.onclose = (e) => {
        if (ws === socket) ws = null;
        if (closed) return;
        setConnected(false);
        if (e.code !== 4404) retry = window.setTimeout(connect, 1500);
      };
    };
    connect();

    const input = term.onData((data) => send({ t: 'input', data }));
    term.attachCustomKeyEventHandler((e) => {
      if (e.key !== 'Escape') return true;
      if (e.shiftKey) {
        if (e.type === 'keydown' && wrap.current) focusAfter(wrap.current);
        return false;
      }
      if (escConfirmed()) return true;
      if (e.type === 'keydown') {
        void confirmEsc(nameRef.current).then((ok) => {
          if (ok) send({ t: 'input', data: '\x1b' });
          term.focus();
        });
      }
      return false;
    });
    // Esc belongs to the terminal (above) while you're in it, not to a sheet or dialog around it.
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') e.stopPropagation();
    };
    el.addEventListener('keydown', onKey);
    const onFocus = () => setFocused(true);
    const onBlur = () => setFocused(false);
    term.textarea?.addEventListener('focus', onFocus);
    term.textarea?.addEventListener('blur', onBlur);
    term.textarea?.setAttribute('aria-label', `${nameRef.current}'s terminal input`);
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(fitAndTell);
    });
    ro.observe(el);
    void document.fonts?.ready.then(() => !closed && fitAndTell());

    return () => {
      closed = true;
      clearTimeout(retry);
      cancelAnimationFrame(frame);
      ro.disconnect();
      input.dispose();
      el.removeEventListener('keydown', onKey);
      term.textarea?.removeEventListener('focus', onFocus);
      term.textarea?.removeEventListener('blur', onBlur);
      ws?.close();
      term.dispose();
      termRef.current = null;
    };
  }, [agentId, compact]);

  useEffect(() => {
    if (termRef.current) termRef.current.options.theme = dark ? DARK_THEME : LIGHT_THEME;
  }, [dark]);

  const hint = !connected
    ? 'Reconnecting…'
    : !live
      ? 'Not running · a message picks the session back up'
      : focused
        ? 'Typing goes to the agent · Esc interrupts · Shift+Esc leaves the terminal'
        : 'Live · click or Tab into the terminal to type';
  return (
    <div
      ref={wrap}
      tabIndex={-1}
      role="group"
      aria-label={`${name}'s terminal`}
      className={cn('flex min-h-0 flex-col overflow-hidden rounded-md border bg-background outline-none focus-visible:ring-2 focus-visible:ring-ring', className)}
    >
      <div ref={host} className={cn('min-h-0 min-w-0 flex-1 bg-background', compact ? 'p-1.5' : 'p-2')} />
      <div className="flex min-w-0 items-center gap-2 border-t bg-muted/40 px-2 py-1 text-xs text-muted-foreground" aria-live="polite">
        <StatusDot tone={!connected ? 'warning' : live ? 'success' : 'neutral'} label={!connected ? 'Reconnecting' : live ? 'Live' : 'Not live'} />
        <span className="truncate">{hint}</span>
      </div>
    </div>
  );
}
