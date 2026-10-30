import { MessagesSquare } from 'lucide-react';
import { useEffect } from 'react';
import { CEO_ID } from '../../../../shared/types';
import { EmptyState } from '@/components/shared/empty-state';
import { Markdown } from '@/components/shared/markdown';
import { RelativeTime } from '@/components/shared/relative-time';
import { ScrollArea } from '@/components/ui/scroll-area';
import { api } from '@/api';
import { useWatchAgents } from '@/hooks/use-watch';
import { useStore } from '@/store';

// The CEO chat, as the top bar's sheet and the CEO page show it. A placeholder for now: the CEO's latest messages,
// read-only; the CEO screen's issue brings the conversation, proposals and the composer.

export function CeoChatPanel() {
  useWatchAgents([CEO_ID]);
  const messages = useStore((s) => s.messages);
  const readAt = useStore((s) => s.phoneReadAt);
  const latest = messages.length ? messages[messages.length - 1].at : 0;

  // Shown is read: the unread badge clears, in every tab.
  useEffect(() => {
    if (latest > readAt) void api.phoneRead(latest).catch(() => undefined);
  }, [latest, readAt]);

  const recent = messages.slice(-30);
  if (!recent.length) return <EmptyState icon={MessagesSquare} title="No messages yet" description="The CEO's messages to you show up here." className="m-4" />;
  return (
    <ScrollArea className="min-h-0 flex-1">
      <ol className="space-y-3 p-4" aria-label="CEO messages">
        {recent.map((m) => (
          <li key={m.id} className={m.from !== 'manager' ? 'rounded-lg bg-muted p-3' : 'ml-8 rounded-lg border p-3'}>
            <div className="mb-1 flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span className="font-medium">{m.from === 'ceo' ? 'CEO' : m.from === 'office' ? 'Office' : 'You'}</span>
              <RelativeTime at={m.at} />
            </div>
            <Markdown text={m.text} />
          </li>
        ))}
      </ol>
    </ScrollArea>
  );
}
