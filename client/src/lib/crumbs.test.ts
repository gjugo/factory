import { describe, expect, it } from 'vitest';
import { crumbsFor } from './crumbs';

const names = { project: (id: string) => (id === 'acme/web' ? 'web' : undefined), agent: (id: string) => (id === 'ken' ? 'Ken' : undefined) };

describe('crumbsFor', () => {
  it('names the top-level pages', () => {
    expect(crumbsFor('/', names)).toEqual([{ label: 'Overview' }]);
    expect(crumbsFor('/projects', names)).toEqual([{ label: 'Projects' }]);
    expect(crumbsFor('/settings', names)).toEqual([{ label: 'Settings' }]);
    expect(crumbsFor('/timelapse', names)).toEqual([{ label: 'Time-lapse' }]);
    expect(crumbsFor('/nope', names)).toEqual([{ label: 'Not found' }]);
  });

  it('links back up from a project, its settings and an agent', () => {
    expect(crumbsFor('/projects/acme/web', names)).toEqual([{ label: 'Projects', to: '/projects' }, { label: 'web' }]);
    expect(crumbsFor('/projects/acme/web/settings', names)).toEqual([{ label: 'Projects', to: '/projects' }, { label: 'web', to: '/projects/acme/web' }, { label: 'Settings' }]);
    expect(crumbsFor('/agents/ken', names)).toEqual([{ label: 'Agents', to: '/agents' }, { label: 'Ken' }]);
  });

  it('falls back to the path for a project or agent it does not know yet', () => {
    expect(crumbsFor('/projects/acme/api', names)[1]).toEqual({ label: 'api' });
    expect(crumbsFor('/agents/zed', names)[1]).toEqual({ label: 'zed' });
  });
});
