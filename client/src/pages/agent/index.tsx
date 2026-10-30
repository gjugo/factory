import { KeyRound } from 'lucide-react';
import { Link, useParams, useSearchParams } from 'react-router';
import { Activity, LastError, Machine, SetupLine, TaskLink, usageText } from '@/components/agents/agent-bits';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/shared/status-badge';
import { AgentScreen } from '@/components/terminal/agent-screen';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useWatchAgents } from '@/hooks/use-watch';
import { isBusyStatus, signInFor } from '@/lib/agents';
import { links, parseAgentTab, type AgentTab } from '@/lib/links';
import { useStore, type Agent } from '@/store';
import { AgentActions } from './agent-actions';
import { PromptTab, RecordTab, ScreenTab } from './info-tabs';
import { MessageBox } from './message-box';
import { SettingsTab } from './settings-tab';

// /agents/:id (the CEO is /agents/ceo): an agent's header and actions, then tabs (?tab=): their terminal with a
// message box, their setup, their prompt, their browser's screen and their record. Only the open tab is mounted, so
// their terminal and lines stream only while the Terminal tab is up.

const TABS: { value: AgentTab; label: string }[] = [
  { value: 'terminal', label: 'Terminal' },
  { value: 'settings', label: 'Settings' },
  { value: 'prompt', label: 'Prompt' },
  { value: 'screen', label: 'Screen' },
  { value: 'record', label: 'Record' },
];

export default function AgentPage() {
  const id = useParams().id ?? '';
  const [params, setParams] = useSearchParams();
  const tab = parseAgentTab(params.get('tab'));
  const loaded = useStore((s) => s.loaded);
  const agent = useStore((s) => s.agents[id]);
  if (!loaded) return <Skeleton className="h-64" />;
  if (!agent) {
    return (
      <EmptyState
        title="Agent not found"
        description="They may have left the team."
        action={
          <Button asChild variant="outline">
            <Link to={links.agents()}>All agents</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
      <PageHeader
        title={
          <span className="flex min-w-0 items-center gap-3">
            <span className="truncate">{agent.name}</span>
            <StatusBadge kind="agent" status={agent.status} />
          </span>
        }
        description={<SetupLine agent={agent} className="block text-sm" />}
        actions={<AgentActions agent={agent} />}
      />
      <AgentFacts agent={agent} />
      <Tabs value={tab} onValueChange={(v) => setParams((p) => (v === 'terminal' ? (p.delete('tab'), p) : (p.set('tab', v), p)), { replace: true })} className="min-h-0 min-w-0 flex-1 gap-4">
        <div className="max-w-full overflow-x-auto">
          <TabsList>
            {TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        <TabsContent value="terminal" className="flex min-h-0 flex-col gap-3">
          <TerminalTab agent={agent} />
        </TabsContent>
        <TabsContent value="settings">
          <SettingsTab agent={agent} />
        </TabsContent>
        <TabsContent value="prompt">
          <PromptTab agent={agent} />
        </TabsContent>
        <TabsContent value="screen">
          <ScreenTab agent={agent} />
        </TabsContent>
        <TabsContent value="record">
          <RecordTab agent={agent} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/** Their task, activity and cost, where they work, a sign-in waiting on the manager and their last error. */
function AgentFacts({ agent }: { agent: Agent }) {
  const defaultCli = useStore((s) => s.settings.defaultCli);
  const signIn = signInFor(agent, { defaultCli });
  return (
    <div className="flex flex-col gap-3">
      <dl className="grid min-w-0 grid-cols-2 gap-x-6 gap-y-2 text-sm lg:grid-cols-4">
        <Fact label="Task">
          <TaskLink agent={agent} />
        </Fact>
        <Fact label="Activity">
          <Activity agent={agent} className="block" />
        </Fact>
        <Fact label="Cost · turns">
          <span className="tabular-nums">{usageText(agent)}</span>
        </Fact>
        <Fact label="Machine">
          <Machine agent={agent} />
        </Fact>
      </dl>
      {signIn && (
        <div role="status" className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-sm">
          <KeyRound className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
          <p>
            <span className="font-medium">Sign {agent.name}'s {signIn} in.</span>{' '}
            {signIn === 'Codex'
              ? 'Open the link in their terminal, sign in to ChatGPT there and enter the one-time code the terminal shows.'
              : 'Open the link in their terminal, approve it with your Claude account, then paste the code the page gives you into the terminal and press Enter.'}{' '}
            Their cloud machine keeps the sign-in{agent.task && isBusyStatus(agent.status) ? ', and their task starts once it’s done' : ''}.
          </p>
        </div>
      )}
      {agent.lastError && !isBusyStatus(agent.status) && !signIn && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2">
          <LastError agent={agent} className="text-sm" />
        </div>
      )}
    </div>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}

function TerminalTab({ agent }: { agent: Agent }) {
  useWatchAgents([agent.id]);
  return (
    <>
      <AgentScreen agentId={agent.id} className="h-[calc(100dvh-26rem)] min-h-80" />
      <MessageBox agent={agent} />
    </>
  );
}
