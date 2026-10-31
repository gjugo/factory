import { Check, Circle, Loader2, MonitorOff, Play, RotateCw, Settings2, Wrench } from 'lucide-react';
import { useEffect, useState, type Ref } from 'react';
import { Link } from 'react-router';
import { EmptyState } from '@/components/shared/empty-state';
import { Notice } from '@/components/shared/notice';
import { Button } from '@/components/ui/button';
import { previewSteps } from '@/lib/channels';
import { links } from '@/lib/links';
import { previewActive } from '@/lib/preview-config';
import { cn } from '@/lib/utils';
import type { PreviewView, RepoView } from '../../../../shared/types';

// One preview on the stage: the app in a frame while it runs, else its steps and log while it starts, why it didn't
// run (with Retry), or how to start it.

export type Width = 'desktop' | 'phone';

// A cross-origin frame never says it was refused, so this only catches frames that don't load at all.
const SLOW_LOAD_MS = 12_000;

const IFRAME_SANDBOX = 'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals allow-downloads allow-pointer-lock';

export function PreviewStage({
  repo,
  preview,
  label,
  src,
  width,
  reloads,
  busy,
  onStart,
  frameRef,
  isPr = false,
  className,
}: {
  repo: RepoView;
  preview: PreviewView;
  /** What it is, for titles and buttons: the default branch's name, "PR #212". */
  label: string;
  /** The address to load: the preview's, a path on it, or its sync proxy. */
  src: string | null;
  width: Width;
  reloads: number;
  busy: boolean;
  onStart: () => void;
  frameRef?: Ref<HTMLIFrameElement>;
  /** A PR preview of its own (stops when nobody watches it), not the project's main preview. */
  isPr?: boolean;
  className?: string;
}) {
  const [loaded, setLoaded] = useState(false);
  const [slow, setSlow] = useState(false);
  const running = preview.status === 'running' && !!src;
  const frameKey = `${src}|${preview.startedAt}|${reloads}`;
  useEffect(() => {
    setLoaded(false);
    setSlow(false);
    if (!running) return;
    const t = setTimeout(() => setSlow(true), SLOW_LOAD_MS);
    return () => clearTimeout(t);
  }, [frameKey, running]);

  const box = cn('flex min-h-[28rem] flex-1 flex-col rounded-lg border bg-muted/30', className);

  if (running) {
    return (
      <div className={cn(box, 'relative items-center overflow-hidden')}>
        <iframe
          key={frameKey}
          ref={frameRef}
          className={cn('min-h-[28rem] flex-1 border-0 bg-background', width === 'phone' ? 'w-[390px] max-w-full border-x' : 'w-full')}
          src={src}
          title={`${repo.fullName} app (${label})`}
          sandbox={IFRAME_SANDBOX}
          allow="clipboard-read; clipboard-write; fullscreen; autoplay"
          onLoad={() => setLoaded(true)}
          onError={() => setSlow(true)}
        />
        {slow && !loaded && (
          <Notice className="absolute inset-x-3 bottom-3 bg-background shadow-md" title="The app isn't showing up here.">
            <p>
              It may refuse to be shown inside another page (X-Frame-Options or a CSP frame-ancestors rule).{' '}
              <a className="font-medium text-foreground underline underline-offset-4" href={src} target="_blank" rel="noreferrer">
                Open it in a new tab
              </a>
            </p>
          </Notice>
        )}
      </div>
    );
  }

  if (previewActive(preview.status)) {
    return (
      <div className={cn(box, 'gap-4 p-6')} role="status" aria-live="polite">
        <p className="flex items-center gap-2 font-medium">
          <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden /> Starting {label}…
        </p>
        <ol className="grid gap-2 text-sm">
          {previewSteps(preview.status).map((s) => (
            <li key={s.label} className={cn('flex items-center gap-2', s.state === 'todo' && 'text-muted-foreground')} aria-current={s.state === 'now' ? 'step' : undefined}>
              {s.state === 'done' ? (
                <Check className="size-4 text-success" aria-label="Done" />
              ) : s.state === 'now' ? (
                <Loader2 className="size-4 animate-spin text-info" aria-label="Under way" />
              ) : (
                <Circle className="size-4" aria-label="To do" />
              )}
              {s.label}
              {s.label === 'Start the app' && preview.port ? <span className="text-muted-foreground">on port {preview.port}</span> : null}
            </li>
          ))}
        </ol>
        {preview.logTail.length > 0 && <LogTail lines={preview.logTail.slice(-12)} label={`${label}: latest output`} />}
      </div>
    );
  }

  if (preview.status === 'error') {
    return (
      <div className={cn(box, 'gap-4 p-6')}>
        <Notice tone="danger" title={`${label} didn't run`}>
          {preview.error ?? 'The app stopped unexpectedly.'}
        </Notice>
        <LogTail lines={preview.logTail.length ? preview.logTail : ['(no output)']} label={`${label}: last output`} />
        <div className="flex flex-wrap gap-2">
          <Button disabled={busy} onClick={onStart}>
            <RotateCw aria-hidden /> Retry
          </Button>
          <Button variant="outline" asChild>
            <Link to={links.projectSettings(repo.id)}>
              <Settings2 aria-hidden /> Preview settings
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  if (preview.status === 'unconfigured') {
    return (
      <EmptyState
        className={box}
        icon={Wrench}
        title="How should the office run this app?"
        description={`${preview.error ?? "There's no package.json to fall back on."} Give it a command that serves the app on the project's port in its preview settings.`}
        action={
          <Button asChild>
            <Link to={links.projectSettings(repo.id)}>
              <Settings2 aria-hidden /> Set up the preview
            </Link>
          </Button>
        }
      />
    );
  }

  return (
    <EmptyState
      className={box}
      icon={MonitorOff}
      title={`${label} isn't running`}
      description={
        isPr
          ? `Start it to try the PR's head here, beside ${repo.defaultBranch}. It runs from a worktree of its own and stops after a while with nobody watching.`
          : `Start it to use it here. It runs from the project's own preview worktree on port ${preview.port}.`
      }
      action={
        <Button disabled={busy} onClick={onStart}>
          <Play aria-hidden /> Start {label}
        </Button>
      }
    />
  );
}

/** The last lines of a preview's output, scrollable and reachable by keyboard. */
export function LogTail({ lines, label }: { lines: string[]; label: string }) {
  return (
    <pre tabIndex={0} aria-label={label} className="max-h-64 overflow-auto rounded-md border bg-background p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap break-all">
      {lines.join('\n')}
    </pre>
  );
}
