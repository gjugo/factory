import { useId } from 'react';
import type { AgentCli, EffortLevel } from '../../../../shared/types';
import { CLAUDE_MODELS, effectiveModel, modelSuggestions } from '../../../../shared/models';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EFFORTS, cliName } from '@/lib/agents';
import { useStore } from '@/store';

// An agent's coding agent, model and effort as form fields, for Add agent and an agent's Settings tab. '' is the
// office's default each time; Radix's Select can't hold '', so it stands for it as DEFAULT.

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
