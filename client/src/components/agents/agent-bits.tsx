import { AlertTriangle, Cloud, ExternalLink, KeyRound, Monitor } from 'lucide-react';
import { Link } from 'react-router';
import type { LogLine } from '../../../../shared/types';
import { Badge } from '@/components/ui/badge';
import { useNow } from '@/hooks/use-now';
import { activityLabel, cliLabel, costLabel, effortLabel, elapsedLabel, isBusyStatus, machineLabel, modelLabel, signInFor, taskInfo } from '@/lib/agents';
import { cn } from '@/lib/utils';
import { useStore, type Agent } from '@/store';

// The pieces that describe an agent, shared by the agents list (table and cards) and an agent's own page.

/** Their task as a badge ("Build", "QA", "Fix") and a link to its card on the board, plus their PR on GitHub. */
export function TaskLink({ agent, className }: { agent: Agent; className?: string }) {
  const task = taskInfo(agent);
  if (!task) return <span className={cn('text-muted-foreground', className)}>{agent.role === 'ceo' ? 'Runs the office' : 'Nothing assigned'}</span>;
  return (
    <span className={cn('flex min-w-0 items-center gap-1.5', className)}>
      <Badge variant="secondary" className="shrink-0">
        {task.label}
      </Badge>
      <Link to={task.href} className="truncate hover:underline focus-visible:underline">
        {task.text}
      </Link>
      {task.prUrl && (
        <a href={task.prUrl} target="_blank" rel="noreferrer" className="shrink-0 text-muted-foreground hover:text-foreground" aria-label="Pull request on GitHub" title="Pull request on GitHub">
          <ExternalLink className="size-3.5" />
        </a>
      )}
    </span>
  );
}

/** How long their session has run; ticks while they're busy. */
export function Elapsed({ agent }: { agent: Agent }) {
  return isBusyStatus(agent.status) ? <Ticking agent={agent} /> : <>{elapsedLabel(agent, Date.now())}</>;
}

function Ticking({ agent }: { agent: Agent }) {
  const now = useNow();
  return <>{elapsedLabel(agent, now)}</>;
}

/** "editing · store.ts · 4m 05s", or nothing while they have nothing on. */
export function Activity({ agent, className }: { agent: Agent; className?: string }) {
  const doing = activityLabel(agent);
  const timed = !!agent.startedAt && agent.status !== 'idle';
  if (!doing && !timed) return <span className={cn('text-muted-foreground', className)}>—</span>;
  return (
    <span className={cn('min-w-0 truncate', className)}>
      {doing}
      {doing && timed ? ' · ' : ''}
      {timed ? (
        <span className="text-muted-foreground tabular-nums">
          <Elapsed agent={agent} />
        </span>
      ) : null}
    </span>
  );
}

/** "$1.24 · 38 turns". */
export const usageText = (a: Agent) => `${costLabel(a.costUsd)} · ${a.turns} turn${a.turns === 1 ? '' : 's'}`;

/** "Claude Code · claude-opus-5-5 · high". */
export function SetupLine({ agent, className }: { agent: Agent; className?: string }) {
  const settings = useStore((s) => s.settings);
  const clis = useStore((s) => s.clis);
  return (
    <span className={cn('truncate text-xs text-muted-foreground', className)}>
      {agent.role === 'ceo' ? 'Claude Code' : cliLabel(agent, settings, clis)} · {modelLabel(agent, settings)} · {effortLabel(agent, settings)}
    </span>
  );
}

/** Where they work, and a badge when their coding agent waits to be signed in. */
export function Machine({ agent, className }: { agent: Agent; className?: string }) {
  const defaultCli = useStore((s) => s.settings.defaultCli);
  const signIn = signInFor(agent, { defaultCli });
  const Icon = agent.host === 'box' ? Cloud : Monitor;
  return (
    <span className={cn('flex min-w-0 flex-wrap items-center gap-1.5', className)}>
      <span className="flex items-center gap-1 text-muted-foreground">
        <Icon className="size-3.5 shrink-0" aria-hidden />
        {machineLabel(agent)}
      </span>
      {signIn && (
        <Badge variant="outline" className="border-warning/30 bg-warning/10 text-warning">
          <KeyRound aria-hidden /> Needs sign-in
        </Badge>
      )}
    </span>
  );
}

/** Their last error, while it still says something (not while they're working again). */
export function LastError({ agent, className }: { agent: Agent; className?: string }) {
  if (!agent.lastError || isBusyStatus(agent.status)) return null;
  return (
    <span className={cn('flex min-w-0 items-center gap-1 text-xs text-destructive', className)} title={agent.lastError}>
      <AlertTriangle className="size-3.5 shrink-0" aria-hidden />
      <span className="truncate">{agent.lastError}</span>
    </span>
  );
}

/** Their latest line worth listing (useWorkersWatch has the office send everyone's). */
export function LatestLine({ line, className }: { line: LogLine | undefined; className?: string }) {
  return <span className={cn('block truncate font-mono text-xs text-muted-foreground', className)}>{line?.text || '—'}</span>;
}
