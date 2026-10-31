import { Loader2, Mic, MicOff } from 'lucide-react';
import { useEffect, useId, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useStore } from '@/store';
import { finishListening, keepListening, kindOf, listen, micProblem, registerTarget, stopListening, useMic, type MicTarget, type MicView } from '@/voice/mic';
import { TAP_MS } from '@/voice/micKeys';

// The mic next to a message box's Send (voice/mic.ts does the listening). Hold it (or V in the box) to talk; a quick
// tap listens until you stop talking; tap again to finish. The live transcript goes into the box, to edit before
// sending. Put it inside the box's <form>: sending by hand stops the listening, and V talks while the caret is there.

/** What the line over the mic says. */
function statusLine(view: MicView, mine: boolean, chiming: boolean): string {
  if (!mine) return chiming ? 'Hands-free: listening in a moment…' : '';
  if (view.state === 'transcribing') return 'Turning your words into text…';
  if (view.state !== 'listening') return '';
  if (!view.live) return 'Starting the mic…';
  if (view.mode === 'handsfree') return 'Hands-free: listening, just talk';
  return view.mode === 'tap' ? 'Listening: stop talking or tap the mic to finish' : 'Listening: let go to finish';
}

interface Props {
  kind: MicTarget['kind'];
  value: string;
  onChange: (text: string) => void;
  /** Sends `text` (auto-send and hands-free; Send itself stays the form's). */
  onSend: (text: string) => void;
  disabled?: boolean;
  className?: string;
}

/** The mic status line, shown over the composer while it listens; `kind` must match the box's MicButton. */
export function MicStatus({ kind }: { kind: MicTarget['kind'] }) {
  const mic = useMic();
  const mine = !!mic.target && kindOf(mic.target) === kind;
  const status = statusLine(mic, mine, kind === 'ceo' && mic.chiming);
  const on = mine && mic.state === 'listening' && mic.live;
  return (
    <p role="status" className={cn('min-h-0 text-xs text-muted-foreground', !status && 'sr-only')}>
      {status}
      {on && (
        <>
          {' · '}
          <kbd className="rounded border bg-muted px-1 font-mono text-[10px]">Esc</kbd> stops
        </>
      )}
    </p>
  );
}

export function MicButton({ kind, value, onChange, onSend, disabled, className }: Props) {
  const id = useId();
  const ref = useRef<HTMLButtonElement>(null);
  const latest = useRef({ value, onChange, onSend, disabled });
  latest.current = { value, onChange, onSend, disabled };
  const provider = useStore((s) => s.settings.listen?.provider ?? 'off');
  useStore((s) => s.voiceKeySet); // re-render when the key comes or goes: it changes micProblem()
  const mic = useMic();
  const press = useRef<number | null>(null);

  useEffect(
    () =>
      registerTarget({
        id,
        kind,
        form: () => ref.current?.form ?? null,
        text: () => latest.current.value,
        setText: (t) => latest.current.onChange(t),
        send: (t) => latest.current.onSend(t),
        disabled: () => !!latest.current.disabled,
      }),
    [id, kind, provider],
  );
  // A message sent by hand ends the listening in its box, so late words don't refill it.
  useEffect(() => {
    const form = ref.current?.form;
    if (!form) return;
    const onSubmit = () => stopListening(id);
    form.addEventListener('submit', onSubmit, true);
    return () => form.removeEventListener('submit', onSubmit, true);
  }, [id, provider]);
  useEffect(() => {
    if (disabled) stopListening(id);
  }, [disabled, id]);

  if (provider === 'off') return null;
  const why = micProblem();
  const mine = mic.target === id;
  const state = mine ? mic.state : 'idle';
  const on = state === 'listening';
  const warming = on && !mic.live; // pressed, but the mic isn't on yet: don't talk yet
  const chiming = kind === 'ceo' && mic.chiming;

  const down = () => {
    if (disabled) return;
    if (why) return listen(id, 'hold'); // says why it can't, in a toast
    if (state === 'listening' || state === 'transcribing') return finishListening(id); // a tap while listening ends it
    press.current = performance.now();
    listen(id, 'hold');
  };
  const up = () => {
    const at = press.current;
    press.current = null;
    if (at === null) return;
    if (performance.now() - at < TAP_MS) keepListening(id);
    else finishListening(id);
  };

  const tip = why || (on ? 'Listening · Esc stops' : 'Hold to talk (or hold V in the box) · tap to talk until you stop');
  const Icon = state === 'transcribing' ? Loader2 : why ? MicOff : Mic;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          ref={ref}
          size="icon"
          variant={(on && !warming) || chiming ? 'default' : 'outline'}
          className={cn('shrink-0 touch-none select-none', ((on && !warming) || chiming) && 'animate-pulse', why && 'opacity-50', className)}
          aria-label={on ? 'Stop listening' : 'Talk instead of type'}
          aria-pressed={on}
          aria-description={why || undefined}
          data-mic-state={state}
          disabled={disabled}
          onPointerDown={(e) => {
            if (e.button !== 0) return;
            e.preventDefault(); // the caret stays in the message box
            e.currentTarget.setPointerCapture?.(e.pointerId);
            down();
          }}
          onPointerUp={up}
          onPointerCancel={up}
          onKeyDown={(e) => {
            if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
              e.preventDefault();
              down();
            }
          }}
          onKeyUp={(e) => {
            if (e.key === ' ' || e.key === 'Enter') {
              e.preventDefault();
              up();
            }
          }}
        >
          <Icon className={cn(state === 'transcribing' && 'animate-spin')} aria-hidden />
        </Button>
      </TooltipTrigger>
      <TooltipContent className="max-w-64">{tip}</TooltipContent>
    </Tooltip>
  );
}
