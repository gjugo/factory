import { Bot } from 'lucide-react';
import { Link } from 'react-router';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/shared/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { projectName } from '@/hooks/use-project-rows';
import { useWorkersWatch } from '@/hooks/use-watch';
import { links } from '@/lib/links';
import { useStore } from '@/store';

/** /agents: everyone, with what they're doing right now. A placeholder until the agents issue lands. */
export default function AgentsPage() {
  useWorkersWatch();
  const agents = useStore((s) => s.agents);
  const repos = useStore((s) => s.repos);
  const latest = useStore((s) => s.latest);
  const list = Object.values(agents).sort((a, b) => (a.role === 'ceo' ? -1 : b.role === 'ceo' ? 1 : a.name.localeCompare(b.name)));
  const project = (id: string) => {
    const r = repos.find((x) => x.id === id);
    return r ? projectName(r) : '';
  };
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Agents" description="Your team across every project, and what each is doing." />
      {list.length === 0 ? (
        <EmptyState icon={Bot} title="No agents yet" description="Add a project and its first agent joins." />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agent</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Project</TableHead>
                <TableHead className="hidden lg:table-cell">Latest</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>
                    <Link to={links.agent(a.id)} className="font-medium hover:underline">
                      {a.name}
                    </Link>
                    {a.role === 'ceo' && <span className="ml-2 text-xs text-muted-foreground">CEO</span>}
                  </TableCell>
                  <TableCell>
                    <StatusBadge kind="agent" status={a.status} />
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">{a.role === 'ceo' ? '—' : project(a.repoId)}</TableCell>
                  <TableCell className="hidden max-w-md truncate font-mono text-xs text-muted-foreground lg:table-cell">{latest[a.id]?.text ?? ''}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
