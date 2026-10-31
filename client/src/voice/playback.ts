// The voice settings' previews and tests: one at a time, at the volume in Settings → Voice.
import { useStore } from '@/store';
import { playbackVolume } from './voicePicker';

let stopCurrent: (() => void) | null = null;

const volume = () => playbackVolume({ volume: useStore.getState().settings.ui?.voiceVolume ?? 80, muted: false });

/** Stops the preview or test that's playing, if any. */
export function stopVoice() {
  stopCurrent?.();
}

/** Plays a clip (a URL, or audio fetched from the office). Resolves false when it couldn't play. */
export function playClip(src: string | Blob): Promise<boolean> {
  stopVoice();
  const url = typeof src === 'string' ? src : URL.createObjectURL(src);
  const el = new Audio(url);
  el.volume = volume();
  return new Promise((resolve) => {
    let over = false;
    const done = (ok: boolean) => {
      if (over) return;
      over = true;
      el.pause();
      if (typeof src !== 'string') URL.revokeObjectURL(url);
      if (stopCurrent === stop) stopCurrent = null;
      resolve(ok);
    };
    const stop = () => done(true);
    stopCurrent = stop;
    el.onended = () => done(true);
    el.onerror = () => done(false);
    el.play().catch(() => done(false));
  });
}

/** Says `text` in the browser's own voice called `voiceName` (its default when there's none). */
export function speakLine(text: string, voiceName: string): Promise<boolean> {
  stopVoice();
  const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined;
  if (!synth) return Promise.resolve(false);
  const u = new SpeechSynthesisUtterance(text);
  const v = synth.getVoices().find((x) => x.name === voiceName);
  if (v) {
    u.voice = v;
    u.lang = v.lang;
  }
  u.volume = volume();
  return new Promise((resolve) => {
    let over = false;
    const done = (ok: boolean) => {
      if (over) return;
      over = true;
      if (stopCurrent === stop) stopCurrent = null;
      resolve(ok);
    };
    const stop = () => {
      done(true);
      synth.cancel();
    };
    stopCurrent = stop;
    u.onend = () => done(true);
    u.onerror = (e) => done(e.error === 'interrupted' || e.error === 'canceled');
    synth.cancel(); // anything left over would queue ahead of the test
    synth.speak(u);
  });
}
