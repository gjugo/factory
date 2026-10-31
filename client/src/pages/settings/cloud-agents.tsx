import { useEffect, useId, useState } from 'react';
import { Check, Cloud, Copy, KeyRound, Monitor, RefreshCw, Trash2 } from 'lucide-react';
import type { CloudCredentialSource, CloudCredentialView, CloudSettings } from '../../../../shared/types';
import { BOX_SIZE_INFO, BOX_SIZES, MAX_BOX_LIMIT } from '../../../../shared/cloud';
import { api } from '@/api';
import { confirmDialog } from '@/components/shared/confirm-dialog';
import { Notice } from '@/components/shared/notice';
import { ToneBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useStore } from '@/store';

// Settings → Cloud agents (docs/cloud.md): the Upstash account cloud agents' Boxes run in, where new agents work, and
// what cloud agents sign in with. Keys and tokens are write-only: the browser only sees whether each is there, where
// it comes from and its last four characters. Every choice saves as it's made and shows in every tab (the `cloud`
// event and settings.cloud).

const DOCS = 'https://github.com/gjugo/factory/blob/main/docs/cloud.md';
const TOKEN_ENV = 'FACTORY_CLAUDE_TOKEN';

export function CloudAgentsCard() {
  const settings = useStore((s) => s.settings.cloud);
  const cloud = useStore((s) => s.cloud);
  const demo = useStore((s) => s.demo);
  const replaying = useStore((s) => s.replaying);
  const [error, setError] = useState<string | null>(null);
  const save = (patch: Partial<CloudSettings>) => {
    setError(null);
    api.updateSettings({ cloud: { ...settings, ...patch } }).catch((err: Error) => setError(err.message));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cloud agents</CardTitle>
        <CardDescription>
          Agents can work in an{' '}
          <a href="https://upstash.com/docs/box/overall/quickstart" target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-foreground">
            Upstash Box
          </a>{' '}
          each instead of on this computer, so they finish their task while the office is closed. This computer stays the default.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        <section className="grid gap-3" aria-labelledby="cloud-account">
          <h2 id="cloud-account" className="text-sm font-medium">
            Upstash account
          </h2>
          <SecretField
            label="Upstash Box API key"
            saved={cloud.keySet}
            hint={cloud.keyHint}
            placeholder={demo ? 'Any text works in the demo' : 'Your Box API key'}
            help="Create one in the Upstash console (Box → API Keys). The office checks it before saving it, and keeps it on this computer."
            checking
            save={(key) => api.setCloudKey(key)}
          />
          {cloud.keySet && <BoxCounts />}
        </section>

        <Separator />

        <section className="grid gap-4" aria-labelledby="cloud-where">
          <h2 id="cloud-where" className="text-sm font-medium">
            Where new agents work
          </h2>
          <RadioGroup value={settings.machineKind} onValueChange={(v) => save({ machineKind: v as CloudSettings['machineKind'] })} className="grid gap-2 sm:grid-cols-2" aria-labelledby="cloud-where" disabled={replaying}>
            <HostCard value="local" icon={<Monitor className="size-4" aria-hidden />} title="This computer" text="Agents stop when the office closes." />
            <HostCard
              value="box"
              icon={<Cloud className="size-4" aria-hidden />}
              title="An Upstash Box each"
              text={cloud.keySet ? 'They keep working while the office is closed.' : 'Save your Upstash Box API key first.'}
              disabled={!cloud.keySet}
            />
          </RadioGroup>
          <p className="text-xs text-muted-foreground">Add agent lets you choose for each new one. Move an agent from their page’s Settings tab while they have no task.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <BoxSizeField value={settings.boxSize} onChange={(boxSize) => save({ boxSize })} disabled={replaying} />
            <BoxLimitField value={settings.boxLimit} onChange={(boxLimit) => save({ boxLimit })} disabled={replaying} />
          </div>
          {error && <Notice tone="danger">{error}</Notice>}
        </section>

        <Separator />

        <section className="grid gap-4" aria-labelledby="cloud-sign-in">
          <div className="grid gap-1">
            <h2 id="cloud-sign-in" className="text-sm font-medium">
              How cloud agents sign in
            </h2>
            <p className="text-xs text-muted-foreground">
              GitHub is set up once for every Box. Coding agents sign in with your own subscription in each cloud agent’s terminal, once per cloud machine, unless you give them a key here.
            </p>
          </div>

          <CredentialRow title="GitHub" view={cloud.github} sources={{ gh: 'Your gh login', token: 'A token you saved' }}>
            <p className="text-xs text-muted-foreground">
              Your gh login is used unless you save a fine-grained token for your projects’ repos (Contents, Pull requests and Issues: read and write), which is safer.
            </p>
            <SecretField label="GitHub token" saved={cloud.github.source === 'token'} hint={cloud.github.hint} placeholder="github_pat_…" save={(v) => api.setCloudToken('github', v)} />
          </CredentialRow>

          <CredentialRow title="Claude Code" view={cloud.claude} sources={{ login: 'Your subscription, per agent', subscription: `Your Claude subscription (${TOKEN_ENV})`, apiKey: 'An Anthropic API key' }}>
            {cloud.claude.source === 'login' && (
              <p className="text-xs text-muted-foreground">
                With your Claude subscription (Pro or Max), each cloud agent signs in once, in their own terminal. When one needs it, the agents list shows <b className="font-medium">Needs sign-in</b> and
                their page a <b className="font-medium">Sign in</b> button: open the link in their terminal, approve it and paste the code back there. Their cloud machine keeps the sign-in.
              </p>
            )}
            {cloud.claude.source !== 'subscription' && (
              <>
                <p className="text-xs text-muted-foreground">Or pay per token with an API key, which every cloud agent then uses instead:</p>
                <SecretField label="Anthropic API key" saved={cloud.claude.source === 'apiKey'} hint={cloud.claude.hint} placeholder="sk-ant-…" save={(v) => api.setCloudToken('anthropic', v)} />
                <SubscriptionToken />
              </>
            )}
          </CredentialRow>

          <CredentialRow title="Codex" view={cloud.codex} sources={{ login: 'Your ChatGPT plan, per agent', apiKey: 'An OpenAI API key' }}>
            <p className="text-xs text-muted-foreground">
              With your ChatGPT plan, each cloud agent signs in once in their own terminal: open the link it shows and enter its one-time code. Or an OpenAI API key works in every Box:
            </p>
            <SecretField label="OpenAI API key" saved={cloud.codex.source === 'apiKey'} hint={cloud.codex.hint} placeholder="sk-…" save={(v) => api.setCloudToken('openai', v)} />
          </CredentialRow>
        </section>

        {demo && cloud.keySet && (
          <>
            <Separator />
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">Demo only: sign every Box out, to see a cloud agent ask to be signed in again.</p>
              <Button type="button" variant="outline" size="sm" disabled={replaying} onClick={() => api.expireSignIns().catch(() => undefined)} className="shrink-0">
                <KeyRound /> Expire sign-ins
              </Button>
            </div>
          </>
        )}

        <p className="text-xs text-muted-foreground">
          Boxes cost what their CPU does while they work (paused ones only their disk), and the free plan allows 10. Setup, costs and what keeps going while the office is closed:{' '}
          <a href={DOCS} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-foreground">
            docs/cloud.md
          </a>
          .
        </p>
      </CardContent>
    </Card>
  );
}

function HostCard({ value, icon, title, text, disabled }: { value: string; icon: React.ReactNode; title: string; text: string; disabled?: boolean }) {
  const id = useId();
  return (
    <Label
      htmlFor={id}
      className="flex cursor-pointer items-start gap-3 rounded-md border p-3 font-normal has-[[data-disabled]]:cursor-not-allowed has-[[data-disabled]]:opacity-60 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-accent/40"
    >
      <RadioGroupItem value={value} id={id} className="mt-0.5" disabled={disabled} aria-describedby={`${id}-text`} />
      <span className="grid gap-1">
        <span className="flex items-center gap-1.5 font-medium">
          {icon}
          {title}
        </span>
        <span id={`${id}-text`} className="text-xs text-muted-foreground">
          {text}
        </span>
      </span>
    </Label>
  );
}

function BoxSizeField({ value, onChange, disabled }: { value: CloudSettings['boxSize']; onChange: (v: CloudSettings['boxSize']) => void; disabled: boolean }) {
  const id = useId();
  return (
    <div className="grid content-start gap-2">
      <Label htmlFor={id}>Box size</Label>
      <Select value={value} onValueChange={(v) => onChange(v as CloudSettings['boxSize'])} disabled={disabled}>
        <SelectTrigger id={id} className="w-full" aria-describedby={`${id}-hint`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {BOX_SIZES.map((s) => (
            <SelectItem key={s} value={s}>
              <span className="capitalize">{s}</span> · {BOX_SIZE_INFO[s].spec}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p id={`${id}-hint`} className="text-xs text-muted-foreground">
        For new Boxes. ${BOX_SIZE_INFO[value].usdPerCpuHour.toFixed(2)} per active CPU hour.
      </p>
    </div>
  );
}

/** Saved when it's left or Enter is pressed, not on every keystroke; another tab's change shows unless it's being typed in. */
function BoxLimitField({ value, onChange, disabled }: { value: number; onChange: (v: number) => void; disabled: boolean }) {
  const id = useId();
  const [draft, setDraft] = useState(String(value));
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) setDraft(String(value));
  }, [value, focused]);
  const n = Math.round(Number(draft));
  const invalid = draft.trim() === '' || !Number.isFinite(n) || n < 1 || n > MAX_BOX_LIMIT;
  const commit = () => {
    if (!invalid && n !== value) onChange(n);
    else if (invalid) setDraft(String(value));
  };
  return (
    <div className="grid content-start gap-2">
      <Label htmlFor={id}>Your plan’s Box limit</Label>
      <Input
        id={id}
        type="number"
        inputMode="numeric"
        min={1}
        max={MAX_BOX_LIMIT}
        step={1}
        value={draft}
        disabled={disabled}
        aria-invalid={invalid}
        aria-describedby={`${id}-hint`}
        onFocus={() => setFocused(true)}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          setFocused(false);
          commit();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commit();
          }
        }}
      />
      <p id={`${id}-hint`} className="text-xs text-muted-foreground">
        Paused Boxes count too; the free plan allows 10. No cloud agent is added past it.
      </p>
    </div>
  );
}

/** The account's Boxes (every one counts towards the plan's limit) and factory's own: running, paused and orphans. */
function BoxCounts() {
  const cloud = useStore((s) => s.cloud);
  const replaying = useStore((s) => s.replaying);
  const [busy, setBusy] = useState<'test' | 'orphans' | null>(null);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const b = cloud.boxes;

  const test = async () => {
    setBusy('test');
    setNote(null);
    try {
      await api.testCloud();
      setNote({ ok: true, text: 'Connected. Boxes counted again.' });
    } catch (err) {
      setNote({ ok: false, text: (err as Error).message });
    } finally {
      setBusy(null);
    }
  };

  const deleteOrphans = async () => {
    if (!b?.orphans) return;
    const ok = await confirmDialog({
      title: `Delete ${b.orphans} orphaned Box${b.orphans === 1 ? '' : 'es'}?`,
      body: 'Boxes of this office whose agent is gone. They’re deleted for good from your Upstash account. Boxes of other apps, a cubefarm office’s included, are never touched.',
      confirm: 'Delete',
      tone: 'danger',
    });
    if (!ok) return;
    setBusy('orphans');
    setNote(null);
    try {
      const { deleted } = await api.deleteCloudOrphans();
      setNote({ ok: true, text: `Deleted ${deleted} orphaned Box${deleted === 1 ? '' : 'es'}.` });
    } catch {
      // api() already toasted why
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="grid gap-3 rounded-md border p-3">
      {b ? (
        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <Count label="On the account" value={b.total} hint="Every app’s; all count towards your limit" />
          <Count label="Running" value={b.running} hint="This office’s" />
          <Count label="Paused" value={b.paused} hint="This office’s" />
          <Count label="Orphans" value={b.orphans} hint="This office’s, agent gone" />
        </dl>
      ) : (
        <p className="text-sm text-muted-foreground">Boxes not counted yet.</p>
      )}
      {cloud.keyError && <Notice tone="danger">{cloud.keyError}</Notice>}
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" disabled={!!busy || replaying} onClick={test}>
          <RefreshCw className={busy === 'test' ? 'animate-spin' : undefined} /> {busy === 'test' ? 'Checking…' : 'Test'}
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={!!busy || replaying || !b?.orphans} onClick={deleteOrphans} className="text-destructive hover:text-destructive">
          <Trash2 /> Delete orphans
        </Button>
        {note && (
          <span role="status" className={note.ok ? 'text-xs text-success' : 'text-xs text-destructive'}>
            {note.text}
          </span>
        )}
      </div>
    </div>
  );
}

function Count({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-lg font-semibold tabular-nums">{value}</dd>
      <dd className="text-xs text-muted-foreground">{hint}</dd>
    </div>
  );
}

/** One credential cloud agents use: whether it's ready and where it comes from, then how to change it. */
function CredentialRow({ title, view, sources, children }: { title: string; view: CloudCredentialView; sources: Partial<Record<NonNullable<CloudCredentialSource>, string>>; children: React.ReactNode }) {
  return (
    <div className="grid gap-3 rounded-md border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-medium">{title}</h3>
        {view.ready ? <ToneBadge tone="success" label={(view.source && sources[view.source]) || 'Ready'} /> : <ToneBadge tone="warning" label="Not set up yet" />}
      </div>
      {children}
    </div>
  );
}

/** The `claude setup-token` route: one subscription token for every cloud agent, kept in the office's environment. */
function SubscriptionToken() {
  const [open, setOpen] = useState(false);
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="grid gap-2">
      <CollapsibleTrigger asChild>
        <Button type="button" variant="link" size="sm" className="h-auto justify-start p-0 text-xs" aria-expanded={open}>
          {open ? 'Hide' : 'Or'} one subscription token for every cloud agent
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="grid gap-2 text-xs text-muted-foreground">
        <ol className="grid list-decimal gap-2 pl-5">
          <li className="grid gap-1">
            <span>In a terminal, run this and approve it in your browser. It prints a token that lasts a year.</span>
            <Command text="claude setup-token" />
          </li>
          <li className="grid gap-1">
            <span>
              Keep it in your environment as <code className="font-mono">{TOKEN_ENV}</code> (factory’s own name: your own <code className="font-mono">claude</code> and a cubefarm office keep theirs). macOS or
              Linux, in your shell profile:
            </span>
            <Command text={`export ${TOKEN_ENV}="<token>"`} />
            <span>Windows:</span>
            <Command text={`setx ${TOKEN_ENV} "<token>"`} />
          </li>
          <li>Restart the office.</li>
        </ol>
        <p>The office never writes it down: Anthropic’s terms keep apps like this one from storing Claude tokens.</p>
      </CollapsibleContent>
    </Collapsible>
  );
}

/** A command to copy. */
function Command({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () =>
    navigator.clipboard
      ?.writeText(text)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => undefined);
  return (
    <span className="flex min-w-0 items-center gap-1 rounded-md border bg-muted/50 py-0.5 pr-0.5 pl-2">
      <code className="min-w-0 flex-1 truncate font-mono text-foreground">{text}</code>
      <Button type="button" variant="ghost" size="icon" className="size-7 shrink-0" onClick={copy} aria-label={copied ? 'Copied' : `Copy ${text}`}>
        {copied ? <Check /> : <Copy />}
      </Button>
    </span>
  );
}

/**
 * A write-only key or token: once saved, its last four characters with Replace and Remove; else a field to paste
 * one. A refusal (the key didn't work, the wrong kind of token) shows under the field.
 */
function SecretField({ label, saved, hint, placeholder, help, checking = false, save }: { label: string; saved: boolean; hint: string; placeholder: string; help?: string; checking?: boolean; save: (value: string) => Promise<unknown> }) {
  const id = useId();
  const replaying = useStore((s) => s.replaying);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const store = async (v: string) => {
    setBusy(true);
    setError(null);
    try {
      await save(v);
      setValue(''); // never kept or shown again once saved
      setEditing(false);
      return true;
    } catch (err) {
      setError((err as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    const ok = await confirmDialog({
      title: `Remove the ${label}?`,
      body: 'It’s deleted from the office. Cloud agents that need it can’t sign in until you add it again.',
      confirm: 'Remove',
      tone: 'danger',
    });
    if (ok && !(await store(''))) setEditing(true); // show why it failed
  };

  if (saved && !editing) {
    return (
      <div className="grid gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex min-w-0 flex-1 items-center gap-1.5 text-sm">
            <KeyRound className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            {label} saved{hint && <code className="font-mono text-muted-foreground">…{hint}</code>}
          </span>
          <Button type="button" variant="outline" size="sm" disabled={busy || replaying} onClick={() => setEditing(true)}>
            Replace
          </Button>
          <Button type="button" variant="ghost" size="sm" disabled={busy || replaying} onClick={remove} className="text-destructive hover:text-destructive">
            Remove
          </Button>
        </div>
        {error && <Notice tone="danger">{error}</Notice>}
      </div>
    );
  }

  return (
    <form
      className="grid gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        void store(value);
      }}
    >
      <Label htmlFor={id}>{label}</Label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          id={id}
          type="password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          className="font-mono"
          aria-invalid={!!error}
          aria-describedby={[help ? `${id}-help` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ') || undefined}
        />
        <div className="flex shrink-0 gap-2">
          <Button type="submit" size="sm" className="h-9" disabled={busy || replaying || !value.trim()}>
            {busy && checking ? 'Checking…' : 'Save'}
          </Button>
          {editing && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9"
              onClick={() => {
                setEditing(false);
                setValue('');
                setError(null);
              }}
            >
              Cancel
            </Button>
          )}
        </div>
      </div>
      {help && (
        <p id={`${id}-help`} className="text-xs text-muted-foreground">
          {help}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}
