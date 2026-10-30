import { FolderGit2, Plus } from 'lucide-react';
import { Link } from 'react-router';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { StatusDot } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { HEALTH_LOOK, useProjectRows } from '@/hooks/use-project-rows';
import { links } from '@/lib/links';
import { floorPrCounts, useStore } from '@/store';

/** /: mission control. A placeholder until the overview's issue lands: each project's pipeline at a glance. */
export default function OverviewPage() {
  const loaded = useStore((s) => s.loaded);
  const qa = useStore((s) => s.qa);
  const rows = useProjectRows();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Overview" description="Every project's pipeline and what needs you." />
      {!loaded ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-32" />)}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
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
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((row) => {
            const counts = floorPrCounts(row.repo, qa);
            return (
              <Card key={row.repo.id} className="gap-3">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <StatusDot tone={HEALTH_LOOK[row.health].tone} label={HEALTH_LOOK[row.health].label} />
                    <Link to={links.board(row.repo.id)} className="truncate rounded-sm hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
                      {row.name}
                    </Link>
                  </CardTitle>
                  <CardDescription className="truncate">{row.repo.summary || row.repo.fullName}</CardDescription>
                </CardHeader>
                <CardContent>
                  <dl className="grid grid-cols-4 gap-2 text-center">
                    {[
                      ['Backlog', row.repo.issues.length],
                      ['Working', row.working],
                      ['In QA', counts.inQa],
                      ['Needs you', row.needsYou],
                    ].map(([label, n]) => (
                      <div key={label} className="rounded-md bg-muted/60 px-1 py-2">
                        <dt className="text-[11px] text-muted-foreground">{label}</dt>
                        <dd className="text-lg font-semibold tabular-nums">{n}</dd>
                      </div>
                    ))}
                  </dl>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
