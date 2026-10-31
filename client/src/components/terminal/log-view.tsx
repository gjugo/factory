import { useLayoutEffect, useRef } from 'react';
import type { LogKind, LogLine } from '../../../../shared/types';
import { cn } from '@/lib/utils';

// The screen of an agent with no terminal (the Agent SDK runtime): their log lines, coloured by kind. It follows new
// lines unless you've scrolled up to read.

const KIND: Record<LogKind, string> = {
  text: 'text-foreground',
  tool: 'text-info',
  result: 'text-muted-foreground',
  system: 'text-muted-foreground italic',
  thinking: 'text-muted-foreground italic',
  error: 'text-destructive',
  manager: 'font-medium text-warning',
  done: 'text-success',
};

export function LogView({ lines, name, footer, className }: { lines: readonly LogLine[]; name: string; footer?: string; className?: string }) {
  const scroller = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const last = lines.length ? lines[lines.length - 1].id : -1;
  useLayoutEffect(() => {
    const el = scroller.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [last]);
  return (
    <div className={cn('flex min-h-0 flex-col overflow-hidden rounded-md border bg-background', className)}>
      <div
        ref={scroller}
        role="log"
        tabIndex={0}
        aria-label={`${name}'s session log`}
        className="min-h-0 flex-1 overflow-auto p-3 font-mono text-xs leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        onScroll={(e) => {
          const el = e.currentTarget;
          stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
        }}
      >
        {lines.length === 0 && <div className="text-muted-foreground">No output yet.</div>}
        {lines.map((l) => (
          <div key={l.id} className={cn('break-words whitespace-pre-wrap', KIND[l.kind])}>
            {l.text || ' '}
          </div>
        ))}
      </div>
      {footer && <div className="truncate border-t bg-muted/40 px-2 py-1 text-xs text-muted-foreground">{footer}</div>}
    </div>
  );
}
