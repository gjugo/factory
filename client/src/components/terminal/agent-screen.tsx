import type { LogLine } from '../../../../shared/types';
import { activityLabel } from '@/lib/agents';
import { useStore } from '@/store';
import { LiveTerminal } from './live-terminal';
import { LogView } from './log-view';

// What an agent's screen is: their live terminal, or (the Agent SDK runtime has none) their log lines. The page that
// shows it registers the agent with useWatchAgents, so the office sends the lines.

const NONE: LogLine[] = [];

export function AgentScreen({ agentId, compact = false, className }: { agentId: string; compact?: boolean; className?: string }) {
  const agent = useStore((s) => s.agents[agentId]);
  const lines = useStore((s) => s.logs[agentId]) ?? NONE;
  if (!agent) return null;
  if (agent.terminal) return <LiveTerminal agentId={agent.id} name={agent.name} compact={compact} className={className} />;
  return <LogView lines={lines} name={agent.name} footer={activityLabel(agent) || undefined} className={className} />;
}
