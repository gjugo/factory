import type { OpsNumbers } from '../../../../shared/types';
import type { Tone } from '@/lib/status';
import { cn } from '@/lib/utils';
import { pipelineSegments, pipelineText, type Stage } from './overview';

// A project's pipeline as one compact bar: a segment per non-empty stage, with the counts under it.

export const FILL: Record<Tone, string> = {
  neutral: 'fill-muted-foreground/60',
  info: 'fill-info',
  success: 'fill-success',
  warning: 'fill-warning',
  danger: 'fill-destructive',
};

export const DOT: Record<Tone, string> = {
  neutral: 'bg-muted-foreground/60',
  info: 'bg-info',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-destructive',
};

// In QA and building share the info tone; a lighter fill keeps neighbouring segments apart.
const SHADE: Partial<Record<Stage, string>> = { inQa: 'opacity-60' };

export function PipelineBar({ numbers, className }: { numbers: Pick<OpsNumbers, Stage>; className?: string }) {
  const segs = pipelineSegments(numbers);
  return (
    <div className={cn('flex w-32 flex-col gap-1', className)}>
      <svg viewBox="0 0 100 6" preserveAspectRatio="none" className="h-1.5 w-full overflow-hidden rounded-full" aria-hidden>
        <rect x="0" y="0" width="100" height="6" className="fill-muted" />
        {segs.map((s) => (
          <rect key={s.key} x={s.start} y="0" width={s.width} height="6" className={cn(FILL[s.tone], SHADE[s.key])} />
        ))}
      </svg>
      <span className="sr-only">{pipelineText(numbers)}</span>
      <div className="flex flex-wrap gap-x-2 text-xs text-muted-foreground tabular-nums" aria-hidden>
        {segs.length === 0 ? (
          <span>Empty</span>
        ) : (
          segs.map((s) => (
            <span key={s.key} className="inline-flex items-center gap-1" title={s.label}>
              <span className={cn('size-1.5 rounded-full', DOT[s.tone], SHADE[s.key])} />
              {s.count}
            </span>
          ))
        )}
      </div>
    </div>
  );
}
