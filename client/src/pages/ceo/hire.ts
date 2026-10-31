import { CLAUDE_MODELS, effectiveModel } from '../../../../shared/models';
import type { AgentCli, CeoInfo, CliView, EffortLevel, HireRequestView, MachineHost, SwarmSettings } from '../../../../shared/types';

// A team change's setup and wording, as cubefarm's phone had them: what a new agent will run, the manager's edits
// before hiring them, and the CEO's presence line.

/** Every reasoning effort, lowest first ('' = the office default). */
export const EFFORTS: EffortLevel[] = ['low', 'medium', 'high', 'xhigh', 'max'];

/** A coding agent's name, as the office lists it. */
export const cliLabel = (clis: CliView[], id: AgentCli) => clis.find((c) => c.id === id)?.label ?? id;

/** The coding agent a new agent will run: their own pick, else the office default; the Agent SDK runtime is Claude Code for everyone. */
export const hireCli = (cli: AgentCli | '', settings: Pick<SwarmSettings, 'runtime' | 'defaultCli'>): AgentCli =>
  settings.runtime !== 'terminal' ? 'claude' : cli || settings.defaultCli;

/** What the manager can set up on a new agent before hiring them: the CEO's picks to start with ('' = the office default). */
export interface HireSetup {
  name: string;
  cli: AgentCli | '';
  model: string;
  effort: EffortLevel | '';
  host: MachineHost | '';
}

export const setupOf = (r: HireRequestView): HireSetup => ({ name: r.name, cli: r.cli, model: r.model, effort: r.effort, host: r.host ?? '' });

/** The approval's overrides: the setup as the manager left it, an emptied name back to the CEO's pick. */
export const hireOverrides = (r: HireRequestView, s: HireSetup) => ({ name: s.name.trim() || r.name, cli: s.cli, model: s.model.trim(), effort: s.effort, host: s.host });

/** "Claude Code · claude-opus-5-5 · medium effort": what they'll run, the office defaults filled in. */
export function setupLine(s: Pick<HireSetup, 'cli' | 'model' | 'effort'>, settings: SwarmSettings, clis: CliView[]) {
  const cli = hireCli(s.cli, settings);
  return `${cliLabel(clis, cli)} · ${effectiveModel(s.model, cli, settings, CLAUDE_MODELS[0]) || 'its default model'} · ${s.effort || settings.defaultEffort} effort`;
}

/** How a decided request reads: "Hired", "Declined", "Let go", "Kept". */
export function outcomeLabel(r: Pick<HireRequestView, 'kind' | 'status'>): string {
  if (r.kind === 'hire') return r.status === 'approved' ? 'Hired' : r.status === 'rejected' ? 'Declined' : 'Waiting';
  return r.status === 'approved' ? 'Let go' : r.status === 'rejected' ? 'Kept' : 'Waiting';
}

/** The CEO's presence under its name: replying, busy with a job, waiting for a session slot, or available. */
export function presenceLine(ceoStatus: string | undefined, info: CeoInfo, running: number, sessionLimit: number): string {
  if (ceoStatus === 'working') return info.job?.kind === 'chat' ? 'Typing…' : `Busy: ${info.job?.label ?? 'working'}`;
  if (info.queue.some((j) => j.kind === 'chat')) {
    return sessionLimit && running >= sessionLimit ? `Will reply when a session frees up (${running}/${sessionLimit} busy)` : 'Reading your message…';
  }
  return info.queue.length ? `Next up: ${info.queue[0].label}` : 'Available';
}
