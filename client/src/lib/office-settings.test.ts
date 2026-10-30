import { describe, expect, it } from 'vitest';
import type { SwarmSettings } from '../../../shared/types';
import { officeSettingsPatch, officeSettingsSchema, toOfficeForm } from './office-settings';

const settings = {
  managerName: 'Dana',
  companyName: 'Acme',
  projectsDir: '/home/dana/projects',
  defaultCli: 'claude',
  defaultModel: 'claude-opus-5-5',
  defaultEffort: 'medium',
  runtime: 'terminal',
  sessionLimit: 0,
  scaling: 'approve',
  maxAgents: 10,
  ceoHeartbeatMin: 60,
  pacingSessions: 3,
  trimIdleDesksMin: 120,
  autoUpdate: true,
} as SwarmSettings;

const errors = (patch: Record<string, unknown>) => {
  const r = officeSettingsSchema.safeParse({ ...toOfficeForm(settings), ...patch });
  return r.success ? {} : Object.fromEntries(r.error.issues.map((i) => [i.path.join('.'), i.message]));
};

describe('office settings form', () => {
  it('round-trips the settings without a change', () => {
    const form = toOfficeForm(settings);
    expect(form.maxAgents).toBe('10');
    expect(officeSettingsSchema.safeParse(form).success).toBe(true);
    expect(officeSettingsPatch(form, settings)).toEqual({});
  });

  it('sends only what changed, trimmed and as numbers', () => {
    const form = { ...toOfficeForm(settings), companyName: '  Acme Labs ', maxAgents: ' 4 ', scaling: 'auto' as const };
    expect(officeSettingsPatch(officeSettingsSchema.parse(form), settings)).toEqual({ companyName: 'Acme Labs', maxAgents: 4, scaling: 'auto' });
  });

  it('leaves autoUpdate out on an office that cannot update itself', () => {
    const { autoUpdate: _, ...noUpdate } = settings;
    const form = { ...toOfficeForm(noUpdate as SwarmSettings), autoUpdate: true };
    expect(officeSettingsPatch(form, noUpdate as SwarmSettings)).toEqual({});
    expect(officeSettingsPatch({ ...toOfficeForm(settings), autoUpdate: false }, settings)).toEqual({ autoUpdate: false });
  });

  it('refuses numbers outside what the server keeps, with a message naming the field', () => {
    expect(errors({ maxAgents: '0' })).toEqual({ maxAgents: 'Most agents per project must be from 1 to 15' });
    expect(errors({ maxAgents: '16' })).toEqual({ maxAgents: 'Most agents per project must be from 1 to 15' });
    expect(errors({ pacingSessions: '2.5' })).toEqual({ pacingSessions: 'Sessions while pacing must be a whole number' });
    expect(errors({ ceoHeartbeatMin: '1441' })).toEqual({ ceoHeartbeatMin: 'The review interval must be from 0 to 1440' });
    expect(errors({ sessionLimit: '' })).toEqual({ sessionLimit: 'The session limit must be a whole number' });
    expect(errors({ trimIdleDesksMin: '-1' })).toEqual({ trimIdleDesksMin: 'Trim idle desks after must be a whole number' });
  });

  it('refuses an empty projects folder and over-long names', () => {
    expect(errors({ projectsDir: '   ' })).toEqual({ projectsDir: 'The projects folder is required' });
    expect(errors({ managerName: 'x'.repeat(41) })).toEqual({ managerName: 'Your name can be at most 40 characters' });
    expect(errors({ companyName: 'x'.repeat(61) })).toEqual({ companyName: 'The company name can be at most 60 characters' });
  });
});
