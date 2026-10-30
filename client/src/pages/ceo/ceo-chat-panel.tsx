import { ArrowDown, Loader2, MessagesSquare, SendHorizontal } from 'lucide-react';
import { Fragment, useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { CEO_ID, type PhoneMessage } from '../../../../shared/types';
import { EmptyState } from '@/components/shared/empty-state';
import { Markdown } from '@/components/shared/markdown';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/api';
import { useWatchAgents } from '@/hooks/use-watch';
import { cn } from '@/lib/utils';
import { useStore } from '@/store';
import { RequestCard } from './request-card';
import { firstUnreadId, followNewMessage, groupByDay, isAtBottom, readMarkFor, unseenCount } from './thread';

// The thread with the CEO and the composer: the top bar's sheet and the CEO page both show it. It follows new
// messages only from the bottom, marks what's on screen read, and offers a jump back down while you read older ones.

const clock = (t: number) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

function useDocumentVisible() {
  const [visible, setVisible] = useState(() => document.visibilityState === 'visible');
  useEffect(() => {
    const on = () => setVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', on);
    return () => document.removeEventListener('visibilitychange', on);
  }, []);
  return visible;
}

function Bubble({ m, ceoName }: { m: PhoneMessage; ceoName: string }) {
  const req = useStore((s) => (m.requestId ? s.requests.find((r) => r.id === m.requestId) : undefined));
  const time = (
    <time dateTime={new Date(m.at).toISOString()} title={new Date(m.at).toLocaleString()} className="text-[11px] text-muted-foreground tabular-nums">
      {clock(m.at)}
    </time>
  );
  if (m.from === 'office') {
    return (
      <li className="flex flex-col items-center gap-1 px-4 text-center">
        <span className="sr-only">Office:</span>
        <Markdown text={m.text} className="max-w-prose rounded-md border border-dashed px-3 py-1.5 text-xs text-muted-foreground" />
        {time}
      </li>
    );
  }
  if (m.from === 'manager') {
    return (
      <li className="flex flex-col items-end gap-1 pl-10">
        <span className="sr-only">You:</span>
        <div className="max-w-full rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-sm break-words whitespace-pre-wrap text-primary-foreground">{m.text}</div>
        {time}
      </li>
    );
  }
  return (
    <li className="flex gap-2 pr-6">
      <Avatar className="mt-0.5 size-7">
        <AvatarFallback className="text-xs">{ceoName.slice(0, 1).toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
        <div className="min-w-0 max-w-full rounded-2xl rounded-tl-sm bg-muted px-3 py-2">
          <div className="mb-0.5 text-xs font-medium">{ceoName}</div>
          {/* Muted quote text on the muted bubble is under 4.5:1 in light mode. */}
          <Markdown text={m.text} className="[&_blockquote]:text-foreground/80" />
        </div>
        {req && <RequestCard req={req} className="w-full" />}
        {time}
      </div>
    </li>
  );
}

export function CeoChatPanel({ className }: { className?: string }) {
  useWatchAgents([CEO_ID]);
  const loaded = useStore((s) => s.loaded);
  const messages = useStore((s) => s.messages);
  const readAt = useStore((s) => s.phoneReadAt);
  const ceo = useStore((s) => s.agents[CEO_ID]);
  const typing = useStore((s) => s.agents[CEO_ID]?.status === 'working' && s.ceo.job?.kind === 'chat');
  const ceoName = ceo?.name ?? 'CEO';
  const visible = useDocumentVisible();
  const id = useId();

  const scroller = useRef<HTMLDivElement>(null);
  const composer = useRef<HTMLTextAreaElement>(null);
  const atBottomRef = useRef(true);
  const sentHere = useRef(false); // a send from this thread is in flight: its message follows to the bottom
  const [atBottom, setAtBottom] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  // The "New" divider stays where it was when the thread opened, even once those messages are read.
  const [dividerAt, setDividerAt] = useState<number | null>(() => (loaded ? readAt : null));
  useEffect(() => {
    if (loaded && dividerAt === null) setDividerAt(readAt);
  }, [loaded, readAt, dividerAt]);

  // A thread on screen: CEO messages are being read, so they don't toast.
  useEffect(() => {
    useStore.getState().watchChat(1);
    return () => useStore.getState().watchChat(-1);
  }, []);

  const scrollToEnd = (smooth = false) => {
    const el = scroller.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
  };
  const onScroll = () => {
    const el = scroller.current;
    if (!el) return;
    const v = isAtBottom(el);
    atBottomRef.current = v;
    setAtBottom(v);
  };

  // Opening the thread starts at its end; a new message (or the CEO starting to type) follows only from there.
  const newest = messages[messages.length - 1];
  useLayoutEffect(() => {
    const own = sentHere.current && newest?.from === 'manager';
    if (followNewMessage(atBottomRef.current, newest, sentHere.current)) scrollToEnd();
    if (own) sentHere.current = false;
  }, [newest?.id, typing, loaded]);

  // The thread's box or content changing size (the sheet sliding in, a resize, Markdown laying out) keeps the end in
  // view when it was there; a scroll event then wouldn't fire, so this is what stops it drifting up.
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const keep = () => {
      if (atBottomRef.current) el.scrollTop = el.scrollHeight;
    };
    const ro = new ResizeObserver(keep);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => ro.disconnect();
  }, [loaded, messages.length === 0]);

  // Seen is read: once the end of the thread is on screen in a visible tab, the badge clears in every tab.
  const sentMark = useRef(0);
  useEffect(() => {
    if (!atBottom || !visible) return;
    const mark = readMarkFor(messages, Math.max(readAt, sentMark.current));
    if (mark === null) return;
    sentMark.current = mark;
    void api.phoneRead(mark).catch(() => undefined);
  }, [atBottom, visible, messages, readAt]);

  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    sentHere.current = true;
    try {
      await api.messageCeo(body);
      setText('');
      setDividerAt(Infinity);
    } catch {
      sentHere.current = false;
      // api() toasted the error; the draft stays for another try
    } finally {
      setSending(false);
      composer.current?.focus();
    }
  };
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void send();
    }
  };
  const jump = () => {
    scrollToEnd(true);
    composer.current?.focus();
  };

  const unseen = unseenCount(messages, readAt);
  const divider = dividerAt === null ? null : firstUnreadId(messages, dividerAt);
  const days = groupByDay(messages, Date.now());

  return (
    <div className={cn('flex min-h-0 flex-1 flex-col', className)}>
      <div className="relative min-h-0 flex-1">
        <div
          ref={scroller}
          onScroll={onScroll}
          role="log"
          aria-label={`Messages with ${ceoName}`}
          tabIndex={0}
          className="absolute inset-0 overflow-x-hidden overflow-y-auto overscroll-contain focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset"
        >
          {loaded && messages.length === 0 ? (
            <EmptyState
              icon={MessagesSquare}
              title={`Say hi to ${ceoName}`}
              description="Ask how things are going, hand over a project brief, or ask whether a team should grow. Replies land here."
              className="m-4"
            />
          ) : (
            <div className="space-y-4 p-4">
              {days.map((d) => (
                <section key={d.key} aria-label={d.label} className="space-y-3">
                  <div className="sticky top-0 z-10 flex justify-center">
                    <span className="rounded-full border bg-background px-2.5 py-0.5 text-xs text-muted-foreground shadow-xs">{d.label}</span>
                  </div>
                  <ol className="space-y-3">
                    {d.messages.map((m) => (
                      <Fragment key={m.id}>
                        {m.id === divider && (
                          <li className="flex items-center gap-2 text-xs font-medium text-primary" aria-label="New messages">
                            <span className="h-px flex-1 bg-primary/40" />
                            New
                            <span className="h-px flex-1 bg-primary/40" />
                          </li>
                        )}
                        <Bubble m={m} ceoName={ceoName} />
                      </Fragment>
                    ))}
                  </ol>
                </section>
              ))}
              {typing && (
                <p className="flex items-center gap-2 text-xs text-muted-foreground" aria-live="polite">
                  <Loader2 className="size-3 animate-spin" aria-hidden />
                  {ceoName} is typing…
                </p>
              )}
            </div>
          )}
        </div>
        {!atBottom && (
          <Button size="sm" variant={unseen ? 'default' : 'secondary'} className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full shadow-md" onClick={jump}>
            <ArrowDown aria-hidden />
            {unseen ? `${unseen} new message${unseen === 1 ? '' : 's'}` : 'Latest'}
          </Button>
        )}
      </div>
      <form
        className="flex items-end gap-2 border-t p-3"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <Label htmlFor={`${id}-composer`} className="sr-only">
          Message {ceoName}
        </Label>
        <Textarea
          ref={composer}
          id={`${id}-composer`}
          rows={1}
          value={text}
          readOnly={sending}
          aria-busy={sending}
          aria-describedby={`${id}-hint`}
          maxLength={4000}
          placeholder={`Message ${ceoName}…`}
          className="max-h-40 min-h-10 resize-none"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <span id={`${id}-hint`} className="sr-only">
          Enter sends, Shift+Enter adds a new line.
        </span>
        <Button type="submit" size="icon" disabled={!text.trim() || sending} aria-label={sending ? 'Sending' : 'Send'}>
          {sending ? <Loader2 className="animate-spin" aria-hidden /> : <SendHorizontal aria-hidden />}
        </Button>
      </form>
    </div>
  );
}
