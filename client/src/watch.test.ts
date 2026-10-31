import { describe, expect, it } from 'vitest';
import { CEO_ID } from '../../shared/types';
import { countWatch, currentWatch, routeProject } from './watch';

describe('currentWatch', () => {
  it("is the route's project, the agents pages have open and whether a workers list is out", () => {
    expect(currentWatch({ project: 3, watched: {}, workers: 1 })).toEqual({ project: 3, agents: [], workers: true });
    expect(currentWatch({ project: -1, watched: { ken: 1 }, workers: 0 })).toEqual({ project: -1, agents: ['ken'], workers: false });
    expect(currentWatch({ project: 2, watched: { [CEO_ID]: 2, ada: 1 }, workers: 0 }).agents).toEqual(['ada', CEO_ID].sort());
  });

  it('leaves out agents nobody watches any more, and keeps a stable order', () => {
    expect(currentWatch({ project: 1, watched: { zed: 1, ada: 0, ken: 1 }, workers: 0 }).agents).toEqual(['ken', 'zed']);
  });
});

describe('routeProject', () => {
  const repos = [
    { id: 'acme/web', number: 1 },
    { id: 'acme/api', number: 2 },
  ];

  it("is the route's project number", () => {
    expect(routeProject(repos, 'acme/api')).toBe(2);
  });

  it('is -1 without a project, or for one that is not connected', () => {
    expect(routeProject(repos, null)).toBe(-1);
    expect(routeProject(repos, 'acme/gone')).toBe(-1);
  });
});

describe('countWatch', () => {
  it('counts panels per agent, so closing one of two keeps the agent watched', () => {
    let w = countWatch({}, ['ken'], 1);
    w = countWatch(w, ['ken', 'ada'], 1);
    expect(w).toEqual({ ken: 2, ada: 1 });
    w = countWatch(w, ['ken'], -1);
    expect(currentWatch({ project: -1, watched: w, workers: 0 }).agents).toEqual(['ada', 'ken']);
    w = countWatch(w, ['ken', 'ada'], -1);
    expect(w).toEqual({});
  });

  it('counts an id listed twice in one call once', () => {
    expect(countWatch({}, ['ken', 'ken'], 1)).toEqual({ ken: 1 });
  });
});
