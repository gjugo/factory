import { FolderGit2, Plus } from 'lucide-react';
import { Link, useSearchParams } from 'react-router';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { RelativeTime } from '@/components/shared/relative-time';
import { StatusDot } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { HEALTH_LOOK, useProjectRows } from '@/hooks/use-project-rows';
import { links } from '@/lib/links';

/** /projects: every project (a cubefarm floor), and ?add=1 to add one. A placeholder until the projects issue lands. */
export default function ProjectsPage() {
  const rows = useProjectRows();
  const [params, setParams] = useSearchParams();
  const adding = params.get('add') === '1';
  const setAdding = (open: boolean) => setParams(open ? { add: '1' } : {}, { replace: true });
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
        <EmptyState icon={FolderGit2} title="No projects yet" description="Add a GitHub repository to get started." />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead className="hidden sm:table-cell">Status</TableHead>
                <TableHead className="text-right">Open issues</TableHead>
                <TableHead className="hidden text-right md:table-cell">Last sync</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.repo.id}>
                  <TableCell>
                    <Link to={links.board(row.repo.id)} className="flex items-center gap-2 font-medium hover:underline">
                      <StatusDot tone={HEALTH_LOOK[row.health].tone} label={HEALTH_LOOK[row.health].label} className="sm:hidden" />
                      {row.repo.fullName}
                    </Link>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <StatusDot tone={HEALTH_LOOK[row.health].tone} label={HEALTH_LOOK[row.health].label} />
                      {HEALTH_LOOK[row.health].label}
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{row.repo.issues.length}</TableCell>
                  <TableCell className="hidden text-right text-muted-foreground md:table-cell">
                    <RelativeTime at={row.repo.lastSync} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add a project</DialogTitle>
            <DialogDescription>Connecting a GitHub repository or a local folder arrives with the projects screen.</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
}
