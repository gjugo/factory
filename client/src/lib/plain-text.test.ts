import { describe, expect, it } from 'vitest';
import { markdownToPlainText } from './plain-text';

describe('markdownToPlainText', () => {
  it('drops emphasis, code ticks and link targets', () => {
    expect(markdownToPlainText('**Done.** See `npm test` and [PR #4](https://x.y/4), *really* ~~not~~ __now__.')).toBe(
      'Done. See npm test and PR #4, really not now.',
    );
  });

  it('drops headings, quotes and list markers and joins lines', () => {
    expect(markdownToPlainText('## Plan\n> quoted note\n- one\n2. two')).toBe('Plan quoted note one two');
  });

  it('keeps underscores and asterisks that are not emphasis', () => {
    expect(markdownToPlainText('set snake_case_name to 2 * 3')).toBe('set snake_case_name to 2 * 3');
  });

  it('drops code fences but keeps the code', () => {
    expect(markdownToPlainText('Run:\n```bash\nnpm ci\n```')).toBe('Run: npm ci');
  });
});
