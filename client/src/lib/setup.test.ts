import { describe, expect, it } from 'vitest';
import { CEO_NAMES, COMPANY_NAMES, suggestName } from './setup';

describe('suggestName', () => {
  it('never suggests the name already showing', () => {
    for (const r of [0, 0.5, 0.999]) expect(suggestName(CEO_NAMES, 'Morgan', () => r)).not.toBe('Morgan');
    expect(suggestName(COMPANY_NAMES, ' Quokka Labs ', () => 0.7)).not.toBe('Quokka Labs');
  });
  it('picks from the list', () => {
    expect(CEO_NAMES).toContain(suggestName(CEO_NAMES, '', () => 0.3));
    expect(suggestName(['Ada', 'Ken'], 'Ada', () => 0.9)).toBe('Ken');
  });
  it('falls back to the first name when the list has nothing else', () => {
    expect(suggestName(['Ada'], 'Ada', () => 0)).toBe('Ada');
  });
});
