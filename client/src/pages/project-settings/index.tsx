import { Unplug } from 'lucide-react';
import { useId } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { api } from '@/api';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { ProjectNav } from '@/components/shared/project-nav';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { projectName } from '@/hooks/use-project-rows';
import { links, repoIdFrom } from '@/lib/links';
import { useStore } from '@/store';
import type { RepoView } from '../../../../shared/types';
import { attempt, disconnectProject } from '../projects/actions';
import { BriefCard, ProfileCard } from './brief-card';
import { PreviewCard } from './preview-card';

/** /projects/:owner/:name/settings: a project's brief, profile, automation, linked projects and preview. */
export default function ProjectSettingsPage() {
  const repoId = repoIdFrom(useParams());
  const repo = useStore((s) => s.repos.find((r) => r.id === repoId));
  const loaded = useStore((s) => s.loaded);
  const navigate = useNavigate();
  if (!repo) {
    return loaded ? (
      <EmptyState
        title="No such project"
        description={`${repoId ?? 'This project'} isn't in the office. It may have been disconnected.`}
        action={
          <Button asChild variant="outline">
            <Link to={links.projects()}>All projects</Link>
          </Button>
        }
      />
    ) : null;
  }
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`${projectName(repo)} settings`}
        description={repo.fullName}
        actions={<ProjectNav repoId={repo.id} />}
      />
      <div className="grid min-w-0 gap-6 xl:grid-cols-2">
        <div className="grid min-w-0 content-start gap-6">
          <BriefCard repo={repo} />
          <ProfileCard repo={repo} />
          <AutomationCard repo={repo} />
          <LinksCard repo={repo} />
        </div>
        <div className="grid min-w-0 content-start gap-6">
          <PreviewCard repo={repo} />
          <Card className="border-destructive/40">
            <CardHeader>
              <CardTitle>Disconnect</CardTitle>
              <CardDescription>
                Its agents are let go. Nothing is deleted on GitHub, and {repo.localPath ? 'your folder stays as it is' : 'the clone stays on disk'}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="destructive" onClick={() => void disconnectProject(repo).then((gone) => gone && navigate(links.projects()))}>
                <Unplug aria-hidden /> Disconnect {projectName(repo)}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

const SWITCHES = [
  { key: 'autoAssign', label: 'Auto-assign issues', hint: 'Free agents pick up open issues on their own.' },
  { key: 'autoMerge', label: 'Auto-merge', hint: "A pull request merges once QA has signed off on its latest commit and GitHub's checks are green." },
  { key: 'browserTesting', label: 'Browser testing', hint: 'Agents and QA test the app in a real browser (Playwright MCP).' },
] as const;

function AutomationCard({ repo }: { repo: RepoView }) {
  const id = useId();
  return (
    <Card>
      <CardHeader>
        <CardTitle>Automation</CardTitle>
        <CardDescription>Saved as you switch them.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {SWITCHES.map((s) => (
          <div key={s.key} className="flex items-start justify-between gap-4">
            <div className="grid gap-1">
              <Label htmlFor={`${id}-${s.key}`}>{s.label}</Label>
              <p id={`${id}-${s.key}-hint`} className="text-xs text-muted-foreground">
                {s.hint}
              </p>
            </div>
            <Switch
              id={`${id}-${s.key}`}
              checked={repo[s.key]}
              aria-describedby={`${id}-${s.key}-hint`}
              onCheckedChange={(on) => void attempt(() => api.updateRepo(repo.id, { [s.key]: on }))}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function LinksCard({ repo }: { repo: RepoView }) {
  const others = useStore((s) => s.repos).filter((r) => r.id !== repo.id);
  const id = useId();
  const toggle = (other: string, on: boolean) =>
    void attempt(() => api.updateRepo(repo.id, { links: on ? [...repo.links, other] : repo.links.filter((l) => l !== other) }));
  return (
    <Card>
      <CardHeader>
        <CardTitle>Linked projects</CardTitle>
        <CardDescription>Projects this one's agents may read for context.</CardDescription>
      </CardHeader>
      <CardContent>
        {others.length === 0 ? (
          <p className="text-sm text-muted-foreground">There are no other projects to link yet.</p>
        ) : (
          <fieldset className="grid gap-3">
            <legend className="sr-only">Linked projects</legend>
            {others.map((o) => (
              <div key={o.id} className="flex items-center gap-2">
                <Checkbox id={`${id}-${o.number}`} checked={repo.links.includes(o.id)} onCheckedChange={(v) => toggle(o.id, v === true)} />
                <Label htmlFor={`${id}-${o.number}`} className="min-w-0 truncate font-normal">
                  {o.fullName}
                </Label>
              </div>
            ))}
          </fieldset>
        )}
      </CardContent>
    </Card>
  );
}
