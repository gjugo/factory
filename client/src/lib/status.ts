import type { AgentStatus, PullInfo, QaStatus } from '../../../shared/types';

// What a status reads as and the tone it's drawn in, for agents, QA rounds and GitHub's checks (StatusBadge).

export type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

export interface StatusLook {
  label: string;
  tone: Tone;
}

export const AGENT_STATUS: Record<AgentStatus, StatusLook> = {
  idle: { label: 'Idle', tone: 'neutral' },
  preparing: { label: 'Setting up', tone: 'info' },
  working: { label: 'Working', tone: 'info' },
  done: { label: 'Done', tone: 'success' },
  error: { label: 'Error', tone: 'danger' },
  stopped: { label: 'Stopped', tone: 'warning' },
};

export const QA_STATUS: Record<QaStatus, StatusLook> = {
  queued: { label: 'QA queued', tone: 'neutral' },
  testing: { label: 'Testing', tone: 'info' },
  passed: { label: 'QA passed', tone: 'success' },
  failed: { label: 'QA failed', tone: 'warning' },
  fixing: { label: 'Fixing', tone: 'warning' },
  'needs-human': { label: 'Needs you', tone: 'danger' },
};

export const CHECKS_STATUS: Record<PullInfo['checks'], StatusLook> = {
  pending: { label: 'Checks running', tone: 'info' },
  passing: { label: 'Checks passing', tone: 'success' },
  failing: { label: 'Checks failing', tone: 'danger' },
  none: { label: 'No checks', tone: 'neutral' },
};

/** The status badge's text and tone; an unknown value (a newer server) reads as itself, neutral. */
export function statusLook(kind: 'agent' | 'qa' | 'checks', value: string): StatusLook {
  const table: Record<string, StatusLook> = kind === 'agent' ? AGENT_STATUS : kind === 'qa' ? QA_STATUS : CHECKS_STATUS;
  return table[value] ?? { label: value, tone: 'neutral' };
}
