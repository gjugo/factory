import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { timelineAt } from '@/replayClock';
import type { JournalMark, MarkKind } from '../../../../shared/journal';
import { hhmm, MARK_LABEL } from './timelapse';

// A stretch's marks (merges, PRs that needed the manager, new issues) as dots placed by time, for an SVG timeline:
// a day's row on the time-lapse page and the replay bar's scrubber. Percentages place them without inline styles.

export const MARK_FILL: Record<MarkKind, string> = { merge: 'fill-success', 'needs-human': 'fill-destructive', issue: 'fill-info' };
export const MARK_BG: Record<MarkKind, string> = { merge: 'bg-success', 'needs-human': 'bg-destructive', issue: 'bg-info' };

/** Where `t` falls on an SVG timeline, as an x or a width. */
export const at = (t: number, from: number, to: number) => `${timelineAt(t, from, to) * 100}%`;

export function TimelineMarks({ marks, from, to, r = 4, tips = false }: { marks: readonly JournalMark[]; from: number; to: number; r?: number; tips?: boolean }) {
  return (
    <g>
      {marks.slice(0, 400).map((m, i) => {
        const dot = <circle cx={at(m.t, from, to)} cy="50%" r={r} className={cn(MARK_FILL[m.kind], 'stroke-background')} strokeWidth={1.5} />;
        if (!tips) return <g key={`${m.kind}-${m.repoId}-${m.n}-${i}`}>{dot}</g>;
        return (
          <Tooltip key={`${m.kind}-${m.repoId}-${m.n}-${i}`}>
            <TooltipTrigger asChild>{dot}</TooltipTrigger>
            <TooltipContent>
              {hhmm(m.t)} · {MARK_LABEL[m.kind]} · {m.label}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </g>
  );
}
