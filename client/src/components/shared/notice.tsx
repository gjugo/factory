import { AlertTriangle, Info } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** A boxed line inside a page or dialog: why something can't be done (danger, announced) or a hint (info). */
export function Notice({ tone = 'info', title, children, className }: { tone?: 'info' | 'danger'; title?: string; children?: ReactNode; className?: string }) {
  const Icon = tone === 'danger' ? AlertTriangle : Info;
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn(
        'flex gap-2.5 rounded-md border p-3 text-sm',
        tone === 'danger' ? 'border-destructive/30 bg-destructive/10 text-destructive' : 'bg-muted/50 text-muted-foreground',
        className,
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="min-w-0 space-y-1 break-words">
        {title && <p className="font-medium">{title}</p>}
        {children}
      </div>
    </div>
  );
}
