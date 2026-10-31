import { CirclePause, RefreshCw, TriangleAlert, Turtle, WifiOff } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { officeUpdateChip } from '@/officeUpdate';
import { usageChip } from '@/ops';
import { useStore } from '@/store';

// What the manager must know before anything else on the page: the office is out of reach (or restarting to update),
// GitHub isn't ready, an update is on its way, or Claude's usage has new work paused or paced.

function Banner({ tone, icon, children }: { tone: 'danger' | 'warning' | 'info'; icon: ReactNode; children: ReactNode }) {
  const look = { danger: 'border-destructive/30 bg-destructive/10 text-destructive', warning: 'border-warning/30 bg-warning/10 text-warning', info: 'border-info/30 bg-info/10 text-info' }[tone];
  return (
    <div role="status" className={cn('flex items-center gap-2 border-b px-4 py-2 text-sm', look)}>
      <span className="shrink-0" aria-hidden>
        {icon}
      </span>
      <span className="min-w-0">{children}</span>
    </div>
  );
}

export function Banners() {
  const connected = useStore((s) => s.connected);
  const loaded = useStore((s) => s.loaded);
  const restarting = useStore((s) => s.restarting);
  const officeUpdate = useStore((s) => s.officeUpdate);
  const usage = useStore((s) => s.usage);
  const ghReady = useStore((s) => s.ghReady);
  const ghError = useStore((s) => s.ghError);
  const pacingSessions = useStore((s) => s.settings.pacingSessions);
  const update = officeUpdateChip(officeUpdate);
  const usageLine = usageChip(usage, pacingSessions, Date.now());
  return (
    <div>
      {!connected && restarting && (
        <Banner tone="info" icon={<RefreshCw className="size-4 animate-spin" />}>
          The office is restarting to update. It will be back in a moment…
        </Banner>
      )}
      {/* Before the first snapshot the pages show skeletons; a banner would only flash. */}
      {!connected && !restarting && loaded && (
        <Banner tone="danger" icon={<WifiOff className="size-4" />}>
          Lost the connection to the office. Reconnecting…
        </Banner>
      )}
      {connected && loaded && !ghReady && (
        <Banner tone="danger" icon={<TriangleAlert className="size-4" />}>
          GitHub isn't ready: {ghError ?? 'the office could not reach it.'} Projects can't sync until the GitHub CLI is signed in (gh auth login).
        </Banner>
      )}
      {connected && update && (
        <Banner tone="info" icon={<RefreshCw className="size-4" />}>
          {update.replace(/^⟳\s*/, '')}
        </Banner>
      )}
      {usageLine && (
        <Banner tone={usage.state === 'paused' ? 'danger' : 'warning'} icon={usage.state === 'paused' ? <CirclePause className="size-4" /> : <Turtle className="size-4" />}>
          {usageLine.replace(/^\S+\s/, '')}
        </Banner>
      )}
    </div>
  );
}
