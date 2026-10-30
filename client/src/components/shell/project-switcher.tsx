import { ChevronsUpDown, Plus } from 'lucide-react';
import { useNavigate } from 'react-router';
import { StatusDot } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { HEALTH_LOOK, projectName, useProjectRows } from '@/hooks/use-project-rows';
import { useRouteRepo } from '@/hooks/use-route-repo';
import { links } from '@/lib/links';

/** Jump to another project's board; the current one is named on the button. */
export function ProjectSwitcher() {
  const rows = useProjectRows();
  const { repoId, repo } = useRouteRepo();
  const navigate = useNavigate();
  const current = repo ? projectName(repo) : repoId ? repoId.split('/')[1] : 'All projects';
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="max-w-48 justify-between gap-2">
          <span className="truncate">{current}</span>
          <ChevronsUpDown className="size-3.5 opacity-60" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-60">
        <DropdownMenuLabel>Projects</DropdownMenuLabel>
        {rows.map((row) => (
          <DropdownMenuItem key={row.repo.id} onSelect={() => navigate(links.board(row.repo.id))}>
            <StatusDot tone={HEALTH_LOOK[row.health].tone} label={HEALTH_LOOK[row.health].label} />
            <span className="truncate">{row.name}</span>
            {row.needsYou > 0 && <span className="ml-auto text-xs text-destructive">{row.needsYou}</span>}
          </DropdownMenuItem>
        ))}
        {rows.length > 0 && <DropdownMenuSeparator />}
        <DropdownMenuItem onSelect={() => navigate(links.addProject())}>
          <Plus aria-hidden />
          Add a project
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
