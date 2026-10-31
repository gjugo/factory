import type { GhRepoSummary, ProjectFolderView, RepoView } from '../../../shared/types';
import type { Tone } from './status';

// Pure helpers for the projects screens: what a project's checkout looks like, the add-project lists' filters, and
// names the server would accept.

/** A new project's name as the server takes it: letters, digits, ".", "-" and "_", anything else turned into "-". */
export const projectSlug = (name: string) => name.trim().replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');

/** owner/name, as typed for "connect a repo by name". */
export const isRepoName = (v: string) => /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(v.trim());

/** Where a project's code is: its own folder, or a clone the office manages and how that clone stands. */
export function checkoutLook(repo: Pick<RepoView, 'localPath' | 'checkoutPath' | 'cloneStatus' | 'cloneError'>): { label: string; tone: Tone; detail: string } {
  if (repo.cloneStatus === 'error') return { label: 'Clone failed', tone: 'danger', detail: repo.cloneError ?? 'The clone failed.' };
  if (repo.cloneStatus === 'cloning') return { label: 'Cloning', tone: 'info', detail: repo.checkoutPath };
  if (repo.cloneStatus === 'pending') return { label: 'Waiting to clone', tone: 'neutral', detail: repo.checkoutPath };
  return { label: repo.localPath ? 'Your folder' : 'Office clone', tone: 'success', detail: repo.checkoutPath };
}

/** GitHub repos to offer: not already a project, matching the search, at most `limit`. */
export function repoChoices(list: GhRepoSummary[], connected: string[], q: string, limit = 60): GhRepoSummary[] {
  const have = new Set(connected.map((c) => c.toLowerCase()));
  const query = q.trim().toLowerCase();
  return list.filter((r) => !have.has(r.nameWithOwner.toLowerCase()) && (!query || r.nameWithOwner.toLowerCase().includes(query) || r.description.toLowerCase().includes(query))).slice(0, limit);
}

/** What can be done with a folder: nothing (already a project), connect it (on GitHub) or publish it first. */
export function folderAction(f: ProjectFolderView): 'added' | 'connect' | 'publish' {
  if (f.number != null) return 'added';
  return f.github ? 'connect' : 'publish';
}

/** Folders whose name matches the search. */
export const folderChoices = (folders: ProjectFolderView[], q: string) => {
  const query = q.trim().toLowerCase();
  return query ? folders.filter((f) => f.name.toLowerCase().includes(query) || (f.github ?? '').toLowerCase().includes(query)) : folders;
};
