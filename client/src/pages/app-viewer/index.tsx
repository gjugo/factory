import { ChevronDown, CircleStop, Columns2, ExternalLink, GitPullRequest, Loader2, Monitor, PanelRight, Play, RefreshCw, RotateCw, Smartphone } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { api } from '@/api';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { ProjectNav } from '@/components/shared/project-nav';
import { ToneBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Toggle } from '@/components/ui/toggle';
import { projectName } from '@/hooks/use-project-rows';
import { channelPulls, currentChannel, onOfficeComputer, prAsPreview, reachable, viewFromParams, type Channel } from '@/lib/channels';
import { links, repoIdFrom } from '@/lib/links';
import { PREVIEW_STATUS, previewActive } from '@/lib/preview-config';
import { useWatchPreview } from '@/lib/theatre';
import { duration } from '@/lib/time';
import { qaKey, useStore } from '@/store';
import type { PreviewView, RepoView } from '../../../../shared/types';
import { ChannelBar } from './channel-bar';
import { CompareView } from './compare-view';
import { PreviewStage, type Width } from './preview-stage';
import { QaPanel } from './qa-panel';

// /projects/:owner/:name/app: the app viewer and PR theatre (cubefarm's AppViewer). The project's own app ("main") or
// an open PR's (?pr=N), alone or beside main (?compare=N), with QA's report on the PR alongside.

// Remembered while the dashboard is open, so coming back keeps them.
let lastWidth: Width = 'desktop';
let lastQa = true;

export default function AppViewerPage() {
  const repoId = repoIdFrom(useParams());
  const loaded = useStore((s) => s.loaded);
  const repo = useStore((s) => s.repos.find((r) => r.id === repoId));
  if (!loaded) return <Skeleton className="h-96" />;
  if (!repo)
    return (
      <EmptyState
        title="Project not found"
        description={`${repoId ?? 'This project'} isn't connected to the office.`}
        action={
          <Button asChild variant="outline">
            <Link to={links.projects()}>All projects</Link>
          </Button>
        }
      />
    );
  return <AppViewer repo={repo} />;
}

function AppViewer({ repo }: { repo: RepoView }) {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const view = viewFromParams(params);
  const channel = currentChannel(view.pr, repo.pulls);
  const comparing = view.compare && channel != null;
  const prPreview = useStore((s) => (channel == null ? undefined : s.prPreviews[qaKey(repo.id, channel)]));
  const qa = useStore((s) => (channel == null ? undefined : s.qa[qaKey(repo.id, channel)]));
  const [width, setWidth] = useState(lastWidth);
  const [showQa, setShowQa] = useState(lastQa);
  const [busy, setBusy] = useState(false);
  const [reloads, setReloads] = useState(0);

  useWatchPreview(repo.id, channel);

  // A PR on screen with no preview yet gets one (a failed one waits for Retry).
  useEffect(() => {
    if (channel == null || useStore.getState().prPreviews[qaKey(repo.id, channel)]) return;
    void api.startPrPreview(repo.id, channel).catch(() => undefined);
  }, [repo.id, channel]);

  // Away from the office's computer the apps come through the office: its preview worker goes in before they load.
  useEffect(() => {
    if (!onOfficeComputer(location)) navigator.serviceWorker?.register('/preview/sw.js', { scope: '/preview/' }).catch(() => undefined);
  }, []);

  const go = (pr: Channel, compare = false) => navigate(links.app(repo.id, { pr, compare }));
  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
    } catch {
      // api() already toasted
    } finally {
      setBusy(false);
    }
  };

  const main = repo.preview;
  const prView = channel == null ? null : { ...prAsPreview(prPreview, channel), pr: channel };
  const current: PreviewView = prView ?? main;
  const pull = channel == null ? undefined : repo.pulls.find((p) => p.number === channel);
  const label = channel == null ? repo.defaultBranch : `PR #${channel}`;
  const startMain = (pr?: number | null) => run(() => api.startPreview(repo.id, pr ?? undefined));
  const startPr = (restart = false) => channel != null && run(() => api.startPrPreview(repo.id, channel, restart));
  const start = () => void (channel == null ? startMain() : startPr(prView?.status === 'error'));
  const stop = () => void run(() => (channel == null ? api.stopPreview(repo.id) : api.stopPrPreview(repo.id, channel)));
  const active = previewActive(current.status);
  const pickWidth = (w: string) => {
    if (w !== 'desktop' && w !== 'phone') return;
    lastWidth = w;
    setWidth(w);
  };
  const openPulls = channelPulls(repo.pulls);

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-4">
      <PageHeader title={`${projectName(repo)} app`} description={repo.fullName} actions={<ProjectNav repoId={repo.id} />} />
      <ChannelBar repo={repo} channel={channel} onPick={(pr) => go(pr, comparing)} />

      <div className="flex flex-wrap items-center gap-2" role="toolbar" aria-label="App controls">
        {active ? (
          <>
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => void (channel == null ? startMain(main.pr) : startPr(true))}
              title={channel == null ? `Restart ${main.ref ?? label}` : "Restart from the PR's latest commit"}
            >
              {busy ? <Loader2 className="animate-spin" aria-hidden /> : <RotateCw aria-hidden />} Restart
            </Button>
            <Button variant="outline" size="sm" disabled={busy} onClick={stop}>
              <CircleStop aria-hidden /> Stop
            </Button>
          </>
        ) : (
          <Button size="sm" disabled={busy || current.status === 'unconfigured'} onClick={start}>
            {busy ? <Loader2 className="animate-spin" aria-hidden /> : <Play aria-hidden />} Start
          </Button>
        )}
        {channel == null && openPulls.length > 0 && current.status !== 'unconfigured' && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={busy}>
                <GitPullRequest aria-hidden /> Run a PR's code <ChevronDown aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-w-80">
              <DropdownMenuLabel>Run main's preview from</DropdownMenuLabel>
              <DropdownMenuItem onSelect={() => void startMain()}>{repo.defaultBranch}</DropdownMenuItem>
              <DropdownMenuSeparator />
              {openPulls.map((p) => (
                <DropdownMenuItem key={p.number} onSelect={() => void startMain(p.number)}>
                  <span className="truncate">
                    #{p.number} {p.title}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {channel != null && (
          <Toggle variant="outline" size="sm" pressed={comparing} onPressedChange={(on) => go(channel, on)} title={`${repo.defaultBranch} beside PR #${channel}`}>
            <Columns2 aria-hidden /> Compare with {repo.defaultBranch}
          </Toggle>
        )}
        <Button variant="outline" size="sm" disabled={current.status !== 'running' && !(comparing && main.status === 'running')} onClick={() => setReloads((n) => n + 1)}>
          <RefreshCw aria-hidden /> Reload
        </Button>
        <ToggleGroup type="single" variant="outline" size="sm" value={width} onValueChange={pickWidth} aria-label="Viewport width">
          <ToggleGroupItem value="desktop" aria-label="Desktop width">
            <Monitor aria-hidden /> <span className="hidden sm:inline">Desktop</span>
          </ToggleGroupItem>
          <ToggleGroupItem value="phone" aria-label="Phone width (390 px)">
            <Smartphone aria-hidden /> <span className="hidden sm:inline">Phone</span>
          </ToggleGroupItem>
        </ToggleGroup>
        {pull && (
          <Toggle
            variant="outline"
            size="sm"
            pressed={showQa}
            onPressedChange={(on) => {
              lastQa = on;
              setShowQa(on);
            }}
          >
            <PanelRight aria-hidden /> QA
          </Toggle>
        )}
        <Button variant="outline" size="sm" asChild={!!current.url} disabled={!current.url}>
          {current.url ? (
            <a href={reachable(current.url, location)} target="_blank" rel="noreferrer">
              <ExternalLink aria-hidden /> Open in new tab
            </a>
          ) : (
            <>
              <ExternalLink aria-hidden /> Open in new tab
            </>
          )}
        </Button>
      </div>

      <PreviewMeta preview={current} label={label} />

      <div className="flex min-w-0 flex-1 flex-col gap-4 lg:flex-row">
        <div className="flex min-w-0 flex-1 flex-col">
          {comparing && prView ? (
            <CompareView repo={repo} main={main} pr={prView} width={width} reloads={reloads} busy={busy} onStartMain={() => void startMain()} onStartPr={() => void startPr(prView.status === 'error')} />
          ) : (
            <PreviewStage
              repo={repo}
              preview={current}
              label={label}
              src={current.url && reachable(current.url, location)}
              width={width}
              reloads={reloads}
              busy={busy}
              onStart={start}
              isPr={channel != null}
            />
          )}
        </div>
        {pull && showQa && <QaPanel repo={repo} pull={pull} qa={qa} className="lg:w-80 lg:shrink-0 lg:self-start" />}
      </div>
      {channel != null && <p className="text-xs text-muted-foreground">A PR's app stops after a while with nobody watching it, and when its PR merges or closes.</p>}
    </div>
  );
}

/** Status, ref, commit and uptime of what's on screen. */
function PreviewMeta({ preview, label }: { preview: PreviewView; label: string }) {
  const look = PREVIEW_STATUS[preview.status] ?? { label: preview.status, tone: 'neutral' as const };
  const [now, setNow] = useState(() => Date.now());
  const up = preview.status === 'running' && preview.startedAt != null;
  useEffect(() => {
    if (!up) return;
    const t = setInterval(() => setNow(Date.now()), 10_000);
    return () => clearInterval(t);
  }, [up]);
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
      <span role="status" aria-label={`${label}: ${look.label}`}>
        <ToneBadge tone={look.tone} label={look.label} />
      </span>
      {preview.ref && preview.status !== 'stopped' && preview.status !== 'unconfigured' && <span>{preview.ref}</span>}
      {preview.commit && <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-foreground">{preview.commit}</code>}
      {up && <span>up {duration(now - (preview.startedAt ?? now))}</span>}
      {preview.port > 0 && <span>port {preview.port}</span>}
    </div>
  );
}
