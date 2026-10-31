import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { api } from '@/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { Switch } from '@/components/ui/switch';
import { useIsMobile } from '@/hooks/use-mobile';
import { atPath, comparePath, newPathSync, reachable, relayPath, type Side } from '@/lib/channels';
import type { PreviewView, RepoView } from '../../../../shared/types';
import { PreviewStage, type Width } from './preview-stage';

// Compare mode: main and a PR side by side (stacked on a phone), the same path in both. While syncing, each side is
// shown through a sync proxy (server/syncProxy.ts) whose script reports scrolling and navigation; the other follows.

// Remembered while the dashboard is open.
let lastSync = true;

/** A sync proxy's address in front of a running preview while syncing (a new one after every restart: the old one closed with the app). */
function useSyncProxy(repoId: string, pr: number | null, p: PreviewView, on: boolean): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    setUrl(null);
    if (!on || p.status !== 'running') return;
    let alive = true;
    api
      .previewSync(repoId, pr)
      .then((r) => alive && setUrl(r.url))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [repoId, pr, on, p.status, p.startedAt]);
  return url;
}

export function CompareView({
  repo,
  main,
  pr,
  width,
  reloads,
  busy,
  onStartMain,
  onStartPr,
}: {
  repo: RepoView;
  main: PreviewView;
  pr: PreviewView & { pr: number };
  width: Width;
  reloads: number;
  busy: boolean;
  onStartMain: () => void;
  onStartPr: () => void;
}) {
  const id = useId();
  const stacked = useIsMobile();
  const [path, setPath] = useState('/');
  const [draft, setDraft] = useState('/');
  const [opened, setOpened] = useState(0); // "Open on both" reloads both sides, even on the path they started on
  const [sync, setSync] = useState(lastSync);
  const [where, setWhere] = useState<Record<Side, string | null>>({ main: null, pr: null }); // the path each side reports
  const mainFrame = useRef<HTMLIFrameElement>(null);
  const prFrame = useRef<HTMLIFrameElement>(null);
  const driven = useRef<Record<Side, number>>({ main: 0, pr: 0 }); // until when a side's scrolling is our own echo
  const paths = useRef(newPathSync());

  const proxy: Record<Side, string | null> = { main: useSyncProxy(repo.id, null, main, sync), pr: useSyncProxy(repo.id, pr.pr, pr, sync) };

  // Each side's script says where it is; the other side follows while syncing. What we asked a side to do echoes back:
  // that isn't passed on again.
  useEffect(() => {
    const frames = { main: mainFrame, pr: prFrame };
    const onMessage = (e: MessageEvent) => {
      const d = e.data as { cubefarmSync?: unknown; x?: unknown; y?: unknown; path?: unknown } | null;
      if (!d || (d.cubefarmSync !== 'scroll' && d.cubefarmSync !== 'path')) return;
      const from: Side | null = !e.source ? null : e.source === mainFrame.current?.contentWindow ? 'main' : e.source === prFrame.current?.contentWindow ? 'pr' : null;
      if (!from) return;
      const to: Side = from === 'main' ? 'pr' : 'main';
      if (typeof d.path === 'string') setWhere((x) => (x[from] === d.path ? x : { ...x, [from]: d.path as string }));
      if (!sync) return;
      const target = frames[to].current?.contentWindow;
      const now = Date.now();
      if (d.cubefarmSync === 'scroll' && now > driven.current[from]) {
        driven.current[to] = now + 250;
        target?.postMessage({ cubefarmSyncTo: 'scroll', x: d.x, y: d.y }, '*');
      } else if (d.cubefarmSync === 'path' && typeof d.path === 'string' && relayPath(paths.current, from, d.path, now)) {
        target?.postMessage({ cubefarmSyncTo: 'path', path: d.path }, '*');
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [sync]);

  const src = (p: PreviewView, side: Side) => (p.url ? atPath(reachable((sync && proxy[side]) || p.url, location), path) : null);
  const open = (e: FormEvent) => {
    e.preventDefault();
    const next = comparePath(draft);
    setDraft(next);
    setPath(next);
    setOpened((n) => n + 1);
  };

  const side = (s: Side) => {
    const p = s === 'main' ? main : pr;
    const name = s === 'main' ? repo.defaultBranch : `PR #${pr.pr}`;
    return (
      <section className="flex h-full min-h-0 min-w-0 flex-col gap-2" aria-label={name}>
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          <span className="font-medium">{name}</span>
          {p.commit && <code className="rounded bg-muted px-1.5 py-0.5">{p.commit}</code>}
          {p.status === 'running' && where[s] && <span className="min-w-0 truncate text-muted-foreground">{where[s]}</span>}
          {p.status === 'running' && sync && where[s] !== null && <span className="text-success">synced</span>}
        </div>
        <PreviewStage
          repo={repo}
          preview={p}
          label={name}
          src={src(p, s)}
          width={width}
          reloads={reloads + opened}
          busy={busy}
          onStart={s === 'main' ? onStartMain : onStartPr}
          frameRef={s === 'main' ? mainFrame : prFrame}
          isPr={s === 'pr'}
        />
      </section>
    );
  };

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-3">
      <form className="flex flex-wrap items-center gap-x-4 gap-y-2" onSubmit={open}>
        <div className="flex w-full min-w-0 items-center gap-2 sm:w-auto sm:max-w-md sm:flex-1">
          <Label htmlFor={`${id}-path`} className="shrink-0 text-muted-foreground">
            Path
          </Label>
          <Input id={`${id}-path`} value={draft} onChange={(e) => setDraft(e.target.value)} spellCheck={false} className="h-8 min-w-0 flex-1 font-mono text-xs" />
          <Button type="submit" variant="outline" size="sm" className="shrink-0">
            Open on both
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            id={`${id}-sync`}
            checked={sync}
            aria-describedby={`${id}-sync-hint`}
            onCheckedChange={(on) => {
              lastSync = on;
              setSync(on);
              setWhere({ main: null, pr: null }); // the frames reload, through the proxies or straight
              paths.current = newPathSync();
            }}
          />
          <Label htmlFor={`${id}-sync`}>Sync navigation and scrolling</Label>
          <span id={`${id}-sync-hint`} className="sr-only">
            Shows each side through the office so it can follow the other's links and scrolling. Works for plain web pages that scroll the page itself.
          </span>
        </div>
      </form>
      {stacked ? (
        <div className="grid gap-4">
          {side('main')}
          {side('pr')}
        </div>
      ) : (
        <ResizablePanelGroup orientation="horizontal" className="min-h-[28rem] flex-1">
          <ResizablePanel defaultSize="50" minSize="20" className="pr-2">
            {side('main')}
          </ResizablePanel>
          <ResizableHandle withHandle aria-label="Resize the two sides" />
          <ResizablePanel defaultSize="50" minSize="20" className="pl-2">
            {side('pr')}
          </ResizablePanel>
        </ResizablePanelGroup>
      )}
    </div>
  );
}
