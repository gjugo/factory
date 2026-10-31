// The tab's sound: browsers only play it after a click or key in the tab, so nothing is spoken before the first one
// (and messages that arrived earlier stay silent). One AudioContext, made on that gesture, carries the voice's clips
// through a gain at the volume in Settings → Voice, dipped while the mic listens; it also plays the hands-free chimes.
// window.__swarmVoice, the record of what was read aloud, lives here so it's there before the speaker loads.
import type { VoiceProvider } from '../../../shared/types';

/** One message read aloud, for window.__swarmVoice. Times are performance.now(); end is null while it plays. */
export interface SpokenRecord {
  id: number;
  provider: Exclude<VoiceProvider, 'off'>;
  start: number;
  end: number | null;
  /** How loud it started (0-1, from Settings → Voice). */
  volume: number;
  /** Replayed from the chat's ▶ (a saved clip, or the browser's voice again). */
  replay?: true;
}

export const spoken: SpokenRecord[] = [];

let unlocked = false;
let ctx: AudioContext | null = null;
let out: GainNode | null = null;
let level = 1;
let ducked = false;

/** Whether this tab may make sound yet: the manager has clicked or pressed a key in it. */
export const audioUnlocked = () => unlocked;

function unlock() {
  if (unlocked) return;
  unlocked = true;
  try {
    ctx = new AudioContext();
    void ctx.resume().catch(() => undefined);
    out = ctx.createGain();
    out.connect(ctx.destination);
    apply();
  } catch {
    ctx = null; // no Web Audio: clips can't play, the browser's voice still can
  }
}

if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__swarmVoice = spoken;
  for (const type of ['pointerdown', 'keydown'] as const) window.addEventListener(type, unlock, { capture: true, once: true });
}

/** The AudioContext and the voice's output, once unlocked. */
export function voiceOutput(): { ctx: AudioContext; out: GainNode } | null {
  if (!ctx || !out) return null;
  if (ctx.state === 'suspended') void ctx.resume().catch(() => undefined);
  return { ctx, out };
}

/** The voice's volume, 0-1. */
export function setVoiceLevel(gain: number) {
  level = gain;
  apply();
}

/** While the mic listens the voice dips by about 15 dB, so the mic doesn't hear it as you. */
export function duckVoice(on: boolean) {
  ducked = on;
  apply();
}

function apply() {
  if (!ctx || !out) return;
  try {
    out.gain.setTargetAtTime(level * (ducked ? 0.18 : 1), ctx.currentTime, 0.06);
  } catch {
    // sound is optional
  }
}

/** Two soft notes: rising as hands-free opens the mic, falling as it closes having heard nothing. */
export function listenChime(open: boolean) {
  if (!ctx) return;
  const freqs = open ? [659.25, 987.77] : [783.99, 587.33];
  freqs.forEach((freq, i) => {
    try {
      const at = ctx!.currentTime + i * 0.12;
      const osc = ctx!.createOscillator();
      const g = ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0, at);
      g.gain.linearRampToValueAtTime(0.07 * Math.max(level, 0.3), at + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, at + 0.22);
      osc.connect(g).connect(ctx!.destination);
      osc.start(at);
      osc.stop(at + 0.25);
    } catch {
      // sound is optional
    }
  });
}
