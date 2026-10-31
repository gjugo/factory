import { Headphones } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useStore } from '@/store';
import { handsFreeProblem, setHandsFree } from '@/voice/mic';

/**
 * The CEO chat's hands-free switch: after the CEO's reply is read aloud, the mic listens for up to 8 s and sends what
 * it hears. Turning it on asks for the microphone from that click; it never asks on its own later.
 */
export function HandsFreeToggle({ ceoName }: { ceoName: string }) {
  const listen = useStore((s) => s.settings.listen);
  useStore((s) => s.settings.voice.provider); // re-render: it changes handsFreeProblem()
  useStore((s) => s.voiceKeySet);
  if (!listen || listen.provider === 'off') return null;
  const on = listen.handsFree;
  const why = on ? '' : handsFreeProblem(ceoName);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          size="icon"
          variant={on ? 'secondary' : 'ghost'}
          className={cn('shrink-0', on && 'text-primary', why && 'opacity-50')}
          aria-label="Hands-free"
          aria-pressed={on}
          aria-description={why || undefined}
          onClick={() => void setHandsFree(!on, ceoName)}
        >
          <Headphones aria-hidden />
        </Button>
      </TooltipTrigger>
      <TooltipContent className="max-w-64">
        {why ||
          (on
            ? `Hands-free is on: after ${ceoName}'s reply is read aloud, just talk. Esc closes it.`
            : `Hands-free: after ${ceoName}'s reply is read aloud, listen for up to 8 s and send what you say`)}
      </TooltipContent>
    </Tooltip>
  );
}
