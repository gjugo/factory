import { useState } from 'react';
import { SendHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MicButton, MicStatus } from '@/components/voice/mic-button';
import { api } from '@/api';
import { canMessage, isBusyStatus } from '@/lib/agents';
import type { Agent } from '@/store';

// Text for an agent: told to them while they work, or a follow-up that resumes their session. Enter sends,
// Shift+Enter adds a line; the mic talks instead of typing (voice/mic.ts).

export function MessageBox({ agent }: { agent: Agent }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const can = canMessage(agent);
  const working = isBusyStatus(agent.status);
  const placeholder =
    agent.role === 'ceo'
      ? `Message ${agent.name}…`
      : working
        ? `Tell ${agent.name} something while they work${agent.terminal ? ' (typed into their terminal)' : ''}…`
        : can
          ? `Ask ${agent.name} for a follow-up (resumes their session)…`
          : `Give ${agent.name} an issue or a PR to test to get them started`;

  const send = async (said?: string) => {
    const body = (said ?? text).trim();
    if (!body || busy) return;
    setBusy(true);
    try {
      await api.message(agent.id, body);
      setText('');
    } catch {
      // api() already toasted why; the text stays to try again
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      className="grid gap-1"
      onSubmit={(e) => {
        e.preventDefault();
        void send();
      }}
    >
      <MicStatus kind="agent" />
      <div className="flex items-end gap-2">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              void send();
            }
          }}
          aria-label={`Message ${agent.name}`}
          placeholder={placeholder}
          disabled={!can}
          rows={1}
          className="max-h-40 min-h-10 resize-none"
        />
        <MicButton kind="agent" value={text} onChange={setText} onSend={(t) => void send(t)} disabled={!can || busy} />
        <Button type="submit" disabled={busy || !can || !text.trim()}>
          <SendHorizontal /> <span className="hidden sm:inline">Send</span>
        </Button>
      </div>
    </form>
  );
}
