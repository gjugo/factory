import { useEffect, useState } from 'react';
import { CliField, EffortField, ModelField, type SetupValues } from '@/components/agents/agent-fields';
import { Button } from '@/components/ui/button';
import { api } from '@/api';
import { isBusyStatus, workerCli } from '@/lib/agents';
import { useStore, type Agent } from '@/store';

// An agent's coding agent, model and effort (PATCH /api/agents/:id). The CEO always runs Claude Code, so only model
// and effort; in the Agent SDK runtime everyone does. A running session keeps its setup until their next task.

const valuesOf = (a: Agent): SetupValues => ({ cli: a.cli, model: a.model, effort: a.effort });

export function SettingsTab({ agent }: { agent: Agent }) {
  const settings = useStore((s) => s.settings);
  const [values, setValues] = useState(() => valuesOf(agent));
  const [busy, setBusy] = useState(false);
  // Another tab (or the CEO) changed them: show what's saved now.
  useEffect(() => setValues(valuesOf(agent)), [agent.cli, agent.model, agent.effort]);
  const ceo = agent.role === 'ceo';
  const cliShown = !ceo && (settings.runtime === 'terminal' || agent.host === 'box');
  const saved = valuesOf(agent);
  const dirty = values.cli !== saved.cli || values.model.trim() !== saved.model || values.effort !== saved.effort;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.updateAgent(agent.id, { ...(cliShown ? { cli: values.cli } : {}), model: values.model.trim(), effort: values.effort });
      useStore.getState().pushToast('success', `Saved ${agent.name}'s setup.`);
    } catch {
      // api() already toasted why
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={save} className="grid max-w-md gap-4">
      {isBusyStatus(agent.status) && <p className="rounded-md border border-info/30 bg-info/10 px-3 py-2 text-sm text-info">Changes apply from their next task; the running session keeps its setup.</p>}
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
