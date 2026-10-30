import { useParams } from 'react-router';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { projectName } from '@/hooks/use-project-rows';
import { repoIdFrom } from '@/lib/links';
import { useStore } from '@/store';

/** /projects/:owner/:name/settings: a project's brief, QA, preview and automation. A placeholder for now. */
export default function ProjectSettingsPage() {
  const repoId = repoIdFrom(useParams());
  const repo = useStore((s) => s.repos.find((r) => r.id === repoId));
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={`${repo ? projectName(repo) : (repoId ?? '')} settings`} description="The brief, QA, the preview and automation for this project." />
      <EmptyState title="Project settings are on their way" description="They arrive with the project settings screen." />
    </div>
  );
}
