import { previewEnvTooBig } from '../../../shared/previewEnv';
import type { PreviewConfig, PreviewStatus } from '../../../shared/types';
import type { Tone } from './status';

// A project's preview settings as the form edits them: the run command and its env as KEY=value lines, checked the way
// the server checks them (server/previews.ts parsePreviewPatch) so a refusal shows under the field before saving.

export const PREVIEW_COMMAND_MAX = 2000;

const ENV_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;

/** The env as the editor shows it, one KEY=value per line. */
export const envText = (env: Record<string, string>) =>
  Object.entries(env)
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');

/** KEY=value lines back to an env; blank lines and # comments are skipped. The first bad line is the error. */
export function parseEnv(text: string): { env: Record<string, string>; error: string | null } {
  const env: Record<string, string> = {};
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    const key = eq > 0 ? line.slice(0, eq).trim() : '';
    if (!key) return { env, error: `Line ${i + 1}: write it as KEY=value.` };
    if (!ENV_NAME.test(key)) return { env, error: `Line ${i + 1}: "${key}" is not a valid environment variable name.` };
    if (/^(ANTHROPIC_|CLAUDE)/i.test(key)) return { env, error: `Line ${i + 1}: ${key} can't be set on a preview: Claude credentials never reach the apps the office runs.` };
    env[key] = line.slice(eq + 1).trim();
  }
  return { env, error: null };
}

export interface PreviewFormErrors {
  command?: string;
  env?: string;
}

/** The PATCH body for a command and env as typed, or what's wrong with each field. */
export function previewPatch(command: string, envLines: string): { patch: { previewCommand: string | null; previewEnv: Record<string, string> } } | { errors: PreviewFormErrors } {
  const errors: PreviewFormErrors = {};
  const c = command.trim();
  if (c.length > PREVIEW_COMMAND_MAX) errors.command = `The command is too long (${c.length.toLocaleString('en-US')} of ${PREVIEW_COMMAND_MAX.toLocaleString('en-US')} characters).`;
  const parsed = parseEnv(envLines);
  if (parsed.error) errors.env = parsed.error;
  else {
    const tooBig = previewEnvTooBig(parsed.env);
    if (tooBig) errors.env = tooBig;
  }
  if (errors.command || errors.env) return { errors };
  return { patch: { previewCommand: c || null, previewEnv: parsed.env } };
}

/** Whether the typed command and env differ from what's saved (ignoring surrounding whitespace). */
export const previewDirty = (saved: PreviewConfig, command: string, envLines: string) => command.trim() !== (saved.command ?? '') || envLines.trim() !== envText(saved.env);

export const PREVIEW_STATUS: Record<PreviewStatus, { label: string; tone: Tone }> = {
  unconfigured: { label: 'Not set up', tone: 'neutral' },
  stopped: { label: 'Stopped', tone: 'neutral' },
  preparing: { label: 'Preparing', tone: 'info' },
  installing: { label: 'Installing', tone: 'info' },
  starting: { label: 'Starting', tone: 'info' },
  running: { label: 'Running', tone: 'success' },
  error: { label: 'Error', tone: 'danger' },
};

/** The preview is on its way up or running: Stop and Restart apply, Start doesn't. */
export const previewActive = (status: PreviewStatus) => status === 'preparing' || status === 'installing' || status === 'starting' || status === 'running';
