import { History, Pause, Play, Radio, RotateCcw } from 'lucide-react';
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { REPLAY_HINT, replayBlocks, showReplayHint } from '@/lib/replay-guard';
import { cn } from '@/lib/utils';
import { at, TimelineMarks } from '@/pages/timelapse/timeline-marks';
import { dayLabel, hhmm, scrubKey, speedNote } from '@/pages/timelapse/timelapse';
import { seekReplay, setReplaySpeed, stopReplay, toggleReplay, useReplay } from '@/replay';
import { SPEEDS } from '@/replayClock';
import { useStore } from '@/store';

// While the time-lapse plays: the frame round the dashboard, the REPLAY badge in the top bar, and the bar under every
// page (play/pause, the clock, the scrubber with the stretch's marks, the speed, back to live). Pages stay
// navigable; the bar stops the controls that would act (lib/replay-guard.ts) and Esc goes back to live.

/** A dialog, sheet or menu is open: Esc closes that first. */
const layerOpen = () => !!document.querySelector('[role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"]');

/** Stops actions while replaying, and Esc goes live. Mounted by the shell. */
function useReplayGuard(replaying: boolean) {
  useEffect(() => {
    if (!replaying) return;
    const root = document.documentElement;
    root.dataset.replaying = '';
    const target = (e: Event) => (e.target instanceof Element ? e.target : null);
    const stop = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      showReplayHint();
    };
    const onClick = (e: MouseEvent) => {
      if (replayBlocks(target(e), 'click')) stop(e);
    };
    const onSubmit = (e: Event) => {
      if (!target(e)?.closest('[data-replay-ok]')) stop(e);
    };
    const onType = (e: Event) => {
      if (replayBlocks(target(e), 'type')) stop(e);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (layerOpen()) return;
        e.preventDefault();
        e.stopPropagation();
        stopReplay();
        return;
      }
      // A terminal sends what's typed on keydown: nothing reaches an agent from a replay.
      if (e.key !== 'Tab' && target(e)?.closest('.xterm') && replayBlocks(target(e), 'type')) stop(e);
    };
    window.addEventListener('click', onClick, true);
    window.addEventListener('submit', onSubmit, true);
    window.addEventListener('beforeinput', onType, true);
    window.addEventListener('paste', onType, true);
    window.addEventListener('keydown', onKey, true);
    return () => {
      delete root.dataset.replaying;
      window.removeEventListener('click', onClick, true);
      window.removeEventListener('submit', onSubmit, true);
      window.removeEventListener('beforeinput', onType, true);
      window.removeEventListener('paste', onType, true);
      window.removeEventListener('keydown', onKey, true);
    };
  }, [replaying]);
}

/** The top bar's REPLAY badge. */
export function ReplayBadge() {
  const replaying = useStore((s) => s.replaying);
  const time = useReplay((s) => s.time);
  if (!replaying) return null;
  return (
    <Badge className="gap-1.5 bg-warning font-semibold tracking-wide text-background tabular-nums" role="status">
      <History className="size-3" aria-hidden />
      REPLAY<span className="hidden sm:inline"> · {hhmm(time)}</span>
    </Badge>
  );
}

/** The timeline: the marks, the playhead, click or drag to jump, arrow keys to step. */
function Scrubber({ className }: { className?: string }) {
  const { from, to, time, marks } = useReplay();
  const track = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<number | null>(null);
  const pointAt = (e: ReactPointerEvent) => {
    const r = track.current!.getBoundingClientRect();
    return from + Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)) * (to - from);
  };
  const shown = drag ?? time;
  return (
    <div
      ref={track}
      role="slider"
      tabIndex={0}
      aria-label="Replay timeline"
      aria-valuemin={from}
      aria-valuemax={to}
      aria-valuenow={Math.round(shown)}
      aria-valuetext={`${hhmm(shown)}, ${dayLabel(shown)}`}
      className={cn('relative h-8 min-w-0 cursor-pointer touch-none rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50', className)}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        setDrag(pointAt(e));
      }}
      onPointerMove={(e) => drag !== null && setDrag(pointAt(e))}
      onPointerUp={(e) => {
        if (drag === null) return;
        setDrag(null);
        seekReplay(pointAt(e));
      }}
      onPointerCancel={() => setDrag(null)}
      onKeyDown={(e) => {
        const next = scrubKey(e.key, time, from, to);
        if (next === null) return;
        e.preventDefault();
        seekReplay(next);
      }}
    >
      <svg className="absolute inset-x-2 top-0 h-full w-[calc(100%-1rem)] overflow-visible" aria-hidden>
        <rect x="0" y="13" width="100%" height="6" rx="3" className="fill-muted" />
        <rect x="0" y="13" width={at(shown, from, to)} height="6" rx="3" className="fill-primary/40" />
        <TimelineMarks marks={marks} from={from} to={to} tips />
        <circle cx={at(shown, from, to)} cy="16" r="7" className="fill-primary stroke-background" strokeWidth={2} />
      </svg>
      {drag !== null && <span className="sr-only">{hhmm(drag)}</span>}
    </div>
  );
}

/** The bar under every page while the time-lapse plays. */
export function ReplayBar() {
  const replaying = useStore((s) => s.replaying);
  const v = useReplay();
  useReplayGuard(replaying);
  if (!replaying) return null;
  const loading = v.phase === 'loading';
  const note = loading ? 'Loading the journal…' : v.phase === 'error' ? `Couldn't load the journal: ${v.error}` : v.phase === 'ended' ? 'That was the whole stretch: play it again, or go back to live.' : REPLAY_HINT;
  const PlayIcon = v.phase === 'playing' ? Pause : v.phase === 'ended' ? RotateCcw : Play;
  return (
    <>
      {/* Outside the top bar: its backdrop blur would hold a fixed frame inside it. */}
      <div className="pointer-events-none fixed inset-0 z-50 border-4 border-warning" aria-hidden />
      <section data-replay-ok aria-label="Time-lapse" className="sticky bottom-0 z-30 border-t bg-background/95 px-3 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/85 sm:px-4">
        <p className={cn('mb-1 truncate text-xs', v.phase === 'error' ? 'text-destructive' : 'text-muted-foreground')} aria-live="polite">
          <span className="font-medium text-foreground">{dayLabel(v.time)}</span>
          {v.label ? ` · ${v.label}` : ''} · {note}
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon-sm" onClick={toggleReplay} disabled={loading} aria-label={v.phase === 'playing' ? 'Pause' : v.phase === 'ended' ? 'Play again' : 'Play'}>
                <PlayIcon aria-hidden />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{v.phase === 'playing' ? 'Pause' : v.phase === 'ended' ? 'Play again from the start' : 'Play'}</TooltipContent>
          </Tooltip>
          <time className="w-12 shrink-0 font-mono text-sm font-semibold tabular-nums" dateTime={new Date(v.time).toISOString()}>
            {hhmm(v.time)}
          </time>
          <Scrubber className="order-last basis-full sm:order-none sm:basis-0 sm:flex-1" />
          <ToggleGroup type="single" variant="outline" size="sm" value={String(v.speed)} onValueChange={(s) => s && setReplaySpeed(Number(s))} aria-label="Replay speed">
            {SPEEDS.map((s) => (
              <ToggleGroupItem key={s} value={String(s)} aria-label={`${s}×: ${speedNote(s)}`} className="px-2 tabular-nums">
                {s}×
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <Button size="sm" variant="outline" onClick={stopReplay} className="ml-auto">
            <Radio aria-hidden />
            <span className="sm:hidden">Live</span>
            <span className="hidden sm:inline">Back to live</span>
            <kbd className="hidden rounded border bg-muted px-1 font-mono text-[10px] sm:inline">Esc</kbd>
          </Button>
        </div>
      </section>
    </>
  );
}
