import { Square, Volume2 } from 'lucide-react';
import { CEO_ID } from '../../../../shared/types';
import { Button } from '@/components/ui/button';
import { useStore } from '@/store';

/** The top bar's sign that a message is being read aloud in this tab, with Stop. Nothing while it's quiet. */
export function SpeakingIndicator() {
  const speaking = useStore((s) => s.voiceSpeaking);
  const ceo = useStore((s) => s.agents[CEO_ID]?.name ?? 'CEO');
  const from = useStore((s) => (s.voiceSpeaking === null ? null : (s.messages.find((m) => m.id === s.voiceSpeaking)?.from ?? null)));
  if (speaking === null) return null;
  const who = from === 'office' ? 'Office note' : ceo;
  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={() => void import('@/voice/speaker').then((v) => v.stopSpeaking())}
      aria-label={`Stop reading aloud (${who} speaking)`}
      data-testid="voice-speaking"
    >
      <Volume2 className="animate-pulse text-primary" aria-hidden />
      <span className="hidden max-w-28 truncate sm:inline">{who}</span>
      <Square className="size-3 fill-current" aria-hidden />
      <span className="hidden sm:inline">Stop</span>
    </Button>
  );
}
