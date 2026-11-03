import { z } from 'zod';
import { trustedAuthorList } from '../../../shared/issueTrust';
import { PROJECT_SEATS, type AgentCli, type EffortLevel, type SwarmSettings } from '../../../shared/types';

// The office settings form (/settings): its fields as typed (numbers stay strings until they validate), the limits the
// server clamps to (server/swarm.ts updateSettings), and the PATCH that sends only what changed.

export const EFFORTS: readonly EffortLevel[] = ['low', 'medium', 'high', 'xhigh', 'max'];
export const CLIS: readonly AgentCli[] = ['claude', 'codex', 'opencode'];

export const LIMITS = {
  managerName: 40,
  companyName: 60,
  sessionLimit: { min: 0, max: 999 },
  maxAgents: { min: 1, max: PROJECT_SEATS },
  ceoHeartbeatMin: { min: 0, max: 1440 },
  pacingSessions: { min: 1, max: 32 },
  trimIdleDesksMin: { min: 0, max: 7 * 24 * 60 },
} as const;

/** A whole number from min to max, typed into a text field. */
const int = (what: string, { min, max }: { min: number; max: number }) =>
  z
    .string()
    .trim()
    .regex(/^\d+$/, `${what} must be a whole number`)
    .refine((v) => !/^\d+$/.test(v) || (Number(v) >= min && Number(v) <= max), `${what} must be from ${min} to ${max}`);

export const officeSettingsSchema = z.object({
  managerName: z.string().trim().max(LIMITS.managerName, `Your name can be at most ${LIMITS.managerName} characters`),
  companyName: z.string().trim().max(LIMITS.companyName, `The company name can be at most ${LIMITS.companyName} characters`),
  projectsDir: z.string().trim().min(1, 'The projects folder is required'),
  defaultCli: z.enum(CLIS as [AgentCli, ...AgentCli[]]),
  defaultModel: z.string().trim().max(100, 'The model name can be at most 100 characters'),
  defaultEffort: z.enum(EFFORTS as [EffortLevel, ...EffortLevel[]]),
  runtime: z.enum(['terminal', 'sdk']),
  sessionLimit: int('The session limit', LIMITS.sessionLimit),
  scaling: z.enum(['approve', 'auto']),
  maxAgents: int('Most agents per project', LIMITS.maxAgents),
  ceoHeartbeatMin: int('The review interval', LIMITS.ceoHeartbeatMin),
  pacingSessions: int('Sessions while pacing', LIMITS.pacingSessions),
  trimIdleDesksMin: int('Trim idle desks after', LIMITS.trimIdleDesksMin),
  autoUpdate: z.boolean(),
  // GitHub logins separated by commas or spaces, checked as the server checks them (shared/issueTrust.ts).
  trustedAuthors: z.string().superRefine((v, ctx) => {
    const list = trustedAuthorList(v);
    if ('error' in list) ctx.addIssue({ code: 'custom', message: list.error });
  }),
});

export type OfficeSettingsForm = z.infer<typeof officeSettingsSchema>;

/** The form's values for the office's settings. */
export function toOfficeForm(s: SwarmSettings): OfficeSettingsForm {
  return {
    managerName: s.managerName,
    companyName: s.companyName,
    projectsDir: s.projectsDir,
    defaultCli: s.defaultCli,
    defaultModel: s.defaultModel,
    defaultEffort: s.defaultEffort,
    runtime: s.runtime,
    sessionLimit: String(s.sessionLimit),
    scaling: s.scaling,
    maxAgents: String(s.maxAgents),
    ceoHeartbeatMin: String(s.ceoHeartbeatMin),
    pacingSessions: String(s.pacingSessions),
    trimIdleDesksMin: String(s.trimIdleDesksMin),
    autoUpdate: s.autoUpdate ?? false,
    trustedAuthors: (s.trustedAuthors ?? []).join(', '),
  };
}

/**
 * The PATCH for valid form values: only the fields that differ from `s`, trimmed and as numbers. autoUpdate is left
 * out on an office that can't update itself (its settings have no autoUpdate).
 */
export function officeSettingsPatch(v: OfficeSettingsForm, s: SwarmSettings): Partial<SwarmSettings> {
  const next: Partial<SwarmSettings> = {
    managerName: v.managerName.trim(),
    companyName: v.companyName.trim(),
    projectsDir: v.projectsDir.trim(),
    defaultCli: v.defaultCli,
    defaultModel: v.defaultModel.trim(),
    defaultEffort: v.defaultEffort,
    runtime: v.runtime,
    sessionLimit: Number(v.sessionLimit),
    scaling: v.scaling,
    maxAgents: Number(v.maxAgents),
    ceoHeartbeatMin: Number(v.ceoHeartbeatMin),
    pacingSessions: Number(v.pacingSessions),
    trimIdleDesksMin: Number(v.trimIdleDesksMin),
    ...(typeof s.autoUpdate === 'boolean' ? { autoUpdate: v.autoUpdate } : {}),
  };
  const patch: Partial<SwarmSettings> = {};
  for (const [k, value] of Object.entries(next) as [keyof SwarmSettings, unknown][]) {
    if (value !== s[k]) (patch as Record<string, unknown>)[k] = value;
  }
  const trusted = trustedAuthorList(v.trustedAuthors);
  if ('logins' in trusted && trusted.logins.join(',') !== (s.trustedAuthors ?? []).join(',')) patch.trustedAuthors = trusted.logins;
  return patch;
}

