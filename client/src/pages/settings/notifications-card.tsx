import { BellRing, Check, Download, Monitor, Smartphone, Send } from 'lucide-react';
import { useEffect, useId, useState, type FormEvent, type ReactNode } from 'react';
import { api } from '@/api';
import { confirmDialog } from '@/components/shared/confirm-dialog';
import { Notice } from '@/components/shared/notice';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { useDraft, useSavedFlag } from '@/hooks/use-draft';
import { cn } from '@/lib/utils';
import { showTestNote } from '@/notifications';
import { currentPush, disablePush, enablePush, installed, pushSupport, useInstallOffer } from '@/pwa';
import { useStore } from '@/store';
import { NOTIFY_EVENTS, officeUrl as checkOfficeUrl } from '../../../../shared/notify';
import type { NotifyChannel, NotifySettings } from '../../../../shared/types';
import { devicesText, officePort, permissionText, pushBlocker, type Permission } from './notifications';

// Settings → Notifications (docs/notifications.md): which events the office tells the manager about, on which channels
// (desktop, Web Push, ntfy), the address its links use, and installing the dashboard as an app. Every switch saves as
// it's flipped; the ntfy topic and token are write-only (the browser only ever sees a hint of them).

type Save = (patch: Partial<NotifySettings>) => void;

/** The settings page's notifications row: the events and channels, and beside them the office address and the app. */
export function NotificationSettings() {
  const notify = useStore((s) => s.settings.notify);
  const save: Save = (patch) => {
    const before = useStore.getState().settings;
    const next = { ...before.notify, ...patch };
    useStore.setState({ settings: { ...before, notify: next } });
    api.updateSettings({ notify: next }).catch(() => useStore.setState({ settings: { ...useStore.getState().settings, notify: before.notify } }));
  };
  const channel = (c: NotifyChannel) => ({ on: notify.channels[c], set: (on: boolean) => save({ channels: { ...notify.channels, [c]: on } }) });
  return (
    <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <Card id="notifications">
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>What the office tells you, even with the dashboard closed. At most one of each kind a minute; a burst arrives as one summary.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          <fieldset className="grid gap-3">
            <legend className="mb-3 text-sm font-medium">Tell me when</legend>
            {NOTIFY_EVENTS.map((e) => (
              <SwitchRow key={e.id} id={`notify-event-${e.id}`} label={e.label} checked={notify.events[e.id]} onChange={(on) => save({ events: { ...notify.events, [e.id]: on } })} />
            ))}
          </fieldset>
          <Separator />
          <div className="grid gap-6">
            <h3 className="text-sm font-medium">Channels</h3>
            <DesktopChannel {...channel('desktop')} />
            <Separator />
            <PushChannel {...channel('push')} />
            <Separator />
            <NtfyChannel {...channel('ntfy')} />
          </div>
        </CardContent>
      </Card>
      <div className="grid min-w-0 content-start gap-6">
        <OfficeAddressCard value={notify.officeUrl} save={save} />
        <InstallCard />
      </div>
    </div>
  );
}

function SwitchRow({ id, label, hint, checked, onChange }: { id: string; label: string; hint?: string; checked: boolean; onChange: (on: boolean) => void }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="grid gap-1">
        <Label htmlFor={id} className="font-normal">
          {label}
        </Label>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

/** A channel: its name and what it does, its On switch, then whatever it needs set up. */
function Channel({ id, icon, title, text, on, set, children }: { id: string; icon: ReactNode; title: string; text: ReactNode; on: boolean; set: (on: boolean) => void; children?: ReactNode }) {
  const switchId = `notify-channel-${id}`;
  return (
    <section className="grid gap-3" aria-labelledby={`${switchId}-title`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 gap-3">
          <span className="mt-0.5 text-muted-foreground" aria-hidden>
            {icon}
          </span>
          <div className="grid min-w-0 gap-1">
            <h4 id={`${switchId}-title`} className="text-sm font-medium">
              {title}
            </h4>
            <div className="text-xs text-muted-foreground">{text}</div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Label htmlFor={switchId} className="text-xs font-normal text-muted-foreground">
            On
          </Label>
          <Switch id={switchId} checked={on} onCheckedChange={set} aria-describedby={`${switchId}-title`} />
        </div>
      </div>
      {children && <div className="grid gap-3 sm:pl-7">{children}</div>}
    </section>
  );
}

/** A Test button and what came of it, read out when it lands. */
function useTest(channel: NotifyChannel, local?: () => void) {
  const [state, setState] = useState<{ busy: boolean; result: string | null; ok: boolean }>({ busy: false, result: null, ok: false });
  const run = async () => {
    setState({ busy: true, result: null, ok: false });
    try {
      local?.();
      const r = await api.testNotify(channel);
      setState({ busy: false, result: channel === 'push' ? `Sent to ${r.sent} device${r.sent === 1 ? '' : 's'}.` : 'Sent.', ok: true });
    } catch (err) {
      setState({ busy: false, result: (err as Error).message, ok: false });
    }
  };
  return { ...state, run };
}

function TestButton({ test, disabled, label = 'Test' }: { test: ReturnType<typeof useTest>; disabled?: boolean; label?: string }) {
  return (
    <>
      <Button type="button" size="sm" variant="outline" disabled={disabled || test.busy} onClick={() => void test.run()}>
        <Send aria-hidden />
        {test.busy ? 'Sending…' : label}
      </Button>
      <span role="status" className={cn('text-xs', test.ok ? 'text-success' : 'text-destructive')}>
        {test.result}
      </span>
    </>
  );
}

const permissionNow = (): Permission => (typeof Notification === 'undefined' ? 'unsupported' : Notification.permission);

function StateLine({ tone, children }: { tone: 'ok' | 'bad' | 'muted'; children: ReactNode }) {
  return (
    <p className={cn('flex items-center gap-1.5 text-xs', tone === 'ok' ? 'text-success' : tone === 'bad' ? 'text-destructive' : 'text-muted-foreground')}>
      {tone === 'ok' && <Check className="size-3.5" aria-hidden />}
      {children}
    </p>
  );
}

function DesktopChannel({ on, set }: { on: boolean; set: (on: boolean) => void }) {
  const [permission, setPermission] = useState(permissionNow);
  const test = useTest('desktop', showTestNote);
  const state = permissionText(permission);
  return (
    <Channel
      id="desktop"
      icon={<Monitor className="size-4" />}
      title="Desktop"
      text="From any browser with the office open in a background tab. A tab you're looking at shows a toast instead."
      on={on}
      set={set}
    >
      {state && <StateLine tone={state.tone}>{state.text}</StateLine>}
      <div className="flex flex-wrap items-center gap-2">
        {permission === 'default' && (
          <Button type="button" size="sm" onClick={() => void Notification.requestPermission().then(setPermission)}>
            <BellRing aria-hidden />
            Allow in this browser
          </Button>
        )}
        <TestButton test={test} disabled={!on || permission !== 'granted'} />
      </div>
    </Channel>
  );
}

function PushChannel({ on, set }: { on: boolean; set: (on: boolean) => void }) {
  const devices = useStore((s) => s.notifyChannels.pushDevices);
  const [here, setHere] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const test = useTest('push');
  const support = pushSupport();
  const blocker = pushBlocker(support);

  useEffect(() => {
    if (support === 'ok') void currentPush().then((s) => setHere(!!s), () => setHere(false));
  }, [support, devices]);

  const toggle = async (subscribe: boolean) => {
    setBusy(true);
    setError(null);
    try {
      if (subscribe) await enablePush();
      else await disablePush();
      setHere(subscribe);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Channel
      id="push"
      icon={<Smartphone className="size-4" />}
      title="Web Push"
      text={
        <>
          Reaches a phone or computer even with the office closed. It needs HTTPS, or localhost on the office's own computer. On an iPhone (iOS 16.4+), first
          add the office to the Home Screen (Share → Add to Home Screen) and turn push on from the installed app.
        </>
      }
      on={on}
      set={set}
    >
      <StateLine tone="muted">
        {devicesText(devices)}
        {here ? ', this one included.' : '.'}
      </StateLine>
      {blocker ? (
        <Notice>{blocker}</Notice>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {here ? (
            <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void toggle(false)}>
              Stop on this device
            </Button>
          ) : (
            <Button type="button" size="sm" disabled={busy || here === null} onClick={() => void toggle(true)}>
              <Smartphone aria-hidden />
              {busy ? 'Signing up…' : 'Push to this device'}
            </Button>
          )}
          <TestButton test={test} disabled={!on || !devices} />
        </div>
      )}
      {error && <Notice tone="danger">{error}</Notice>}
    </Channel>
  );
}

function NtfyChannel({ on, set }: { on: boolean; set: (on: boolean) => void }) {
  const view = useStore((s) => s.notifyChannels.webhooks.ntfy);
  const [editing, setEditing] = useState(false);
  const [url, setUrl] = useState('');
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const test = useTest('ntfy');
  const errorId = useId();

  const store = async (body: Record<string, string>) => {
    setBusy(true);
    setError(null);
    try {
      await api.setWebhook('ntfy', body);
      setUrl(''); // never kept or shown again once saved
      setToken('');
      setEditing(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    const ok = await confirmDialog({ tone: 'danger', title: 'Remove the ntfy topic?', body: 'Its topic URL and token are deleted from the office. Nothing more is sent there until you add one again.', confirm: 'Remove' });
    if (ok) await store({});
  };

  return (
    <Channel
      id="ntfy"
      icon={<BellRing className="size-4" />}
      title="ntfy"
      text={
        <>
          Pushes to the{' '}
          <a href="https://ntfy.sh" target="_blank" rel="noreferrer" className="underline underline-offset-2">
            ntfy
          </a>{' '}
          phone app, no account needed. Anyone who knows a topic can read it: pick a long, hard-to-guess one.
        </>
      }
      on={on}
      set={set}
    >
      {view.set && !editing ? (
        <>
          <p className="text-xs">
            Saved: <code className="rounded bg-muted px-1 py-0.5">{view.hint}</code>
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <TestButton test={test} disabled={!on} />
            <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(true)}>
              Replace
            </Button>
            <Button type="button" size="sm" variant="ghost" className="text-destructive hover:text-destructive" disabled={busy} onClick={() => void remove()}>
              Remove
            </Button>
          </div>
        </>
      ) : (
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            void store({ url, token });
          }}
        >
          <div className="grid gap-1.5">
            <Label htmlFor="ntfy-url">Topic URL</Label>
            <Input
              id="ntfy-url"
              type="url"
              inputMode="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://ntfy.sh/my-office-7f3k9q"
              autoComplete="off"
              spellCheck={false}
              aria-invalid={!!error}
              aria-describedby={error ? errorId : undefined}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="ntfy-token">Access token (optional)</Label>
            <Input id="ntfy-token" type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="tk_…" autoComplete="off" spellCheck={false} />
          </div>
          {error && (
            <div id={errorId} className="sm:col-span-2">
              <Notice tone="danger">{error}</Notice>
            </div>
          )}
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <Button type="submit" size="sm" disabled={busy || !url.trim()}>
              {busy ? 'Saving…' : 'Save'}
            </Button>
            {editing && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  setEditing(false);
                  setUrl('');
                  setToken('');
                  setError(null);
                }}
              >
                Cancel
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground sm:col-span-2">Kept on the office's computer, never shown again: the settings show only its last 4 characters.</p>
        </form>
      )}
    </Channel>
  );
}

function OfficeAddressCard({ value, save }: { value: string; save: Save }) {
  const draft = useDraft(value);
  const { saved, flash } = useSavedFlag();
  const [error, setError] = useState<string | null>(null);
  const port = officePort(window.location);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const url = checkOfficeUrl(draft.value);
    if (url === null) return setError('Give an http(s) address, e.g. https://office-pc.your-tailnet.ts.net');
    setError(null);
    save({ officeUrl: url });
    flash();
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle>Office address for links</CardTitle>
        <CardDescription>Where your phone opens the office. ntfy notes link to the page they're about on it.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-3" onSubmit={submit} noValidate>
          <Label htmlFor="office-url" className="sr-only">
            Office address
          </Label>
          <Input
            id="office-url"
            type="url"
            inputMode="url"
            value={draft.value}
            onChange={(e) => draft.set(e.target.value)}
            placeholder="https://office-pc.your-tailnet.ts.net"
            spellCheck={false}
            aria-invalid={!!error}
            aria-describedby="office-url-hint"
          />
          {error && <Notice tone="danger">{error}</Notice>}
          <div className="flex items-center gap-2">
            <Button type="submit" size="sm" disabled={!draft.dirty}>
              Save
            </Button>
            {draft.dirty && (
              <Button type="button" size="sm" variant="ghost" onClick={() => draft.reset()}>
                Undo
              </Button>
            )}
            <span role="status" className="text-xs text-success">
              {saved && !draft.dirty ? 'Saved' : ''}
            </span>
          </div>
          <p id="office-url-hint" className="text-xs text-muted-foreground">
            The office only listens on this computer. To reach it from your phone, install Tailscale on both and run{' '}
            <code className="rounded bg-muted px-1 py-0.5 whitespace-nowrap text-foreground">tailscale serve --bg {port}</code> here: it prints an HTTPS address only your devices can
            open. Never use <code className="rounded bg-muted px-1 py-0.5 text-foreground">tailscale funnel</code>, which opens the office to the internet.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}

function InstallCard() {
  const { offered, install } = useInstallOffer();
  const standalone = installed();
  return (
    <Card>
      <CardHeader>
        <CardTitle>Install app</CardTitle>
        <CardDescription>The dashboard in its own window, on your dock, home screen or taskbar.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm">
        {standalone ? (
          <StateLine tone="ok">Running as the installed app.</StateLine>
        ) : offered ? (
          <Button type="button" size="sm" className="justify-self-start" onClick={() => void install()}>
            <Download aria-hidden />
            Install app
          </Button>
        ) : (
          <p className="text-xs text-muted-foreground">
            Chrome and Edge offer Install in the address bar once the office is served over HTTPS or opened as localhost. On an iPhone: Share → Add to Home
            Screen.
          </p>
        )}
        <p className="text-xs text-muted-foreground">It caches only the app itself, never the office's data, and updates with every new office version.</p>
      </CardContent>
    </Card>
  );
}
