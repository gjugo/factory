import { describe, expect, it } from 'vitest';
import { APPROVED_LABEL, issueTrusted, MAX_TRUSTED_AUTHORS, trustedAuthorList, trustedSet } from './issueTrust.ts';

const issue = (author: string, labels: string[] = []) => ({ author, labels });

describe('issueTrusted', () => {
  const trusted = trustedSet('Manager', ['teammate']);

  it("trusts the manager's and the listed authors' issues, whatever the case", () => {
    expect(issueTrusted(issue('manager'), trusted)).toBe(true);
    expect(issueTrusted(issue('TeamMate'), trusted)).toBe(true);
  });

  it("doesn't trust anyone else, or an unknown author", () => {
    expect(issueTrusted(issue('stranger'), trusted)).toBe(false);
    expect(issueTrusted(issue(''), trusted)).toBe(false);
  });

  it('trusts an issue a trusted author added the approved label to', () => {
    expect(issueTrusted(issue('stranger', [APPROVED_LABEL]), trusted, 'Manager')).toBe(true);
    expect(issueTrusted(issue('stranger', ['Swarm:Approved']), trusted, 'teammate')).toBe(true);
    expect(issueTrusted(issue('stranger', ['swarm:approved-ish']), trusted, 'manager')).toBe(false);
  });

  it("doesn't trust the approved label put on by anyone else, or by someone unknown", () => {
    expect(issueTrusted(issue('stranger', [APPROVED_LABEL]), trusted, 'stranger')).toBe(false); // an issue template, say
    expect(issueTrusted(issue('stranger', [APPROVED_LABEL]), trusted, 'labeler-bot[bot]')).toBe(false);
    expect(issueTrusted(issue('stranger', [APPROVED_LABEL]), trusted, null)).toBe(false);
    expect(issueTrusted(issue('stranger', [APPROVED_LABEL]), trusted)).toBe(false);
  });

  it('needs the label still on: who once added it no longer counts after it came off', () => {
    expect(issueTrusted(issue('stranger'), trusted, 'manager')).toBe(false);
  });

  it('trusts only the listed authors while the manager is unknown (gh not signed in)', () => {
    const noGh = trustedSet(null, ['teammate']);
    expect(issueTrusted(issue('teammate'), noGh)).toBe(true);
    expect(issueTrusted(issue('manager'), noGh)).toBe(false);
  });
});

describe('trustedAuthorList', () => {
  it('reads a list or text split on commas and whitespace, dropping @ and duplicates', () => {
    expect(trustedAuthorList(['alice', '@bob'])).toEqual({ logins: ['alice', 'bob'] });
    expect(trustedAuthorList(' @alice, bob\ncarol  Alice ')).toEqual({ logins: ['alice', 'bob', 'carol'] });
    expect(trustedAuthorList('')).toEqual({ logins: [] });
  });

  it("accepts bots' and apps' logins", () => {
    expect(trustedAuthorList('dependabot[bot] app/renovate')).toEqual({ logins: ['dependabot[bot]', 'app/renovate'] });
  });

  it("refuses what isn't a GitHub login", () => {
    expect(trustedAuthorList('alice, not/a-login')).toEqual({ error: '"not/a-login" isn\'t a GitHub login' });
    expect(trustedAuthorList('-dash')).toHaveProperty('error');
    expect(trustedAuthorList([1])).toHaveProperty('error');
    expect(trustedAuthorList({})).toHaveProperty('error');
  });

  it(`keeps at most ${MAX_TRUSTED_AUTHORS}`, () => {
    expect(trustedAuthorList(Array.from({ length: MAX_TRUSTED_AUTHORS + 1 }, (_, i) => `user${i}`))).toHaveProperty('error');
  });
});
