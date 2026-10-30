import { describe, expect, it } from 'vitest';
import { PREVIEW_ENV_MAX_CHARS } from '../../../shared/previewEnv';
import { envText, parseEnv, previewActive, previewDirty, previewPatch } from './preview-config';

describe('preview env', () => {
  it('reads KEY=value lines, skipping blanks and comments, and writes them back', () => {
    const { env, error } = parseEnv('API_URL=http://localhost:{port}/api\n\n# a comment\n DATA_DIR = {tmp} \nEMPTY=');
    expect(error).toBeNull();
    expect(env).toEqual({ API_URL: 'http://localhost:{port}/api', DATA_DIR: '{tmp}', EMPTY: '' });
    expect(envText(env)).toBe('API_URL=http://localhost:{port}/api\nDATA_DIR={tmp}\nEMPTY=');
  });

  it('keeps "=" inside values', () => {
    expect(parseEnv('Q=a=b').env).toEqual({ Q: 'a=b' });
  });

  it('names the first bad line', () => {
    expect(parseEnv('OK=1\nnot a pair').error).toBe('Line 2: write it as KEY=value.');
    expect(parseEnv('=x').error).toBe('Line 1: write it as KEY=value.');
    expect(parseEnv('1BAD=x').error).toBe('Line 1: "1BAD" is not a valid environment variable name.');
    expect(parseEnv('ANTHROPIC_API_KEY=x').error).toMatch(/^Line 1: ANTHROPIC_API_KEY can't be set on a preview/);
    expect(parseEnv('claude_home=x').error).toMatch(/can't be set on a preview/);
  });
});

describe('previewPatch', () => {
  it('maps an empty command to null (the auto-detected npm script)', () => {
    expect(previewPatch('  ', '')).toEqual({ patch: { previewCommand: null, previewEnv: {} } });
    expect(previewPatch(' npm run dev ', 'A=1')).toEqual({ patch: { previewCommand: 'npm run dev', previewEnv: { A: '1' } } });
  });

  it('refuses a command or env the server would refuse', () => {
    expect(previewPatch('x'.repeat(2001), '')).toEqual({ errors: { command: 'The command is too long (2,001 of 2,000 characters).' } });
    const big = `BIG=${'x'.repeat(PREVIEW_ENV_MAX_CHARS)}`;
    const r = previewPatch('', big);
    expect('errors' in r && r.errors.env).toMatch(/^The preview env is 16,005 characters/);
    expect(previewPatch('', 'nope')).toEqual({ errors: { env: 'Line 1: write it as KEY=value.' } });
  });
});

describe('preview state', () => {
  it('tells typed changes from the saved config', () => {
    const saved = { command: null, env: { A: '1' } };
    expect(previewDirty(saved, '', 'A=1\n')).toBe(false);
    expect(previewDirty(saved, 'npm start', 'A=1')).toBe(true);
    expect(previewDirty(saved, '', 'A=2')).toBe(true);
  });

  it('counts a preview on its way up as active', () => {
    expect(['preparing', 'installing', 'starting', 'running'].every((s) => previewActive(s as never))).toBe(true);
    expect(['stopped', 'error', 'unconfigured'].some((s) => previewActive(s as never))).toBe(false);
  });
});
