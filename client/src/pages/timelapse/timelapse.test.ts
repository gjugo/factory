import { describe, expect, it } from 'vitest';
import type { JournalMark } from '../../../../shared/journal';
import { agoText, markCounts, scrubKey, sizeText, spanText, speedNote } from './timelapse';
import { SPEEDS } from '../../replayClock';

const MIN = 60_000;
const HOUR = 60 * MIN;

describe('the time-lapse words', () => {
  it('says how long ago', () => {
    expect(agoText(25 * MIN)).toBe('25 min ago');
    expect(agoText(3 * HOUR)).toBe('3 h ago');
    expect(agoText(3 * HOUR + 5 * MIN)).toBe('3 h 5 min ago');
    expect(agoText(24 * HOUR)).toBe('1 day ago');
    expect(agoText(50 * HOUR)).toBe('2 days ago');
  });

  it('says how long a stretch lasts and how big a day is', () => {
    expect(spanText(45 * MIN)).toBe('45 min');
    expect(spanText(3 * HOUR + 10 * MIN)).toBe('3 h 10 min');
    expect(sizeText(200)).toBe('1 KB');
    expect(sizeText(30 * 1024)).toBe('30 KB');
    expect(sizeText(3.5 * 1024 * 1024)).toBe('3.5 MB');
  });

  it("explains each of cubefarm's speeds as an hour in some time", () => {
    expect(SPEEDS.map(speedNote)).toEqual(['an hour in 2 minutes', 'an hour in 30 seconds', 'an hour in 6 seconds']);
  });

  it('counts the marks of a day by kind', () => {
    const m = (kind: JournalMark['kind']) => ({ t: 0, kind, repoId: 'a/b', n: 1, label: '' });
    expect(markCounts([m('merge'), m('merge'), m('issue')])).toEqual({ merge: 2, 'needs-human': 0, issue: 1 });
  });
});

describe('scrubKey', () => {
  const from = 0;
  const to = 50 * MIN;
  it('steps through the stretch both ways and never past its ends', () => {
    expect(scrubKey('ArrowRight', 10 * MIN, from, to)).toBe(11 * MIN);
    expect(scrubKey('ArrowLeft', 10 * MIN, from, to)).toBe(9 * MIN);
    expect(scrubKey('PageUp', 10 * MIN, from, to)).toBe(15 * MIN);
    expect(scrubKey('PageDown', 2 * MIN, from, to)).toBe(0);
    expect(scrubKey('ArrowRight', to, from, to)).toBe(to);
    expect(scrubKey('Home', 10 * MIN, from, to)).toBe(from);
    expect(scrubKey('End', 10 * MIN, from, to)).toBe(to);
    expect(scrubKey('a', 10 * MIN, from, to)).toBeNull();
  });
});
