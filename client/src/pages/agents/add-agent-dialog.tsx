import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import type { MachineHost, RepoView } from '../../../../shared/types';
import { CliField, EffortField, HostField, ModelField, type SetupValues } from '@/components/agents/agent-fields';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { api } from '@/api';
import { projectName } from '@/hooks/use-project-rows';
import { workerCli } from '@/lib/agents';
import { useStore } from '@/store';

// Add agent: a new agent on a project, with a name (or one picked for them) and their coding agent, model and effort
// (empty: the office's defaults), and where they work once the cloud is set up (docs/cloud.md). The office refuses
// past Settings → Most agents per project, so the button does too.

const EMPTY: SetupValues = { cli: '', model: '', effort: '' };

export function AddAgentButton({ repo, teamSize }: { repo: RepoView; teamSize: number }) {
  const max = useStore((s) => s.settings.maxAgents);
  const settings = useStore((s) => s.settings);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [setup, setSetup] = useState<SetupValues>(EMPTY);
  const [host, setHost] = useState<MachineHost | ''>('');
  const cloudOn = useStore((s) => s.cloud.keySet);
  const [busy, setBusy] = useState(false);
  const full = teamSize >= max;
  const terminal = settings.runtime === 'terminal';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const hired = await api.hireAgent(repo.id, { name: name.trim() || undefined, ...setup, cli: terminal ? setup.cli : '', ...(cloudOn ? { host } : {}) });
      useStore.getState().pushToast('success', `${hired.name} joined ${projectName(repo)}.`);
      setOpen(false);
      setName('');
      setSetup(EMPTY);
      setHost('');
    } catch {
      // api() already toasted why
    } finally {
      setBusy(false);
    }
  };

  const trigger = (
    <Button variant="outline" size="sm" disabled={full}>
      <UserPlus /> Add agent
    </Button>
  );
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {full ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <span tabIndex={0} className="rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
              {trigger}
            </span>
          </TooltipTrigger>
          <TooltipContent>The team is full ({max}). Raise Most agents per project in Settings.</TooltipContent>
        </Tooltip>
      ) : (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      )}
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Add an agent to {projectName(repo)}</DialogTitle>
            <DialogDescription>
              {teamSize} of {max} on the team. Leave a field empty to use the office’s default.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="add-agent-name">Name</Label>
            <Input id="add-agent-name" value={name} maxLength={24} placeholder="Picked for you" onChange={(e) => setName(e.target.value)} autoComplete="off" />
          </div>
          {terminal && <CliField value={setup.cli} onChange={(cli) => setSetup({ ...setup, cli })} />}
          {cloudOn && <HostField value={host} office onChange={setHost} cli={workerCli({ cli: setup.cli, role: 'agent' }, settings)} />}
          <ModelField value={setup.model} cli={workerCli({ cli: setup.cli, role: 'agent' }, settings)} onChange={(model) => setSetup({ ...setup, model })} />
          <EffortField value={setup.effort} onChange={(effort) => setSetup({ ...setup, effort })} />
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              Add agent
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
