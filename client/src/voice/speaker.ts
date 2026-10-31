// CEO messages read aloud the moment they arrive (docs/voice.md): ElevenLabs' clip through audio.ts's voice output,
// or the browser's own voice. One at a time and in order, and one dashboard tab per message (claim.ts). The chat's ▶
// replays a message here too, from its saved clip only (never a new synthesis). The store loads this on the first
// message to speak; window.__swarmVoice records what was read, for QA. A CEO message that ends by itself, with nothing
// else to read, may open the hands-free mic (mic.ts).
import { speechText } from '../../../shared/speech';
import type { PhoneMessage } from '../../../shared/types';
import { useStore } from '@/store';
import { setVoiceLevel, spoken, voiceOutput, type SpokenRecord } from './audio';
import { wonVoice } from './claim';
import { replyEnded } from './mic';
import { enqueue, nextUp, type Queued, type ReplayKind } from './voiceQueue';
import { playbackVolume } from './voicePicker';

const level = () => playbackVolume({ volume: useStore.getState().settings.ui?.voiceVolume ?? 80, muted: false });
setVoiceLevel(level());
useStore.subscribe((s, before) => {
  if (s.settings.ui?.voiceVolume !== before.settings.ui?.voiceVolume) setVoiceLevel(level());
});

/** A live message to read aloud, claimed by the store at `arrived`: queued once the claim wait is over, if it won. */
export function speakMessage(message: PhoneMessage, arrived: number, wait: number) {
  setTimeout(
    () => {
      if (!wonVoice(message.id)) return;
      queue = enqueue(queue, { message, arrived });
      if (replaying) stopCurrent?.(); // a new message cuts a replay short
      void pump();
    },
    Math.max(0, arrived + wait - Date.now()),
  );
}

// ---------- the queue ----------

let queue: Queued[] = [];
let stopCurrent: (() => void) | null = null;
let busy = false;
let replayNext: { message: PhoneMessage; kind: Exclude<ReplayKind, 'gone'> } | null = null;
let replaying = false;
let cutShort = false; // the message being read was stopped, not finished

/** The chat's ▶: plays `message` again in this tab, stopping whatever is being read now. */
export function replayMessage(message: PhoneMessage, kind: Exclude<ReplayKind, 'gone'>) {
  replayNext = { message, kind };
  cutShort = true;
  stopCurrent?.();
  void pump();
}

/** Stops the message being read (the top bar's Stop, the chat's ⏹); the next one waiting follows. */
export function stopSpeaking() {
  cutShort = true;
  stopCurrent?.();
}

async function pump() {
  if (busy) return;
  busy = true;
  try {
    for (;;) {
      if (replayNext) {
        const r = replayNext;
        replayNext = null;
        replaying = true;
        await read(r.message, r.kind).finally(() => (replaying = false));
        continue;
      }
      const { next, rest } = nextUp(queue, Date.now());
      queue = rest;
      if (!next) break;
      await read(next.message);
    }
  } finally {
    busy = false;
    replaying = false;
  }
}

let warned = false;

/** Reads a live message with the voice in the settings, or replays one (`replay`) the way the chat's ▶ chose. */
async function read(m: PhoneMessage, replay?: Exclude<ReplayKind, 'gone'>) {
  const { settings, voiceKeySet } = useStore.getState();
  const { voiceName } = settings.voice;
  const provider = replay ? (replay === 'clip' ? 'elevenlabs' : 'browser') : settings.voice.provider;
  if (provider === 'off') return; // turned off while it waited
  const now: { rec: SpokenRecord | null } = { rec: null };
  cutShort = false;
  const words = speechText(m.text);
  const began = () => {
    now.rec = { id: m.id, provider, start: performance.now(), end: null, volume: level(), ...(replay ? { replay: true as const } : {}) };
    spoken.push(now.rec);
    if (spoken.length > 50) spoken.splice(0, spoken.length - 50);
    useStore.setState({ voiceSpeaking: m.id });
  };
  try {
    if (provider === 'browser') await speak(words, voiceName, began);
    else if (replay) await playClip(m.id, began, true);
    else if (!voiceKeySet) throw new Error('no ElevenLabs key is saved');
    else await playClip(m.id, began);
  } catch (err) {
    // A replay whose clip went meanwhile (pruned or cleared) says so; the chat's ▶ follows the server's list.
    if (replay) {
      if (!now.rec) useStore.getState().pushToast('info', replay === 'clip' ? 'Audio no longer saved' : "The browser couldn't speak this message");
      return;
    }
    // No key, ElevenLabs being down, no voice in this browser: the message still shows, just without words.
    if (!warned) {
      warned = true;
      console.warn(`[voice] couldn't read message ${m.id} aloud: ${(err as Error).message}`);
    }
  } finally {
    stopCurrent = null;
    if (now.rec) {
      now.rec.end = performance.now();
      useStore.setState({ voiceSpeaking: null });
      if (!replay && !cutShort && m.from === 'ceo' && !queue.length && !replayNext) replyEnded();
    }
  }
}

// ---------- ElevenLabs ----------

/**
 * Fetches the message's clip and plays it through the voice output, at the volume in the settings. `cached`: the
 * chat's ▶, saved clips only (a 404 when they're gone), every part of a long message in order.
 */
async function playClip(id: number, began: () => void, cached = false) {
  let stopped = false;
  let end: (() => void) | null = null;
  stopCurrent = () => {
    stopped = true;
    end?.();
  };
  for (let part = 0, parts = 1; part < parts; part++) {
    const res = await fetch(cached ? `/api/voice/messages/${id}?cached=1&part=${part}` : `/api/voice/messages/${id}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    parts = Math.max(1, Number(res.headers.get('X-Voice-Parts')) || 1);
    const data = await res.arrayBuffer();
    if (stopped) return;
    const a = voiceOutput();
    if (!a) throw new Error('audio is unavailable');
    const buffer = await a.ctx.decodeAudioData(data);
    if (stopped) return;
    const src = a.ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(a.out);
    await new Promise<void>((resolve) => {
      // A suspended context (a background tab, a headless browser) never ends the clip: don't let it stall the queue.
      const deadline = setTimeout(() => resolve(), (buffer.duration + 2) * 1000);
      src.onended = () => {
        clearTimeout(deadline);
        resolve();
      };
      end = () => {
        clearTimeout(deadline);
        try {
          src.stop();
        } catch {
          // never started
        }
        resolve();
      };
      src.start();
      if (part === 0) began();
    });
    end = null;
    src.disconnect();
    if (stopped) return;
  }
}

// ---------- the browser's voice ----------

/** The browser's voices, waiting briefly for them to load the first time (they arrive asynchronously). */
async function browserVoices(synth: SpeechSynthesis): Promise<SpeechSynthesisVoice[]> {
  if (synth.getVoices().length) return synth.getVoices();
  await new Promise<void>((resolve) => {
    const t = setTimeout(resolve, 1000);
    synth.addEventListener('voiceschanged', () => (clearTimeout(t), resolve()), { once: true });
  });
  return synth.getVoices();
}

/** Says `text` in the voice called `voiceName` (the browser's default when it's gone). Rejects when it can't. */
async function speak(text: string, voiceName: string, began: () => void) {
  const synth = window.speechSynthesis;
  if (!synth || typeof SpeechSynthesisUtterance === 'undefined') throw new Error("this browser can't speak");
  if (!text) return;
  const u = new SpeechSynthesisUtterance(text);
  const v = (await browserVoices(synth)).find((x) => x.name === voiceName);
  if (v) {
    u.voice = v;
    u.lang = v.lang;
  }
  u.volume = level();
  await new Promise<void>((resolve, reject) => {
    // A stuck engine (or a headless browser that never starts) gets a deadline.
    const deadline = setTimeout(() => stop(), 20_000 + text.length * 150);
    let over = false;
    const done = (err?: string) => {
      if (over) return;
      over = true;
      clearTimeout(deadline);
      if (err) reject(new Error(err));
      else resolve();
    };
    const stop = () => {
      done();
      synth.cancel();
    };
    stopCurrent = stop;
    u.onstart = began;
    u.onend = () => done();
    u.onerror = (e) => done(e.error === 'interrupted' || e.error === 'canceled' ? undefined : `speech failed: ${e.error}`);
    synth.speak(u);
  });
}
