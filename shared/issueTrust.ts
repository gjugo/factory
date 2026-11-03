import type { IssueInfo } from './types.ts';

// Whose issues the office starts on its own. An issue's body becomes an agent's prompt, and agents run unsandboxed on
// the manager's machine, so an issue anyone can file (a public repo, outside collaborators) only starts once someone
// trusted vouches for it: it was filed by the manager's own gh login or a login in settings.trustedAuthors, or one of
// them added the swarm:approved label. The label alone isn't enough: an issue template, a labelling bot or anyone with
// triage access can put it on, so who added it is read from the issue's events (server/github.ts labelAdder).

/** The label a trusted author adds to let an issue from anyone else start like the manager's own. */
export const APPROVED_LABEL = 'swarm:approved';

/** Most extra logins settings.trustedAuthors keeps. */
export const MAX_TRUSTED_AUTHORS = 50;

// A GitHub login, a bot's (dependabot[bot]) or an app's as gh names it (app/dependabot).
const LOGIN = /^(?:app\/)?[a-z\d](?:[a-z\d-]{0,38})(?:\[bot\])?$/i;

/** The logins whose issues start on their own, lower-cased: the manager's gh login (null while gh isn't ready) and `extra`. */
export function trustedSet(manager: string | null, extra: readonly string[]): Set<string> {
  return new Set([...(manager ? [manager] : []), ...extra].map((l) => l.toLowerCase()));
}

export const hasApprovedLabel = (issue: Pick<IssueInfo, 'labels'>) => issue.labels.some((l) => l.toLowerCase() === APPROVED_LABEL);

/**
 * Whether an issue may start without the manager handing it out. `approvedBy`: who last added the approved label (null
 * or undefined while unknown). An unknown author or approver is never trusted.
 */
export function issueTrusted(issue: Pick<IssueInfo, 'author' | 'labels'>, trusted: ReadonlySet<string>, approvedBy?: string | null): boolean {
  if (issue.author && trusted.has(issue.author.toLowerCase())) return true;
  return hasApprovedLabel(issue) && !!approvedBy && trusted.has(approvedBy.toLowerCase());
}

/**
 * settings.trustedAuthors from what was sent: a list, or text split on commas and whitespace. A leading @ is dropped and
 * duplicates are merged. An error when something isn't a GitHub login (it says which).
 */
export function trustedAuthorList(raw: unknown): { logins: string[] } | { error: string } {
  const parts = Array.isArray(raw) ? raw : typeof raw === 'string' ? raw.split(/[\s,]+/) : null;
  if (!parts) return { error: 'trustedAuthors must be a list of GitHub logins' };
  const out: string[] = [];
  for (const p of parts) {
    if (typeof p !== 'string') return { error: 'trustedAuthors must be a list of GitHub logins' };
    const login = p.trim().replace(/^@/, '');
    if (!login) continue;
    if (!LOGIN.test(login)) return { error: `"${p.trim()}" isn't a GitHub login` };
    if (!out.some((l) => l.toLowerCase() === login.toLowerCase())) out.push(login);
  }
  if (out.length > MAX_TRUSTED_AUTHORS) return { error: `At most ${MAX_TRUSTED_AUTHORS} trusted authors` };
  return { logins: out };
}
