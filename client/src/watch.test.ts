import { describe, expect, it } from 'vitest';
import { CEO_ID } from '../../shared/types';
import { countWatch, currentWatch, routeFloor } from './watch';

describe('currentWatch', () => {
  it("is the route's floor, the agents pages have open and whether a workers list is out", () => {
    expect(currentWatch({ floor: 3, watched: {}, workers: 1 })).toEqual({ floor: 3, agents: [], workers: true });
    expect(currentWatch({ floor: -1, watched: { ken: 1 }, workers: 0 })).toEqual({ floor: -1, agents: ['ken'], workers: false });
    expect(currentWatch({ floor: 2, watched: { [CEO_ID]: 2, ada: 1 }, workers: 0 }).agents).toEqual(['ada', CEO_ID].sort());
  });

  it('leaves out agents nobody watches any more, and keeps a stable order', () => {
    expect(currentWatch({ floor: 1, watched: { zed: 1, ada: 0, ken: 1 }, workers: 0 }).agents).toEqual(['ken', 'zed']);
  });
});

describe('routeFloor', () => {
  const repos = [
    { id: 'acme/web', floor: 1 },
    { id: 'acme/api', floor: 2 },
  ];

  it("is the route's project's floor", () => {
    expect(routeFloor(repos, 'acme/api')).toBe(2);
  });

  it('is -1 without a project, or for one that is not connected', () => {
    expect(routeFloor(repos, null)).toBe(-1);
    expect(routeFloor(repos, 'acme/gone')).toBe(-1);
  });
});

describe('countWatch', () => {
  it('counts panels per agent, so closing one of two keeps the agent watched', () => {
    let w = countWatch({}, ['ken'], 1);
    w = countWatch(w, ['ken', 'ada'], 1);
    expect(w).toEqual({ ken: 2, ada: 1 });
    w = countWatch(w, ['ken'], -1);
    expect(currentWatch({ floor: -1, watched: w, workers: 0 }).agents).toEqual(['ada', 'ken']);
    w = countWatch(w, ['ken', 'ada'], -1);
    expect(w).toEqual({});
  });

  it('counts an id listed twice in one call once', () => {
    expect(countWatch({}, ['ken', 'ken'], 1)).toEqual({ ken: 1 });
  });
});
