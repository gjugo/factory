import { Link, useParams } from 'react-router';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useWatchAgents } from '@/hooks/use-watch';
import { links } from '@/lib/links';
import { useStore } from '@/store';

/** /agents/:id (the CEO too): an agent's terminal and work. A placeholder until the agent issue lands: their log lines. */
export default function AgentPage() {
  const id = useParams().id ?? '';
  useWatchAgents([id]);
  const loaded = useStore((s) => s.loaded);
  const agent = useStore((s) => s.agents[id]);
  const log = useStore((s) => s.logs[id]);
  if (!loaded) return <Skeleton className="h-64" />;
  if (!agent) return <EmptyState title="Agent not found" description="They may have left the team." action={<Button asChild variant="outline"><Link to={links.agents()}>All agents</Link></Button>} />;
  const doing = agent.issueNumber ? `#${agent.issueNumber} ${agent.issueTitle ?? ''}` : agent.role === 'ceo' ? 'Runs the office' : 'Nothing assigned';
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <PageHeader title={agent.name} description={doing} actions={<StatusBadge kind="agent" status={agent.status} />} />
      <Card className="min-h-0 flex-1 gap-2">
        <CardHeader>
          <CardTitle className="text-sm">Terminal</CardTitle>
        </CardHeader>
        <CardContent className="min-h-0">
          <ScrollArea className="h-80 rounded-md bg-muted/50">
            <pre className="p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap" aria-label={`${agent.name}'s latest lines`}>
              {(log ?? []).slice(-200).map((l) => l.text).join('\n') || 'Nothing yet.'}
            </pre>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
