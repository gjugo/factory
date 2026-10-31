import { KeyRound, Loader2, Play, Square } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { CEO_ID, type ListenProvider, type ListenSettings, type VoiceOption, type VoiceProvider, type VoiceSettings } from '../../../../shared/types';
import { SAMPLE_LINE } from '../../../../shared/speech';
import { cacheLabel, clampKeepDays, KEEP_DAYS_MAX, KEEP_DAYS_MIN } from '../../../../shared/voiceClips';
import { api } from '@/api';
import { confirmDialog } from '@/components/shared/confirm-dialog';
import { Notice } from '@/components/shared/notice';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { useStore } from '@/store';
import { micCaps, setHandsFree } from '@/voice/mic';
import { cantListen } from '@/voice/micText';
import { playClip, speakLine, stopVoice } from '@/voice/playback';
import { browserVoices, searchVoices, voiceLabels, type BrowserVoice } from '@/voice/voicePicker';

// Settings → Voice (docs/voice.md): who reads the CEO's messages aloud, the ElevenLabs key (write-only: the browser
// only ever sees its last 4 characters), the voice, model and volume, the saved clips; then talking instead of
// typing. Every choice saves as it's made, like the theme.

const SPEAKERS: [VoiceProvider, string, string][] = [
  ['off', 'Off', 'Messages are only shown.'],
  ['browser', 'Browser voice', 'Free, built into the browser; sounds robotic.'],
  ['elevenlabs', 'ElevenLabs', 'Natural voices, with your own API key. About 1–3 cents a message.'],
];

const LISTENERS: [ListenProvider, string, string][] = [
  ['off', 'Off', 'No mic button by the message boxes.'],
  ['browser', 'Browser', 'Free, built in (Chrome, Edge, Safari).'],
  ['elevenlabs', 'ElevenLabs Speech to Text', 'With your own key; charged by the length of the audio.'],
];

/** ElevenLabs' models worth picking (docs/voice.md); the saved one is kept in the list even when it isn't here. */
const MODELS: [string, string][] = [
  ['eleven_flash_v2_5', 'Flash v2.5: fastest and cheapest'],
  ['eleven_v4_turbo', 'v4 Turbo: more expressive, still real-time'],
  ['eleven_multilingual_v2', 'Multilingual v2: highest quality, slower'],
  ['eleven_v4', 'v4: highest quality, slower'],
];

type Save = (patch: Partial<VoiceSettings>) => void;

/** What's playing: a voice's preview (its id), the Test line, or nothing. */
type Playing = string | null;

/** The browser's voices, which arrive asynchronously; null where the browser can't speak. */
function useBrowserVoices(): BrowserVoice[] | null {
  const read = () => (typeof speechSynthesis === 'undefined' ? null : browserVoices(speechSynthesis.getVoices(), navigator.language));
  const [voices, setVoices] = useState(read);
  useEffect(() => {
    if (typeof speechSynthesis === 'undefined') return;
    const update = () => setVoices(read());
    speechSynthesis.addEventListener('voiceschanged', update);
    update();
    return () => speechSynthesis.removeEventListener('voiceschanged', update);
  }, []);
  return voices;
}

/** One line of radio choices with a title and a note each. */
function Choices<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: [T, string, string][]; onChange: (v: T) => void }) {
  const id = useId();
  return (
    <div className="grid gap-2">
      <Label id={`${id}-label`}>{label}</Label>
      <RadioGroup value={value} onValueChange={(v) => onChange(v as T)} aria-labelledby={`${id}-label`} className="grid gap-2 sm:grid-cols-3">
        {options.map(([v, title, note]) => (
          <Label
            key={v}
            htmlFor={`${id}-${v}`}
            className="flex cursor-pointer items-start gap-3 rounded-md border p-3 font-normal has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-accent/40"
          >
            <RadioGroupItem value={v} id={`${id}-${v}`} className="mt-0.5" aria-describedby={`${id}-${v}-note`} />
            <span className="grid gap-1">
              <span className="font-medium">{title}</span>
              <span id={`${id}-${v}-note`} className="text-xs text-muted-foreground">
                {note}
              </span>
            </span>
          </Label>
        ))}
      </RadioGroup>
    </div>
  );
}

function SwitchRow({ label, hint, checked, disabled, onChange }: { label: string; hint: string; checked: boolean; disabled?: boolean; onChange: (v: boolean) => void }) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="grid gap-1">
        <Label htmlFor={id}>{label}</Label>
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      </div>
      <Switch id={id} checked={checked} disabled={disabled} onCheckedChange={onChange} aria-describedby={`${id}-hint`} />
    </div>
  );
}

/** The ElevenLabs key: checked by the office before it's saved, then only its last 4 characters show. */
function ElevenLabsKey() {
  const keySet = useStore((s) => s.voiceKeySet);
  const hint = useStore((s) => s.voiceKeyHint);
  const [editing, setEditing] = useState(false);
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const id = useId();
  const save = async (value: string) => {
    setBusy(true);
    setError('');
    try {
      await api.setVoiceKey(value);
      setKey(''); // the key is never kept or shown again once it's saved
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    const ok = await confirmDialog({
      tone: 'danger',
      title: 'Remove the ElevenLabs key?',
      body: "It's deleted from the office. ElevenLabs won't read or transcribe anything until you add a key again.",
      confirm: 'Remove',
    });
    if (ok) await save('');
  };
  if (keySet && !editing)
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-md border p-3">
        <KeyRound className="size-4 text-muted-foreground" aria-hidden />
        <span className="flex-1 text-sm">
          ElevenLabs key saved <code className="rounded bg-muted px-1 font-mono text-xs">••••{hint}</code>
        </span>
        <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
          Replace
        </Button>
        <Button variant="ghost" size="sm" disabled={busy} onClick={() => void remove()}>
          Remove
        </Button>
      </div>
    );
  return (
    <form
      className="grid gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (key.trim()) void save(key.trim());
      }}
    >
      <Label htmlFor={id}>ElevenLabs API key</Label>
      <div className="flex flex-wrap gap-2">
        <Input
          id={id}
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          autoComplete="off"
          spellCheck={false}
          placeholder={keySet ? 'Paste the new key' : 'Paste your key'}
          aria-invalid={!!error}
          aria-describedby={`${id}-hint${error ? ` ${id}-error` : ''}`}
          className="min-w-0 flex-1 font-mono"
        />
        <Button type="submit" disabled={busy || !key.trim()}>
          {busy && <Loader2 className="animate-spin" aria-hidden />}
          {busy ? 'Checking…' : 'Save key'}
        </Button>
        {editing && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setEditing(false);
              setKey('');
              setError('');
            }}
          >
            Cancel
          </Button>
        )}
      </div>
      <p id={`${id}-hint`} className="text-xs text-muted-foreground">
        Create one at{' '}
        <a href="https://elevenlabs.io" target="_blank" rel="noreferrer" className="underline underline-offset-4">
          elevenlabs.io
        </a>{' '}
        (Developers → API Keys). The office checks it, keeps it on this machine and never shows it again.
      </p>
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}

function ElevenLabsVoices({ voice, save, playing, setPlaying }: { voice: VoiceSettings; save: Save; playing: Playing; setPlaying: (p: Playing) => void }) {
  const hint = useStore((s) => s.voiceKeyHint);
  const [list, setList] = useState<VoiceOption[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState('');
  const id = useId();
  useEffect(() => {
    let live = true;
    setList(null);
    setFailed(false);
    api.voices().then(
      (l) => live && setList(l),
      () => live && setFailed(true),
    );
    return () => {
      live = false;
    };
  }, [hint]);
  const preview = async (v: VoiceOption) => {
    if (playing === v.id) return stopVoice();
    setPlaying(v.id);
    try {
      // Library voices may have no preview of their own: then it's the test line, made once and cached.
      const ok = await playClip(v.previewUrl ?? (await api.voiceSample(v.id)));
      if (!ok) useStore.getState().pushToast('error', `Couldn't play ${v.name}'s preview`);
    } catch {
      // api already toasted the error
    } finally {
      setPlaying(null);
    }
  };
  if (failed) return <Notice tone="danger">Couldn't load the voices.</Notice>;
  if (!list)
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" aria-hidden /> Loading the voices…
      </p>
    );
  const { recommended, others } = searchVoices(list, query);
  const row = (v: VoiceOption) => {
    const labels = voiceLabels(v);
    return (
      <div key={v.id} className="flex items-center gap-2 rounded-md px-2 py-1.5 has-[[data-state=checked]]:bg-accent/60">
        <RadioGroupItem value={v.id} id={`${id}-${v.id}`} aria-describedby={labels ? `${id}-${v.id}-labels` : undefined} />
        <Label htmlFor={`${id}-${v.id}`} className="grid min-w-0 flex-1 cursor-pointer gap-0.5 font-normal">
          <span className="truncate">
            <span className="font-medium">{v.name}</span>
            {v.labels?.description && <span className="text-muted-foreground"> · {v.labels.description}</span>}
          </span>
          {labels && (
            <span id={`${id}-${v.id}-labels`} className="truncate text-xs text-muted-foreground">
              {labels}
            </span>
          )}
        </Label>
        <Button type="button" variant="ghost" size="icon-sm" aria-label={playing === v.id ? `Stop the preview of ${v.name}` : `Preview ${v.name}`} onClick={() => void preview(v)}>
          {playing === v.id ? <Square className="fill-current" aria-hidden /> : <Play aria-hidden />}
        </Button>
      </div>
    );
  };
  const heading = (text: string) => <p className="px-2 pt-2 pb-1 text-xs font-medium text-muted-foreground">{text}</p>;
  return (
    <div className="grid gap-2">
      <Label htmlFor={`${id}-search`}>Voice{voice.voiceName && <span className="font-normal text-muted-foreground"> · {voice.voiceName}</span>}</Label>
      <Input id={`${id}-search`} type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name, accent, age…" />
      <RadioGroup
        value={voice.voiceId}
        onValueChange={(v) => save({ voiceId: v, voiceName: list.find((x) => x.id === v)?.name ?? '' })}
        aria-label="ElevenLabs voices"
        className="max-h-72 gap-0 overflow-y-auto rounded-md border p-1"
      >
        {recommended.length > 0 && heading('Recommended')}
        {recommended.map(row)}
        {others.length > 0 && heading('All voices')}
        {others.map(row)}
        {recommended.length + others.length === 0 && <p className="p-2 text-sm text-muted-foreground">No voice matches “{query}”.</p>}
      </RadioGroup>
    </div>
  );
}

function ModelPicker({ voice, save }: { voice: VoiceSettings; save: Save }) {
  const id = useId();
  const models = MODELS.some(([m]) => m === voice.model) || !voice.model ? MODELS : [...MODELS, [voice.model, voice.model] as [string, string]];
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>Model</Label>
      <Select value={voice.model || MODELS[0][0]} onValueChange={(model) => save({ model })}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {models.map(([m, label]) => (
            <SelectItem key={m} value={m}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

const DEFAULT_BROWSER_VOICE = '__default';

function BrowserVoicePicker({ voice, save }: { voice: VoiceSettings; save: Save }) {
  const voices = useBrowserVoices();
  const id = useId();
  if (!voices) return <Notice>This browser can't speak. Try Chrome or Edge, or pick ElevenLabs.</Notice>;
  const chosen = voices.some((v) => v.name === voice.voiceName) ? voice.voiceName : DEFAULT_BROWSER_VOICE;
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>Browser voice</Label>
      <Select value={chosen} onValueChange={(v) => save({ voiceName: v === DEFAULT_BROWSER_VOICE ? '' : v })}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={DEFAULT_BROWSER_VOICE}>The browser's default</SelectItem>
          {voices.map((v) => (
            <SelectItem key={v.name} value={v.name}>
              {v.name}
              {v.lang && ` (${v.lang})`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {voices.length === 0 && <p className="text-xs text-muted-foreground">The browser hasn't listed its voices yet; its default voice is used.</p>}
    </div>
  );
}

/** The voice's volume, an office setting (settings.ui) saved when the slider is let go. */
function VolumeSlider() {
  const ui = useStore((s) => s.settings.ui);
  const [value, setValue] = useState(ui.voiceVolume);
  const id = useId();
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => setValue(ui.voiceVolume), [ui.voiceVolume]);
  // The shadcn slider names its root, not the thumb that screen readers land on.
  useEffect(() => box.current?.querySelector('[role="slider"]')?.setAttribute('aria-labelledby', id), [id]);
  const commit = (v: number) => {
    const before = useStore.getState().settings;
    useStore.setState({ settings: { ...before, ui: { ...before.ui, voiceVolume: v } } });
    void api.updateSettings({ ui: { ...before.ui, voiceVolume: v } }).catch(() => useStore.setState({ settings: { ...useStore.getState().settings, ui: before.ui } }));
  };
  return (
    <div ref={box} className="grid gap-3">
      <div className="flex items-center justify-between">
        <Label id={id}>Volume</Label>
        <span className="text-sm text-muted-foreground tabular-nums">{value}%</span>
      </div>
      <Slider value={[value]} min={0} max={100} step={5} aria-labelledby={id} onValueChange={([v]) => setValue(v)} onValueCommit={([v]) => commit(v)} />
    </div>
  );
}

/** How long ElevenLabs clips are kept for the chat's ▶, how much is saved now, and a way to clear it. */
function SavedClips({ voice, save }: { voice: VoiceSettings; save: Save }) {
  const cache = useStore((s) => s.voiceCache);
  const [days, setDays] = useState(String(voice.keepDays));
  const [busy, setBusy] = useState(false);
  const id = useId();
  useEffect(() => setDays(String(voice.keepDays)), [voice.keepDays]);
  const commit = () => {
    const n = clampKeepDays(days);
    setDays(String(n));
    if (n !== voice.keepDays) save({ keepDays: n });
  };
  const clear = async () => {
    const ok = await confirmDialog({
      tone: 'danger',
      title: 'Clear saved clips?',
      body: "Messages read by ElevenLabs can't be replayed after this. New messages are saved again as they arrive.",
      confirm: 'Clear',
    });
    if (!ok) return;
    setBusy(true);
    await api.clearVoiceCache().catch(() => undefined);
    setBusy(false);
  };
  return (
    <div className="grid gap-3">
      <div className="grid gap-2">
        <Label htmlFor={id}>Keep voice clips for (days)</Label>
        <Input
          id={id}
          type="number"
          inputMode="numeric"
          min={KEEP_DAYS_MIN}
          max={KEEP_DAYS_MAX}
          step={1}
          value={days}
          onChange={(e) => setDays(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === 'Enter' && commit()}
          aria-describedby={`${id}-hint`}
          className="w-28"
        />
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          From {KEEP_DAYS_MIN} to {KEEP_DAYS_MAX}. The newest 20 CEO messages always keep theirs, so ▶ replays them for free.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex-1 text-sm" data-testid="voice-cache">
          {cacheLabel(cache.clips, cache.bytes)} saved
        </span>
        <Button variant="outline" size="sm" disabled={busy || cache.clips === 0} onClick={() => void clear()}>
          Clear saved clips
        </Button>
      </div>
    </div>
  );
}

function ReadAloudCard() {
  const voice = useStore((s) => s.settings.voice);
  const keySet = useStore((s) => s.voiceKeySet);
  const cache = useStore((s) => s.voiceCache);
  const [playing, setPlaying] = useState<Playing>(null);
  useEffect(() => stopVoice, []); // leaving the page stops a preview
  const save: Save = (patch) => void api.updateSettings({ voice: { ...voice, ...patch } }).catch(() => undefined);
  const eleven = voice.provider === 'elevenlabs';
  const canTest = voice.provider === 'browser' || (eleven && keySet && !!voice.voiceId);
  const test = async () => {
    if (playing === 'test') return stopVoice();
    setPlaying('test');
    try {
      const ok = eleven ? await playClip(await api.voiceSample(voice.voiceId)) : await speakLine(SAMPLE_LINE, voice.voiceName);
      if (!ok) useStore.getState().pushToast('error', eleven ? "Couldn't play the test" : "The browser couldn't speak the test line");
    } catch {
      // api already toasted the error
    } finally {
      setPlaying(null);
    }
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle>Read aloud</CardTitle>
        <CardDescription>Hear the CEO's messages the moment they arrive, in one tab at a time, after your first click in it.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5">
        <Choices label="Speak with" value={voice.provider} options={SPEAKERS} onChange={(provider) => save({ provider })} />
        {eleven && <ElevenLabsKey />}
        {eleven && keySet && (
          <>
            <ElevenLabsVoices voice={voice} save={save} playing={playing} setPlaying={setPlaying} />
            <ModelPicker voice={voice} save={save} />
          </>
        )}
        {voice.provider === 'browser' && <BrowserVoicePicker voice={voice} save={save} />}
        {voice.provider !== 'off' && (
          <>
            <VolumeSlider />
            <SwitchRow
              label="Speak office notes"
              hint="Read merges, errors and decisions from the office too, not just the CEO."
              checked={voice.speakOffice}
              onChange={(speakOffice) => save({ speakOffice })}
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" disabled={!canTest} onClick={() => void test()}>
                {playing === 'test' ? <Square className="fill-current" aria-hidden /> : <Play aria-hidden />}
                {playing === 'test' ? 'Stop' : 'Test'}
              </Button>
              {!canTest && <span className="text-xs text-muted-foreground">Save a key and pick a voice first.</span>}
            </div>
          </>
        )}
        {(eleven || cache.clips > 0) && (
          <>
            <Separator />
            <SavedClips voice={voice} save={save} />
          </>
        )}
      </CardContent>
    </Card>
  );
}

function TalkCard() {
  const listen = useStore((s) => s.settings.listen);
  const keySet = useStore((s) => s.voiceKeySet);
  const speaker = useStore((s) => s.settings.voice.provider);
  const ceoName = useStore((s) => s.agents[CEO_ID]?.name ?? 'the CEO');
  const save = (patch: Partial<ListenSettings>) => void api.updateSettings({ listen: { ...listen, ...patch } }).catch(() => undefined);
  const why = listen.provider === 'off' ? '' : cantListen(listen.provider, micCaps(), keySet || listen.provider !== 'elevenlabs');
  const voiceOn = speaker !== 'off';
  return (
    <Card>
      <CardHeader>
        <CardTitle>Talk instead of type</CardTitle>
        <CardDescription>A mic by every message box. Hold it (or hold V in the box) and speak; a quick tap listens until you stop talking. Esc stops listening.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5">
        <Choices label="Talk with" value={listen.provider} options={LISTENERS} onChange={(provider) => save({ provider })} />
        {why && <Notice tone="danger">{why}</Notice>}
        {listen.provider === 'elevenlabs' && (
          <>
            <p className="text-xs text-muted-foreground">
              What you say is recorded in this browser (60 seconds at most) and sent through the office to ElevenLabs. A restricted key needs the Speech to Text permission.
            </p>
            {speaker !== 'elevenlabs' && <ElevenLabsKey />}
          </>
        )}
        {listen.provider !== 'off' && (
          <>
            <SwitchRow
              label="Send automatically"
              hint="Send what you said after about 1.2 s of quiet, or when you let go of a hold, instead of leaving it in the box."
              checked={listen.autoSend}
              onChange={(autoSend) => save({ autoSend })}
            />
            <SwitchRow
              label="Hands-free in the CEO chat"
              hint={voiceOn ? `After ${ceoName}'s reply is read aloud, listen for up to 8 s and send what you say.` : `Needs ${ceoName}'s voice: pick one under Speak with first.`}
              checked={listen.handsFree}
              disabled={!voiceOn && !listen.handsFree}
              onChange={(on) => void setHandsFree(on, ceoName)}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}

/** Settings → Voice: reading messages aloud, and talking instead of typing. */
export function VoiceSettingsSection({ className }: { className?: string }) {
  return (
    <section aria-labelledby="voice-settings" className={cn('grid min-w-0 gap-4', className)}>
      <h2 id="voice-settings" className="text-lg font-semibold tracking-tight">
        Voice
      </h2>
      <div className="grid min-w-0 gap-6 lg:grid-cols-2 lg:items-start">
        <ReadAloudCard />
        <TalkCard />
      </div>
    </section>
  );
}
