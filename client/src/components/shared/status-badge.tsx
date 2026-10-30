import { Badge } from '@/components/ui/badge';
import { statusLook, type Tone } from '@/lib/status';
import { cn } from '@/lib/utils';

// One badge for every status the dashboard shows: an agent's, a PR's QA round, GitHub's checks.

const TONE: Record<Tone, string> = {
  neutral: 'border-border bg-transparent text-muted-foreground', // muted text on the muted fill reads under 4.5:1
  info: 'border-info/30 bg-info/10 text-info',
  success: 'border-success/30 bg-success/10 text-success',
  warning: 'border-warning/30 bg-warning/10 text-warning',
  danger: 'border-destructive/30 bg-destructive/10 text-destructive',
};

const DOT: Record<Tone, string> = {
  neutral: 'bg-muted-foreground',
  info: 'bg-info',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-destructive',
};

export function StatusBadge({ kind, status, className }: { kind: 'agent' | 'qa' | 'checks'; status: string; className?: string }) {
  const look = statusLook(kind, status);
  return (
    <Badge variant="outline" className={cn('gap-1.5 font-medium', TONE[look.tone], className)}>
      <span className={cn('size-1.5 rounded-full', DOT[look.tone])} aria-hidden />
      {look.label}
    </Badge>
  );
}

/** A status as a small dot alone (the sidebar's projects), with its meaning for screen readers. */
export function StatusDot({ tone, label, className }: { tone: Tone; label: string; className?: string }) {
  return (
    <span className={cn('inline-block size-2 shrink-0 rounded-full', DOT[tone], className)} role="img" aria-label={label} title={label} />
  );
}
