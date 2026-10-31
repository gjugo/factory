import { useId } from 'react';
import type { AgentCli, EffortLevel, MachineHost } from '../../../../shared/types';
import { CLAUDE_MODELS, effectiveModel, modelSuggestions } from '../../../../shared/models';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EFFORTS, cliName } from '@/lib/agents';
import { useStore } from '@/store';

// An agent's coding agent, model, effort and machine as form fields, for Add agent and an agent's Settings tab. '' is
// the office's default each time; Radix's Select can't hold '', so it stands for it as DEFAULT.

const DEFAULT = 'default';

export interface SetupValues {
  cli: AgentCli | '';
  model: string;
  effort: EffortLevel | '';
}

export function CliField({ value, onChange }: { value: AgentCli | ''; onChange: (v: AgentCli | '') => void }) {
  const id = useId();
  const clis = useStore((s) => s.clis);
  const defaultCli = useStore((s) => s.settings.defaultCli);
  const installed = clis.filter((c) => c.installed);
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>Coding agent</Label>
      <Select value={value || DEFAULT} onValueChange={(v) => onChange(v === DEFAULT ? '' : (v as AgentCli))}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={DEFAULT}>{cliName(clis, defaultCli)} (office default)</SelectItem>
          {installed.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.label}
              {c.version ? ` ${c.version}` : ''}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function ModelField({ value, onChange, cli, ceo = false }: { value: string; onChange: (v: string) => void; cli: AgentCli; ceo?: boolean }) {
  const id = useId();
  const settings = useStore((s) => s.settings);
  const placeholder = (ceo ? CLAUDE_MODELS[0] : effectiveModel('', cli, settings, CLAUDE_MODELS[0])) || 'the coding agent’s default';
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>Model</Label>
      <Input id={id} list={`${id}-models`} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} autoComplete="off" />
      <datalist id={`${id}-models`}>
        {modelSuggestions(cli).map((m) => (
          <option key={m} value={m} />
        ))}
      </datalist>
      <p className="text-xs text-muted-foreground">Empty uses {placeholder}.</p>
    </div>
  );
}

export function EffortField({ value, onChange }: { value: EffortLevel | ''; onChange: (v: EffortLevel | '') => void }) {
  const id = useId();
  const defaultEffort = useStore((s) => s.settings.defaultEffort);
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>Effort</Label>
      <Select value={value || DEFAULT} onValueChange={(v) => onChange(v === DEFAULT ? '' : (v as EffortLevel))}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={DEFAULT}>Office default ({defaultEffort})</SelectItem>
          {EFFORTS.map((e) => (
            <SelectItem key={e} value={e}>
              {e}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

const HOSTS: { value: MachineHost; label: string }[] = [
  { value: 'local', label: 'This computer' },
  { value: 'box', label: 'The cloud (an Upstash Box)' },
];

/**
 * Where they work (docs/cloud.md). With `office`, '' stands for Settings → Cloud agents' choice for new agents.
 * `disabled` says why it can't change; the cloud needs an Upstash key, and OpenCode can't run there yet.
 */
export function HostField({ value, onChange, office = false, disabled, cli }: { value: MachineHost | ''; onChange: (v: MachineHost | '') => void; office?: boolean; disabled?: string | null; cli: AgentCli }) {
  const id = useId();
  const machineKind = useStore((s) => s.settings.cloud.machineKind);
  const keySet = useStore((s) => s.cloud.keySet);
  const hint = disabled ?? (cli === 'opencode' ? 'OpenCode can’t run in the cloud yet: they work on this computer.' : 'A cloud agent keeps working while the office is closed.');
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>Works on</Label>
      <Select value={value || DEFAULT} onValueChange={(v) => onChange(v === DEFAULT ? '' : (v as MachineHost))} disabled={!!disabled}>
        <SelectTrigger id={id} className="w-full" aria-describedby={`${id}-hint`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {office && <SelectItem value={DEFAULT}>{HOSTS.find((h) => h.value === machineKind)?.label} (office default)</SelectItem>}
          {HOSTS.map((h) => (
            <SelectItem key={h.value} value={h.value} disabled={h.value === 'box' && (!keySet || cli === 'opencode')}>
              {h.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p id={`${id}-hint`} className="text-xs text-muted-foreground">
        {hint}
      </p>
    </div>
  );
}
