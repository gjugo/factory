import { describe, expect, it } from 'vitest';
import type { GhRepoSummary, ProjectFolderView } from '../../../shared/types';
import { checkoutLook, folderAction, folderChoices, isRepoName, projectSlug, repoChoices } from './projects';
import { setupBody } from './setup';

const gh = (nameWithOwner: string, description = ''): GhRepoSummary => ({ nameWithOwner, description, visibility: 'PRIVATE', updatedAt: '' });
const folder = (name: string, github: string | null, project: number | null = null): ProjectFolderView => ({ name, path: `/p/${name}`, git: !!github, github, number: project });

describe('projects helpers', () => {
  it('slugs a project name the way the server accepts it', () => {
    expect(projectSlug('  Island Bakery! ')).toBe('Island-Bakery');
    expect(projectSlug('my_app.v2')).toBe('my_app.v2');
    expect(projectSlug('!!!')).toBe('');
  });

  it('knows owner/name', () => {
    expect(isRepoName('acme/web')).toBe(true);
    expect(isRepoName(' acme/web ')).toBe(true);
    expect(isRepoName('acme')).toBe(false);
    expect(isRepoName('acme/web/x')).toBe(false);
  });

  it('describes the checkout', () => {
    const base = { localPath: null, checkoutPath: '/c/web', cloneStatus: 'ready' as const };
    expect(checkoutLook(base)).toEqual({ label: 'Office clone', tone: 'success', detail: '/c/web' });
    expect(checkoutLook({ ...base, localPath: '/c/web' }).label).toBe('Your folder');
    expect(checkoutLook({ ...base, cloneStatus: 'cloning' }).tone).toBe('info');
    expect(checkoutLook({ ...base, cloneStatus: 'error', cloneError: 'no access' })).toEqual({ label: 'Clone failed', tone: 'danger', detail: 'no access' });
  });

  it('offers GitHub repos that are not projects yet, matching the search', () => {
    const list = [gh('acme/web', 'The site'), gh('acme/api'), gh('Acme/Docs', 'website docs')];
    expect(repoChoices(list, ['acme/docs'], '').map((r) => r.nameWithOwner)).toEqual(['acme/web', 'acme/api']);
    expect(repoChoices(list, [], 'site').map((r) => r.nameWithOwner)).toEqual(['acme/web', 'Acme/Docs']);
    expect(repoChoices(list, [], '', 1)).toHaveLength(1);
  });

  it('says what a folder can do', () => {
    expect(folderAction(folder('a', 'acme/a', 2))).toBe('added');
    expect(folderAction(folder('b', 'acme/b'))).toBe('connect');
    expect(folderAction(folder('c', null))).toBe('publish');
    expect(folderChoices([folder('web', null), folder('api', 'acme/backend')], 'back').map((f) => f.name)).toEqual(['api']);
  });
});

describe('setupBody', () => {
  const draft = { managerName: '', companyName: ' ', ceoName: '', scaling: 'approve' as const };
  const ceo = { name: 'Avery', look: 'feminine' as const, color: '#06d6a0' };
  it('defaults every empty field and keeps the CEO as they look', () => {
    expect(setupBody(draft, { user: 'octocat', ceo })).toEqual({ managerName: 'octocat', companyName: 'factory', scaling: 'approve', ceoName: 'Avery', ceoLook: 'feminine', ceoColor: '#06d6a0' });
    expect(setupBody(draft, { user: null, ceo: null })).toMatchObject({ managerName: 'Boss', ceoName: 'Morgan', ceoLook: 'masculine' });
  });
  it('trims what was typed', () => {
    expect(setupBody({ managerName: ' Dana ', companyName: ' Acme ', ceoName: ' Riley ', scaling: 'auto' }, { user: null, ceo })).toMatchObject({ managerName: 'Dana', companyName: 'Acme', ceoName: 'Riley', scaling: 'auto' });
  });
});
