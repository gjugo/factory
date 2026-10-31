import { useEffect } from 'react';
import { Bot, LayoutGrid, LayoutList, Table2 } from 'lucide-react';
import { Link, useSearchParams } from 'react-router';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { projectName } from '@/hooks/use-project-rows';
import { useWorkersWatch } from '@/hooks/use-watch';
import { STATUS_FILTERS, defaultGridPicks, groupAgents, parseGridIds, parseStatusFilter, presentIds } from '@/lib/agents';
import { links } from '@/lib/links';
import { useStore, type Agent } from '@/store';
import { AddAgentButton } from './add-agent-dialog';
import { AgentCards, AgentTable } from './agent-list';
import { TerminalGrid } from './terminal-grid';

// /agents: the whole team grouped by project with the CEO on top, as a table or cards, filtered by project and status
// (all in the URL: ?project=, ?status=, ?view=). ?view=grid is the terminal grid instead.

type View = 'table' | 'cards' | 'grid';
const VIEWS: View[] = ['table', 'cards', 'grid'];
const ALL = 'all';

export default function AgentsPage() {
  const [params, setParams] = useSearchParams();
  const view: View = VIEWS.includes(params.get('view') as View) ? (params.get('view') as View) : 'table';
  const agents = useStore((s) => s.agents);
  const loaded = useStore((s) => s.loaded);

  const set = (patch: Record<string, string | null>) =>
    setParams(
      (p) => {
        const next = new URLSearchParams(p);
        for (const [k, v] of Object.entries(patch)) {
          if (v === null) next.delete(k);
          else next.set(k, v);
        }
        return next;
      },
      { replace: true },
    );

  // The grid with nobody picked yet starts on the busiest agents.
  const noPicks = view === 'grid' && !params.has('ids');
  useEffect(() => {
    if (noPicks && loaded) set({ ids: defaultGridPicks(useStore.getState().agents).join(',') });
  }, [noPicks, loaded]);
  const gridIds = presentIds(parseGridIds(params.get('ids')), agents);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <PageHeader
        title="Agents"
        description="Your team across every project: what each is doing, and their terminals."
        actions={
          <ToggleGroup type="single" variant="outline" size="sm" value={view} onValueChange={(v) => v && set({ view: v === 'table' ? null : v })} aria-label="View">
            <ToggleGroupItem value="table" aria-label="Table">
              <Table2 /> <span className="hidden sm:inline">Table</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="cards" aria-label="Cards">
              <LayoutList /> <span className="hidden sm:inline">Cards</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="grid" aria-label="Terminal grid">
              <LayoutGrid /> <span className="hidden sm:inline">Terminals</span>
            </ToggleGroupItem>
          </ToggleGroup>
        }
      />
      {view === 'grid' ? (
        <TerminalGrid ids={gridIds} onChange={(ids) => set({ ids: ids.join(',') })} />
      ) : (
        <AgentSections cards={view === 'cards'} project={params.get('project') ?? ''} status={params.get('status')} onFilter={set} />
      )}
    </div>
  );
}

function AgentSections({ cards, project, status: statusParam, onFilter }: { cards: boolean; project: string; status: string | null; onFilter: (p: Record<string, string | null>) => void }) {
  useWorkersWatch();
  const agents = useStore((s) => s.agents);
  const repos = useStore((s) => s.repos);
  const latest = useStore((s) => s.latest);
  const max = useStore((s) => s.settings.maxAgents);
  const status = parseStatusFilter(statusParam);
  const groups = groupAgents(agents, repos, project, status);
  const teamSize = (repoId: string) => Object.values(agents).filter((a) => a.repoId === repoId && a.role !== 'ceo').length;
  const show = (list: Agent[]) => (cards ? <AgentCards agents={list} latest={latest} /> : <AgentTable agents={list} latest={latest} />);
  const nothing = !groups.ceo && groups.projects.every((g) => g.agents.length === 0);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Select value={project || ALL} onValueChange={(v) => onFilter({ project: v === ALL ? null : v })}>
          <SelectTrigger size="sm" className="w-full sm:w-56" aria-label="Project">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All projects</SelectItem>
            <SelectItem value="ceo">The CEO</SelectItem>
            {repos.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {projectName(r)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => onFilter({ status: v === ALL ? null : v })}>
          <SelectTrigger size="sm" className="w-full sm:w-40" aria-label="Status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTERS.map((f) => (
              <SelectItem key={f.value} value={f.value}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {nothing && groups.projects.length === 0 && (
        <EmptyState icon={Bot} title={Object.keys(agents).length ? 'Nobody matches' : 'No agents yet'} description={Object.keys(agents).length ? 'Try another project or status.' : 'Add a project and its first agent joins.'} />
      )}

      {groups.ceo && (
        <section aria-labelledby="agents-ceo" className="flex flex-col gap-3">
          <h2 id="agents-ceo" className="text-sm font-semibold">
            CEO
          </h2>
          {show([groups.ceo])}
        </section>
      )}

      {groups.projects.map(({ repo, agents: list }) => {
        const size = teamSize(repo.id);
        const headingId = `agents-${repo.floor}`;
        return (
          <section key={repo.id} aria-labelledby={headingId} className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id={headingId} className="flex min-w-0 items-baseline gap-2 text-sm font-semibold">
                <Link to={links.board(repo.id)} className="truncate hover:underline focus-visible:underline">
                  {projectName(repo)}
                </Link>
                <span className="font-normal text-muted-foreground tabular-nums">
                  {size} / {max} agents
                </span>
              </h2>
              <AddAgentButton repo={repo} teamSize={size} />
            </div>
            {list.length ? show(list) : <p className="text-sm text-muted-foreground">Nobody on this project matches.</p>}
          </section>
        );
      })}
    </>
  );
}
