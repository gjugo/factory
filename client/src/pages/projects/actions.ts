import { api } from '@/api';
import { confirmDialog } from '@/components/shared/confirm-dialog';
import type { RepoView } from '../../../../shared/types';

// What both the projects table and a project's settings do to a project.

/** Runs an API call; its error is already a toast (api.ts), so a failure is just undefined. */
export async function attempt<T>(fn: () => Promise<T>): Promise<T | undefined> {
  try {
    return await fn();
  } catch {
    return undefined;
  }
}

/** Asks first, then disconnects. True once it's gone. */
export async function disconnectProject(repo: Pick<RepoView, 'id' | 'fullName' | 'localPath'>): Promise<boolean> {
  const ok = await confirmDialog({
    tone: 'danger',
    title: `Disconnect ${repo.fullName}?`,
    body: `Its agents are let go and its queued CEO work is dropped. Nothing is deleted on GitHub, and ${repo.localPath ? 'your folder stays exactly as it is' : 'the local clone stays on disk'}.`,
    confirm: 'Disconnect',
  });
  if (!ok) return false;
  return (await attempt(() => api.disconnectRepo(repo.id))) !== undefined;
}
