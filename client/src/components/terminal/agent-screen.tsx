import { History } from 'lucide-react';
import type { LogLine } from '../../../../shared/types';
import { activityLabel } from '@/lib/agents';
import { cn } from '@/lib/utils';
import { useStore } from '@/store';
import { LiveTerminal } from './live-terminal';
import { LogView } from './log-view';

// What an agent's screen is: their live terminal, or (the Agent SDK runtime has none) their log lines. The page that
// shows it registers the agent with useWatchAgents, so the office sends the lines. While the time-lapse plays, what
// the journal has instead: terminal output is never recorded, only what they were doing.

const NONE: LogLine[] = [];

export function AgentScreen({ agentId, compact = false, className }: { agentId: string; compact?: boolean; className?: string }) {
  const agent = useStore((s) => s.agents[agentId]);
  const lines = useStore((s) => s.logs[agentId]) ?? NONE;
  const replaying = useStore((s) => s.replaying);
  if (!agent) return null;
  if (replaying) {
    const doing = activityLabel(agent);
    return (
      <div className={cn('flex min-h-0 flex-col items-center justify-center gap-2 rounded-md border border-dashed bg-muted/30 p-4 text-center text-sm', className)}>
        <History className="size-5 text-muted-foreground" aria-hidden />
        <p className="font-medium">Terminal output isn't recorded</p>
        <p className="max-w-sm text-muted-foreground">{doing ? `At this moment ${agent.name} was: ${doing}.` : 'The journal keeps what agents were doing, not their screens.'} Go back to live to see the terminal.</p>
      </div>
    );
  }
  if (agent.terminal) return <LiveTerminal agentId={agent.id} name={agent.name} compact={compact} className={className} />;
  return <LogView lines={lines} name={agent.name} footer={activityLabel(agent) || undefined} className={className} />;
}
