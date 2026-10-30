import { describe, expect, it } from 'vitest';
import { statusLook } from './status';

describe('statusLook', () => {
  it('reads agents, QA and checks in words and tones', () => {
    expect(statusLook('agent', 'working')).toEqual({ label: 'Working', tone: 'info' });
    expect(statusLook('agent', 'error').tone).toBe('danger');
    expect(statusLook('qa', 'needs-human')).toEqual({ label: 'Needs you', tone: 'danger' });
    expect(statusLook('qa', 'passed').tone).toBe('success');
    expect(statusLook('checks', 'failing')).toEqual({ label: 'Checks failing', tone: 'danger' });
  });

  it('shows a value it does not know as itself', () => {
    expect(statusLook('agent', 'napping')).toEqual({ label: 'napping', tone: 'neutral' });
  });
});
