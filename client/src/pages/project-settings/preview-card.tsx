import { CircleStop, ExternalLink, Loader2, Play, RotateCw } from 'lucide-react';
import { useId, useState, type FormEvent } from 'react';
import { api } from '@/api';
import { Notice } from '@/components/shared/notice';
import { RelativeTime } from '@/components/shared/relative-time';
import { SaveBar } from '@/components/shared/save-bar';
import { ToneBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useDraft, useSavedFlag } from '@/hooks/use-draft';
import { envText, parseEnv, PREVIEW_STATUS, previewActive, previewDirty, previewPatch, type PreviewFormErrors } from '@/lib/preview-config';
import { PREVIEW_ENV_MAX_CHARS, previewEnvChars } from '../../../../shared/previewEnv';
import type { RepoView } from '../../../../shared/types';
import { attempt } from '../projects/actions';

// The project's app: how it runs (command and env, checked like the server checks them), and the running preview with
// its status, commit and log tail. cubefarm's PreviewSettings and the app viewer's controls.

export function PreviewCard({ repo }: { repo: RepoView }) {
  const p = repo.preview;
  const look = PREVIEW_STATUS[p.status] ?? { label: p.status, tone: 'neutral' as const };
  const active = previewActive(p.status);
  const [busy, setBusy] = useState<'start' | 'stop' | null>(null);
  const act = async (kind: 'start' | 'stop', fn: () => Promise<unknown>) => {
    setBusy(kind);
    await attempt(fn);
    setBusy(null);
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle>Preview</CardTitle>
        <CardDescription>The project's app, run from the default branch in a worktree of its own on port {p.port}.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <span role="status" aria-label={`Preview: ${look.label}`}>
            <ToneBadge tone={look.tone} label={look.label} />
          </span>
          {p.ref && <span className="text-muted-foreground">{p.ref}</span>}
          {p.commit && <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{p.commit}</code>}
          {p.startedAt && active && (
            <span className="text-muted-foreground">
              started <RelativeTime at={p.startedAt} />
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {active ? (
            <>
              <Button variant="outline" disabled={!!busy} onClick={() => void act('start', () => api.startPreview(repo.id))}>
                {busy === 'start' ? <Loader2 className="animate-spin" aria-hidden /> : <RotateCw aria-hidden />}
                Restart
              </Button>
              <Button variant="outline" disabled={!!busy} onClick={() => void act('stop', () => api.stopPreview(repo.id))}>
                {busy === 'stop' ? <Loader2 className="animate-spin" aria-hidden /> : <CircleStop aria-hidden />}
                Stop
              </Button>
            </>
          ) : (
            <Button disabled={!!busy || p.status === 'unconfigured'} onClick={() => void act('start', () => api.startPreview(repo.id))}>
              {busy === 'start' ? <Loader2 className="animate-spin" aria-hidden /> : <Play aria-hidden />}
              Start
            </Button>
          )}
          {p.status === 'running' && p.url && (
            <Button variant="outline" asChild>
              <a href={p.url} target="_blank" rel="noreferrer">
                <ExternalLink aria-hidden /> Open app
              </a>
            </Button>
          )}
        </div>
        {p.status === 'unconfigured' && <Notice>There's no package.json to run. Set a run command below to start the preview.</Notice>}
        {p.error && <Notice tone="danger">{p.error}</Notice>}
        {p.logTail.length > 0 && (
          <div className="grid gap-1.5">
            <p className="text-sm font-medium" id={`log-${repo.number}`}>
              Log
            </p>
            <pre
              tabIndex={0}
              aria-labelledby={`log-${repo.number}`}
              className="max-h-56 overflow-auto rounded-md border bg-muted/40 p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap break-all"
            >
              {p.logTail.join('\n')}
            </pre>
          </div>
        )}
        <PreviewConfigForm repo={repo} />
      </CardContent>
    </Card>
  );
}

function PreviewConfigForm({ repo }: { repo: RepoView }) {
  const command = useDraft(repo.previewConfig.command ?? '');
  const env = useDraft(envText(repo.previewConfig.env));
  const [errors, setErrors] = useState<PreviewFormErrors>({});
  const [busy, setBusy] = useState(false);
  const { saved, flash } = useSavedFlag();
  const id = useId();
  const unconfigured = repo.preview.status === 'unconfigured';
  const dirty = previewDirty(repo.previewConfig, command.value, env.value);
  const chars = previewEnvChars(parseEnv(env.value).env);
  const save = async (e: FormEvent) => {
    e.preventDefault();
    const r = previewPatch(command.value, env.value);
    if ('errors' in r) return setErrors(r.errors);
    setErrors({});
    setBusy(true);
    try {
      await api.updateRepo(repo.id, r.patch);
      command.set(r.patch.previewCommand ?? '');
      env.set(envText(r.patch.previewEnv));
      flash();
    } catch (err) {
      setErrors({ env: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };
  return (
    <form className="grid gap-4 border-t pt-4" onSubmit={save} noValidate>
      <div className="grid gap-2">
        <Label htmlFor={`${id}-cmd`}>Run command</Label>
        <Input
          id={`${id}-cmd`}
          value={command.value}
          onChange={(e) => command.set(e.target.value)}
          placeholder={unconfigured ? 'e.g. python -m http.server {port}' : 'Auto-detected: npm run dev, else npm start, else npm run preview'}
          spellCheck={false}
          className="font-mono"
          aria-invalid={!!errors.command}
          aria-describedby={`${id}-cmd-hint${errors.command ? ` ${id}-cmd-error` : ''}`}
        />
        <p id={`${id}-cmd-hint`} className="text-xs text-muted-foreground">
          Runs from the repository root. {'{port}'} is this project's port ({repo.preview.port}) and PORT is always set; {'{tmp}'} is a scratch folder.
          {!unconfigured && ' Leave it empty to use the auto-detected npm script.'}
        </p>
        {errors.command && (
          <p id={`${id}-cmd-error`} role="alert" className="text-sm text-destructive">
            {errors.command}
          </p>
        )}
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${id}-env`}>Environment</Label>
        <Textarea
          id={`${id}-env`}
          value={env.value}
          onChange={(e) => env.set(e.target.value)}
          rows={4}
          spellCheck={false}
          className="font-mono text-xs"
          placeholder={'API_URL=http://localhost:{port}/api\nDATA_DIR={tmp}'}
          aria-invalid={!!errors.env}
          aria-describedby={`${id}-env-hint${errors.env ? ` ${id}-env-error` : ''}`}
        />
        <p id={`${id}-env-hint`} className="text-xs text-muted-foreground">
          KEY=value, one per line; # starts a comment.
          {chars > PREVIEW_ENV_MAX_CHARS * 0.8 && ` ${chars.toLocaleString('en-US')} of ${PREVIEW_ENV_MAX_CHARS.toLocaleString('en-US')} characters used.`}
        </p>
        {errors.env && (
          <p id={`${id}-env-error`} role="alert" className="text-sm text-destructive">
            {errors.env}
          </p>
        )}
      </div>
      <SaveBar
        dirty={dirty}
        busy={busy}
        saved={saved}
        label="Save preview settings"
        onUndo={() => {
          command.reset();
          env.reset();
          setErrors({});
        }}
      />
    </form>
  );
}
