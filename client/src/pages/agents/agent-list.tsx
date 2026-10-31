import { memo } from 'react';
import { Link } from 'react-router';
import type { LogLine } from '../../../../shared/types';
import { Activity, LastError, LatestLine, Machine, SetupLine, TaskLink, usageText } from '@/components/agents/agent-bits';
import { StatusBadge } from '@/components/shared/status-badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { links } from '@/lib/links';
import type { Agent } from '@/store';

// One section's agents as a table (columns drop away as the screen narrows) or as cards. Rows are memoised on the
// agent and their latest line: an event about one agent re-renders one row, not a hundred and fifty.

export function AgentTable({ agents, latest }: { agents: Agent[]; latest: Record<string, LogLine> }) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <Table className="table-fixed">
        <TableHeader>
          <TableRow>
            <TableHead className="sm:w-[30%] lg:w-[22%]">Agent</TableHead>
            <TableHead className="w-28">Status</TableHead>
            <TableHead className="hidden sm:table-cell">Task</TableHead>
            <TableHead className="hidden md:table-cell">Activity</TableHead>
            <TableHead className="hidden w-36 xl:table-cell">Cost · turns</TableHead>
            <TableHead className="hidden w-44 lg:table-cell">Machine</TableHead>
            <TableHead className="hidden 2xl:table-cell">Latest</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {agents.map((a) => (
            <AgentRow key={a.id} agent={a} latest={latest[a.id]} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

const AgentRow = memo(function AgentRow({ agent, latest }: { agent: Agent; latest: LogLine | undefined }) {
  return (
    <TableRow>
      <TableCell className="align-top">
        <div className="flex min-w-0 flex-col gap-0.5">
          <Link to={links.agent(agent.id)} className="truncate font-medium hover:underline focus-visible:underline">
            {agent.name}
            {agent.role === 'ceo' && <span className="ml-2 text-xs font-normal text-muted-foreground">CEO</span>}
          </Link>
          <SetupLine agent={agent} />
          <TaskLink agent={agent} className="text-xs sm:hidden" />
          <LatestLine line={latest} className="2xl:hidden" />
        </div>
      </TableCell>
      <TableCell className="align-top">
        <div className="flex min-w-0 flex-col items-start gap-1">
          <StatusBadge kind="agent" status={agent.status} />
          <LastError agent={agent} className="max-w-full" />
        </div>
      </TableCell>
      <TableCell className="hidden align-top sm:table-cell">
        <TaskLink agent={agent} />
      </TableCell>
      <TableCell className="hidden align-top md:table-cell">
        <Activity agent={agent} className="block" />
      </TableCell>
      <TableCell className="hidden align-top text-muted-foreground tabular-nums xl:table-cell">{usageText(agent)}</TableCell>
      <TableCell className="hidden align-top lg:table-cell">
        <Machine agent={agent} />
      </TableCell>
      <TableCell className="hidden align-top 2xl:table-cell">
        <LatestLine line={latest} />
      </TableCell>
    </TableRow>
  );
});

export function AgentCards({ agents, latest }: { agents: Agent[]; latest: Record<string, LogLine> }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {agents.map((a) => (
        <AgentCard key={a.id} agent={a} latest={latest[a.id]} />
      ))}
    </div>
  );
}

const AgentCard = memo(function AgentCard({ agent, latest }: { agent: Agent; latest: LogLine | undefined }) {
  return (
    <Card className="min-w-0 gap-3 py-4">
      <CardHeader className="flex min-w-0 items-start justify-between gap-2 px-4">
        <div className="flex min-w-0 flex-col gap-0.5">
          <Link to={links.agent(agent.id)} className="truncate font-medium hover:underline focus-visible:underline">
            {agent.name}
            {agent.role === 'ceo' && <span className="ml-2 text-xs font-normal text-muted-foreground">CEO</span>}
          </Link>
          <SetupLine agent={agent} />
        </div>
        <StatusBadge kind="agent" status={agent.status} className="shrink-0" />
      </CardHeader>
      <CardContent className="flex min-w-0 flex-col gap-1.5 px-4 text-sm">
        <TaskLink agent={agent} />
        <Activity agent={agent} className="block text-muted-foreground" />
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs">
          <Machine agent={agent} />
          <span className="text-muted-foreground tabular-nums">{usageText(agent)}</span>
        </div>
        <LastError agent={agent} />
        <LatestLine line={latest} className="rounded bg-muted/50 px-2 py-1" />
      </CardContent>
    </Card>
  );
});
