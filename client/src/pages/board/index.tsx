import { useMemo } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { ProjectNav } from '@/components/shared/project-nav';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { projectName } from '@/hooks/use-project-rows';
import { links, parseCard, repoIdFrom } from '@/lib/links';
import { agentsOnRepo, kanbanFor, useStore } from '@/store';

const COLUMNS = [
  ['backlog', 'Backlog'],
  ['progress', 'In progress'],
  ['qa', 'In QA'],
  ['ready', 'Ready to merge'],
  ['merged', 'Merged'],
] as const;

/** /projects/:owner/:name: the project's Kanban board. A placeholder until the board's issue lands: column counts. */
export default function BoardPage() {
  const repoId = repoIdFrom(useParams());
  const [params] = useSearchParams();
  const card = parseCard(params.get('card'));
  const loaded = useStore((s) => s.loaded);
  const repo = useStore((s) => s.repos.find((r) => r.id === repoId));
  const agents = useStore((s) => s.agents);
  const qa = useStore((s) => s.qa);
  const usage = useStore((s) => s.usage);
  const cols = useMemo(() => (repo ? kanbanFor(repo, agentsOnRepo(agents, repo.id), qa, usage) : null), [repo, agents, qa, usage]);

  if (!loaded) return <Skeleton className="h-64" />;
  if (!repo || !cols) return <EmptyState title="Project not found" description={`${repoId ?? 'This project'} isn't connected to the office.`} action={<Button asChild variant="outline"><Link to={links.projects()}>All projects</Link></Button>} />;
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={projectName(repo)}
        description={repo.summary || repo.description || repo.fullName}
        actions={<ProjectNav repoId={repo.id} />}
      />
      {card && (
        <p className="text-sm text-muted-foreground">
          Card <Badge variant="secondary">{card.kind === 'pr' ? `PR #${card.number}` : `Issue #${card.number}`}</Badge> opens here once the board lands.
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {COLUMNS.map(([key, title]) => (
          <Card key={key} className="gap-2">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-sm">
                {title}
                <Badge variant="secondary" className="tabular-nums">
                  {cols[key].length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1 text-sm">
                {cols[key].slice(0, 5).map((c) => (
                  <li key={c.key} className="truncate text-muted-foreground">
                    #{c.number} {c.title}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
