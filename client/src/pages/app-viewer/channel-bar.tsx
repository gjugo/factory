import { GitBranch, GitPullRequest } from 'lucide-react';
import { useRef, type KeyboardEvent } from 'react';
import { StatusBadge, StatusDot } from '@/components/shared/status-badge';
import { channelLabel, channelLed, channelPulls, LED_LABEL, type Channel, type Led } from '@/lib/channels';
import type { Tone } from '@/lib/status';
import { cn } from '@/lib/utils';
import { qaKey, useStore } from '@/store';
import type { RepoView } from '../../../../shared/types';

// The channels: main (the project's own preview), then every open PR, each with its status light and QA state.
// Arrow keys move between them and Enter picks one: focus alone doesn't pick, since picking a PR starts its app.

const LED_TONE: Record<Led, Tone> = { live: 'success', busy: 'info', bad: 'danger', off: 'neutral' };

export function ChannelBar({ repo, channel, onPick }: { repo: RepoView; channel: Channel; onPick: (pr: Channel) => void }) {
  const prPreviews = useStore((s) => s.prPreviews);
  const qa = useStore((s) => s.qa);
  const pulls = channelPulls(repo.pulls);
  const bar = useRef<HTMLDivElement>(null);

  const onKeyDown = (e: KeyboardEvent) => {
    const keys: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    const items = [...(bar.current?.querySelectorAll<HTMLButtonElement>('[role=tab]') ?? [])];
    const at = items.indexOf(document.activeElement as HTMLButtonElement);
    if (at < 0) return;
    let next = -1;
    if (e.key in keys) next = (at + keys[e.key] + items.length) % items.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = items.length - 1;
    if (next < 0) return;
    e.preventDefault();
    items[next].focus();
  };

  const chip = (on: boolean) =>
    cn(
      'inline-flex h-9 max-w-80 shrink-0 items-center gap-2 rounded-md border px-3 text-sm whitespace-nowrap transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
      on ? 'border-primary bg-background text-foreground shadow-sm' : 'bg-background text-muted-foreground hover:bg-accent hover:text-foreground',
    );
  const mainLed = channelLed(repo.preview.status);

  return (
    <div ref={bar} role="tablist" aria-label="Channels" className="-mx-1 flex gap-2 overflow-x-auto px-1 py-1" onKeyDown={onKeyDown}>
      <button
        role="tab"
        aria-selected={channel == null}
        tabIndex={channel == null ? 0 : -1}
        className={chip(channel == null)}
        onClick={() => onPick(null)}
        title={`The project's app on ${repo.defaultBranch}`}
      >
        <StatusDot tone={LED_TONE[mainLed]} label={LED_LABEL[mainLed]} />
        <GitBranch className="size-4" aria-hidden />
        <span className="font-medium">{repo.defaultBranch}</span>
      </button>
      {pulls.map((p) => {
        const rec = qa[qaKey(repo.id, p.number)];
        const led = channelLed(prPreviews[qaKey(repo.id, p.number)]?.status);
        const on = channel === p.number;
        return (
          <button key={p.number} role="tab" aria-selected={on} tabIndex={on ? 0 : -1} className={chip(on)} onClick={() => onPick(p.number)} title={channelLabel(p, rec, 200)}>
            <StatusDot tone={LED_TONE[led]} label={LED_LABEL[led]} />
            <GitPullRequest className="size-4 shrink-0" aria-hidden />
            <span className="font-medium tabular-nums">#{p.number}</span>
            <span className="min-w-0 truncate">{p.title}</span>
            {rec && <StatusBadge kind="qa" status={rec.status} />}
          </button>
        );
      })}
      {pulls.length === 0 && (
        <p className="self-center px-1 text-sm text-muted-foreground">No open pull requests. Each one gets a channel here, to try it beside {repo.defaultBranch}.</p>
      )}
    </div>
  );
}
