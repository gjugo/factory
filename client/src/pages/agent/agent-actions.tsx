import { useMemo, useState } from 'react';
import { KeyRound, Play, RotateCcw, Square, UserMinus } from 'lucide-react';
import { useNavigate } from 'react-router';
import { confirmDialog } from '@/components/shared/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/api';
import { assignChoices, isBusyStatus, signInFor } from '@/lib/agents';
import { links } from '@/lib/links';
import { agentsOnRepo, kanbanFor, useStore, type Agent } from '@/store';

// An agent's actions: stop a session, clear their desk, give them an issue or a PR to test, sign a cloud agent in
// again, and let them go. The office's events update every tab, this one included.

async function run(fn: () => Promise<unknown>) {
  try {
    await fn();
    return true;
  } catch {
    return false; // api() already toasted why
  }
}

export function AgentActions({ agent }: { agent: Agent }) {
  const navigate = useNavigate();
  const defaultCli = useStore((s) => s.settings.defaultCli);
  const [busy, setBusy] = useState(false);
  const ceo = agent.role === 'ceo';
  const working = isBusyStatus(agent.status);
  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    const ok = await run(fn);
    setBusy(false);
    return ok;
  };

  const fire = async () => {
    const ok = await confirmDialog({
      title: `Let ${agent.name} go?`,
      body: 'Their session stops and their worktree is removed. Branches they pushed stay on GitHub.',
      confirm: `Let ${agent.name} go`,
      tone: 'danger',
    });
    if (ok && (await act(() => api.fireAgent(agent.id)))) navigate(links.agents());
  };

  return (
    <>
      {working && (
        <Button variant="destructive" size="sm" disabled={busy} onClick={() => act(() => api.stop(agent.id))}>
          <Square /> Stop
        </Button>
      )}
      {!ceo && !working && <AssignButton agent={agent} />}
      {!ceo && !working && agent.status !== 'idle' && (
        <Button variant="outline" size="sm" disabled={busy} onClick={() => act(() => api.reset(agent.id))} title="Clear their task so they're free for new work">
          <RotateCcw /> Reset
        </Button>
      )}
      {!ceo && agent.host === 'box' && (
        <Button variant="outline" size="sm" disabled={busy} onClick={() => act(() => api.signIn(agent.id))} title={signInFor(agent, { defaultCli }) ? 'Show a new sign-in link in their terminal' : 'Sign their coding agent in again, in their terminal'}>
          <KeyRound /> Sign in
        </Button>
      )}
      {!ceo && (
        <Button variant="ghost" size="sm" disabled={busy} onClick={fire} className="text-destructive hover:text-destructive">
          <UserMinus /> Let go
        </Button>
      )}
    </>
  );
}

/** Give a free agent an issue from the backlog or a PR waiting for QA. */
function AssignButton({ agent }: { agent: Agent }) {
  const repo = useStore((s) => s.repos.find((r) => r.id === agent.repoId));
  const agents = useStore((s) => s.agents);
  const qa = useStore((s) => s.qa);
  const [open, setOpen] = useState(false);
  const [pick, setPick] = useState('');
  const [busy, setBusy] = useState(false);
  const choices = useMemo(() => (repo ? assignChoices(kanbanFor(repo, agentsOnRepo(agents, repo.id), qa)) : []), [repo, agents, qa]);
  const chosen = choices.find((c) => c.key === pick);
  if (!repo) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chosen) return;
    setBusy(true);
    const ok = await run(() => (chosen.kind === 'qa' ? api.sendToQa(repo.id, chosen.number, agent.id) : api.assign(agent.id, chosen.number)));
    setBusy(false);
    if (ok) {
      setOpen(false);
      setPick('');
    }
  };
  const issues = choices.filter((c) => c.kind === 'issue');
  const prs = choices.filter((c) => c.kind === 'qa');
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Play /> Assign
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Give {agent.name} work</DialogTitle>
            <DialogDescription>An issue to build, or a pull request to test.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="assign-pick">Work</Label>
            <Select value={pick} onValueChange={setPick} disabled={!choices.length}>
              <SelectTrigger id="assign-pick" className="w-full">
                <SelectValue placeholder={choices.length ? 'Pick an issue or a PR…' : 'Nothing to pick up'} />
              </SelectTrigger>
              <SelectContent>
                {issues.length > 0 && (
                  <SelectGroup>
                    <SelectLabel>Issues to build</SelectLabel>
                    {issues.map((c) => (
                      <SelectItem key={c.key} value={c.key}>
                        #{c.number} {c.title}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}
                {prs.length > 0 && (
                  <SelectGroup>
                    <SelectLabel>Pull requests to test</SelectLabel>
                    {prs.map((c) => (
                      <SelectItem key={c.key} value={c.key}>
                        PR #{c.number} {c.title}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy || !chosen}>
              {chosen?.kind === 'qa' ? `Test PR #${chosen.number}` : 'Start issue'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
