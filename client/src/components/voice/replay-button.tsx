import { Play, Square } from 'lucide-react';
import type { PhoneMessage } from '../../../../shared/types';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useStore } from '@/store';
import { replayKind } from '@/voice/voiceQueue';

// The speaker loads with the first message read aloud (store.ts) or the first replay.
const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window;

/**
 * The chat's ▶ on a CEO message that was read aloud: its saved clip, or the browser's voice again. Greyed when its
 * clip is no longer saved, ⏹ while it plays, nothing for messages that arrived with the voice off.
 */
export function ReplayButton({ m }: { m: PhoneMessage }) {
  const saved = useStore((s) => s.voiceCache.saved.includes(m.id));
  const playing = useStore((s) => s.voiceSpeaking === m.id);
  const kind = replayKind(m, saved, canSpeak);
  if (!kind) return null;
  if (kind === 'gone') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {/* A disabled button gets no hover or focus, so it stays focusable and only says why it can't play. */}
          <Button
            variant="ghost"
            size="icon-xs"
            aria-disabled="true"
            aria-label="Replay: audio no longer saved"
            className="cursor-not-allowed opacity-50"
            onClick={(e) => e.preventDefault()}
          >
            <Play aria-hidden />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Audio no longer saved</TooltipContent>
      </Tooltip>
    );
  }
  return (
    <Button
      variant="ghost"
      size="icon-xs"
      aria-label={playing ? 'Stop replaying' : 'Replay this message aloud'}
      aria-pressed={playing}
      onClick={() => void import('@/voice/speaker').then((v) => (playing ? v.stopSpeaking() : v.replayMessage(m, kind)))}
    >
      {playing ? <Square className="fill-current" aria-hidden /> : <Play aria-hidden />}
    </Button>
  );
}
