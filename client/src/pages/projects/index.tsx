import { FolderGit2, FolderSync, MoreHorizontal, Plus, RefreshCw, Settings2, Unplug } from 'lucide-react';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { api } from '@/api';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { RelativeTime } from '@/components/shared/relative-time';
import { StatusDot, ToneBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { HEALTH_LOOK, useProjectRows, type ProjectRow } from '@/hooks/use-project-rows';
import { links } from '@/lib/links';
import { checkoutLook } from '@/lib/projects';
import { agentsOnRepo, useStore } from '@/store';
import { AddProjectDialog } from './add-project-dialog';
import { attempt, disconnectProject } from './actions';

/** /projects: every project with its checkout, sync and automation, and ?add=1 to add one. */
export default function ProjectsPage() {
  const rows = useProjectRows();
  const [params, setParams] = useSearchParams();
  const adding = params.get('add') === '1';
  const setAdding = (open: boolean) => setParams(open ? { add: '1' } : {}, { replace: true });
  const sorted = [...rows].sort((a, b) => a.repo.number - b.repo.number);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Projects"
        description="The repositories your agents work on."
        actions={
          <Button onClick={() => setAdding(true)}>
            <Plus aria-hidden /> Add a project
          </Button>
        }
      />
      {rows.length === 0 ? (
        <EmptyState
          icon={FolderGit2}
          title="No projects yet"
          description="Connect a GitHub repository or a folder on this computer, or start something new."
          action={<Button onClick={() => setAdding(true)}>Add your first project</Button>}
        />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead className="hidden lg:table-cell">Checkout</TableHead>
                <TableHead className="hidden xl:table-cell">Folder sync</TableHead>
                <TableHead className="hidden md:table-cell">Last sync</TableHead>
                <TableHead className="hidden sm:table-cell">Automation</TableHead>
                <TableHead className="text-right">Team</TableHead>
                <TableHead className="w-10">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((row) => (
                <ProjectTableRow key={row.repo.id} row={row} />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <AddProjectDialog open={adding} onOpenChange={setAdding} />
    </div>
  );
}

function ProjectTableRow({ row }: { row: ProjectRow }) {
  const { repo } = row;
  const team = useStore((s) => agentsOnRepo(s.agents, repo.id).length);
  const maxAgents = useStore((s) => s.settings.maxAgents);
  const [busy, setBusy] = useState(false);
  const checkout = checkoutLook(repo);
  const run = async (fn: () => Promise<unknown>, done?: string) => {
    setBusy(true);
    const ok = (await attempt(fn)) !== undefined;
    setBusy(false);
    if (ok && done) useStore.getState().pushToast('success', done);
  };
  return (
    <TableRow>
      <TableCell className="max-w-44 whitespace-normal sm:max-w-72">
        <div className="flex min-w-0 items-center gap-2">
          <StatusDot tone={HEALTH_LOOK[row.health].tone} label={HEALTH_LOOK[row.health].label} />
          <Link to={links.board(repo.id)} className="truncate font-medium hover:underline">
            {repo.fullName}
          </Link>
        </div>
        {repo.summary && <p className="truncate pl-4 text-xs text-muted-foreground">{repo.summary}</p>}
        {repo.syncError && <p className="truncate pl-4 text-xs text-destructive md:hidden">Sync failed: {repo.syncError}</p>}
      </TableCell>
      <TableCell className="hidden max-w-56 lg:table-cell">
        <div className="flex flex-col items-start gap-1">
          <ToneBadge tone={checkout.tone} label={checkout.label} />
          <span className="max-w-full truncate font-mono text-xs text-muted-foreground" title={checkout.detail}>
            {checkout.detail}
          </span>
        </div>
      </TableCell>
      <TableCell className="hidden max-w-48 truncate text-muted-foreground xl:table-cell" title={repo.folderSync ?? undefined}>
        {repo.folderSync ?? '—'}
      </TableCell>
      <TableCell className="hidden max-w-48 md:table-cell">
        {repo.syncError ? (
          <span className="block truncate text-destructive" title={repo.syncError}>
            Failed: {repo.syncError}
          </span>
        ) : (
          <span className="text-muted-foreground">
            <RelativeTime at={repo.lastSync} />
          </span>
        )}
      </TableCell>
      <TableCell className="hidden sm:table-cell">
        <div className="flex flex-wrap gap-1">
          <ToneBadge tone={repo.autoAssign ? 'success' : 'neutral'} label={repo.autoAssign ? 'Auto-assign' : 'Manual assign'} />
          <ToneBadge tone={repo.autoMerge ? 'success' : 'neutral'} label={repo.autoMerge ? 'Auto-merge' : 'Manual merge'} />
        </div>
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {team}
        <span className="text-muted-foreground">/{maxAgents}</span>
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" disabled={busy} aria-label={`Actions for ${repo.fullName}`}>
              <MoreHorizontal aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => void run(() => api.syncRepo(repo.id), `${repo.fullName} synced with GitHub`)}>
              <RefreshCw aria-hidden /> Sync with GitHub
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => void run(() => api.syncFolder(repo.id))}>
              <FolderSync aria-hidden /> Sync folder
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to={links.projectSettings(repo.id)}>
                <Settings2 aria-hidden /> Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={() => void disconnectProject(repo)}>
              <Unplug aria-hidden /> Disconnect
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}
