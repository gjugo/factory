import { useEffect, useId, useState } from 'react';
import { CliField, EffortField, HostField, ModelField, type SetupValues } from '@/components/agents/agent-fields';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/api';
import { isBusyStatus, moveBlocked, renameTo, workerCli } from '@/lib/agents';
import { useStore, type Agent } from '@/store';
import type { MachineHost } from '../../../../shared/types';

// An agent's name, coding agent, model and effort, and where they work (PATCH /api/agents/:id). The CEO always runs Claude
// Code on this computer, so only model and effort; in the Agent SDK runtime everyone does. A running session keeps its
// setup until their next task; moving between this computer and the cloud waits until they have none (docs/cloud.md).

type Values = SetupValues & { host: MachineHost; name: string };
const valuesOf = (a: Agent): Values => ({ name: a.name, cli: a.cli, model: a.model, effort: a.effort, host: a.host ?? 'local' });

export function SettingsTab({ agent }: { agent: Agent }) {
  const settings = useStore((s) => s.settings);
  const [values, setValues] = useState(() => valuesOf(agent));
  const [busy, setBusy] = useState(false);
  // Another tab (or the CEO) changed them: show what's saved now.
  useEffect(() => setValues(valuesOf(agent)), [agent.name, agent.cli, agent.model, agent.effort, agent.host]);
  const nameId = useId();
  const keySet = useStore((s) => s.cloud.keySet);
  const ceo = agent.role === 'ceo';
  const cliShown = !ceo && (settings.runtime === 'terminal' || agent.host === 'box');
  const saved = valuesOf(agent);
  const renamed = renameTo(values.name, saved.name);
  const dirty = renamed !== null || values.cli !== saved.cli || values.model.trim() !== saved.model || values.effort !== saved.effort || values.host !== saved.host;
  // Works on shows once the cloud is set up, or for a cloud agent (who can always come back to this computer).
  const hostShown = !ceo && (keySet || saved.host === 'box');

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.updateAgent(agent.id, { ...(renamed ? { name: renamed } : {}), ...(cliShown ? { cli: values.cli } : {}), ...(values.host !== saved.host ? { host: values.host } : {}), model: values.model.trim(), effort: values.effort });
      useStore.getState().pushToast('success', `Saved ${renamed ?? agent.name}'s setup.`);
    } catch {
      // api() already toasted why
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={save} className="grid max-w-md gap-4">
      {isBusyStatus(agent.status) && <p className="rounded-md border border-info/30 bg-info/10 px-3 py-2 text-sm text-info">Changes apply from their next task; the running session keeps its setup.</p>}
      <div className="grid gap-2">
        <Label htmlFor={nameId}>Name</Label>
        <Input id={nameId} value={values.name} maxLength={24} onChange={(e) => setValues({ ...values, name: e.target.value })} autoComplete="off" />
      </div>
      {hostShown && (
        <HostField value={values.host} onChange={(host) => setValues({ ...values, host: host || 'local' })} disabled={moveBlocked(agent, keySet)} cli={workerCli({ cli: values.cli, role: agent.role }, settings)} />
      )}
      {cliShown && <CliField value={values.cli} onChange={(cli) => setValues({ ...values, cli })} />}
      <ModelField value={values.model} ceo={ceo} cli={workerCli({ cli: values.cli, role: agent.role }, settings)} onChange={(model) => setValues({ ...values, model })} />
      <EffortField value={values.effort} onChange={(effort) => setValues({ ...values, effort })} />
      <div className="flex gap-2">
        <Button type="submit" disabled={busy || !dirty}>
          Save
        </Button>
        <Button type="button" variant="ghost" disabled={busy || !dirty} onClick={() => setValues(saved)}>
          Discard
        </Button>
      </div>
    </form>
  );
}
