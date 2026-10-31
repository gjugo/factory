import { ArrowDown, ArrowUp, ArrowUpDown, FolderGit2, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { EmptyState } from '@/components/shared/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { projectName } from '@/hooks/use-project-rows';
import { links } from '@/lib/links';
import { cn } from '@/lib/utils';
import { fmtDuration, fmtPct } from '@/ops';
import { useStore } from '@/store';
import { nextSort, sortFloors, type FloorRow, type Sort, type SortKey } from './overview';
import { PipelineBar } from './pipeline-bar';

// Every project's numbers from ops.floors, sortable; a row opens the project's board. It scrolls inside its card.

const COLUMNS: { key: SortKey; label: string; hint?: string; numeric?: boolean }[] = [
  { key: 'name', label: 'Project' },
  { key: 'pipeline', label: 'Pipeline', hint: 'Ready, building, in QA, fixing, to merge, needs you' },
  { key: 'mergedToday', label: 'Today', hint: 'Merged today (and in the last hour)', numeric: true },
  { key: 'lead', label: 'Lead', hint: 'Median issue → merge over the last 24 hours', numeric: true },
  { key: 'qaPass', label: 'QA pass', hint: 'QA rounds passed over 7 days', numeric: true },
  { key: 'team', label: 'Team', hint: 'Busy · idle · errors' },
  { key: 'alarms', label: 'Alarms', numeric: true },
];

function SortHead({ col, sort, onSort }: { col: (typeof COLUMNS)[number]; sort: Sort; onSort: (key: SortKey) => void }) {
  const active = sort.key === col.key;
  const Icon = !active ? ArrowUpDown : sort.desc ? ArrowDown : ArrowUp;
  return (
    <TableHead aria-sort={active ? (sort.desc ? 'descending' : 'ascending') : 'none'} className={cn('bg-card', col.numeric && 'text-right')}>
      <Button variant="ghost" size="sm" className={cn('-mx-2 h-7 px-2 font-medium', col.numeric && 'ml-auto flex')} title={col.hint} onClick={() => onSort(col.key)}>
        {col.label}
        <Icon className={cn('size-3.5', !active && 'text-muted-foreground/60')} aria-hidden />
      </Button>
    </TableHead>
  );
}

export function ProjectsTable() {
  const floors = useStore((s) => s.ops.floors);
  const repos = useStore((s) => s.repos);
  const navigate = useNavigate();
  const [sort, setSort] = useState<Sort>({ key: 'name', desc: false });
  const rows = useMemo(() => {
    const named: FloorRow[] = floors.map((floor) => {
      const repo = repos.find((r) => r.id === floor.repoId);
      return { floor, name: repo ? projectName(repo) : floor.repoId };
    });
    return sortFloors(named, sort);
  }, [floors, repos, sort]);

  return (
    <Card className="gap-3 pb-0">
      <CardHeader>
        <CardTitle>Projects</CardTitle>
        <CardDescription>Each project's pipeline and numbers. Open one for its board.</CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        {rows.length === 0 ? (
          <EmptyState
            className="mx-6 mb-6"
            icon={FolderGit2}
            title="No projects yet"
            description="Connect a GitHub repository and the agents get to work on its issues."
            action={
              <Button asChild>
                <Link to={links.addProject()}>
                  <Plus aria-hidden /> Add a project
                </Link>
              </Button>
            }
          />
        ) : (
          // One scroll box for both directions, so the header stays put while the rows scroll.
          <div tabIndex={0} aria-label="Projects table" className="max-h-[30rem] overflow-auto border-t focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none [&_[data-slot=table-container]]:overflow-visible">
            <Table className="min-w-[40rem]">
              <TableHeader className="sticky top-0 z-10 bg-card">
                <TableRow className="hover:bg-transparent">
                  {COLUMNS.map((c) => (
                    <SortHead key={c.key} col={c} sort={sort} onSort={(key) => setSort((cur) => nextSort(cur, key))} />
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(({ floor: f, name }) => (
                  <TableRow key={f.repoId} className="cursor-pointer" onClick={() => navigate(links.board(f.repoId))}>
                    <TableCell className="max-w-56 pl-4">
                      <Link
                        to={links.board(f.repoId)}
                        className="flex min-w-0 items-center gap-2 rounded-sm font-medium hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="flex size-5 shrink-0 items-center justify-center rounded bg-muted text-[11px] text-muted-foreground tabular-nums" title={`Floor ${f.floor}`}>
                          {f.floor}
                        </span>
                        <span className="truncate">{name}</span>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <PipelineBar numbers={f} className="w-28" />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {f.mergedToday}
                      {f.mergedHour > 0 && <span className="ml-1 text-xs text-muted-foreground" title="In the last hour">{f.mergedHour} last h</span>}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{fmtDuration(f.leadMs)}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtPct(f.qaPass)}</TableCell>
                    <TableCell className="text-xs tabular-nums">
                      <span title={`${f.busy} busy · ${f.idle} idle · ${f.errors} in error`}>
                        {f.busy} busy · {f.idle} idle
                        {f.errors > 0 && <span className="text-destructive"> · {f.errors} err</span>}
                      </span>
                    </TableCell>
                    <TableCell className="pr-4 text-right">
                      {f.alarms > 0 ? (
                        <Badge variant="outline" className="border-destructive/30 bg-destructive/10 text-destructive tabular-nums">
                          {f.alarms}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground tabular-nums">0</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
