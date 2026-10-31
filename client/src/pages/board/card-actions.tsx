import { GitMerge, Loader2, SendHorizontal, Undo2, UserPlus, X } from 'lucide-react';
import { useId, useState, type FormEvent } from 'react';
import { api } from '@/api';
import { confirmDialog } from '@/components/shared/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { Agent, KanbanCard } from '@/store';
import type { RepoView } from '../../../../shared/types';
import { attempt } from '../projects/actions';
import { freeAgents, type ColumnKey } from './board';

// What the manager can do to a card, as cubefarm's Kanban offers it: an issue is assigned or closed; an open PR is
// sent to QA, sent back for a fix, merged (squash) or closed. Destructive ones ask first; errors are toasts (api.ts).

type Dialogs = 'assign' | 'qa' | 'fix' | null;

export function CardActions({ repo, card, column, agents, waits }: { repo: RepoView; card: KanbanCard; column: ColumnKey; agents: Agent[]; waits: number[] }) {
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState<Dialogs>(null);
  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      return await attempt(fn);
    } finally {
      setBusy(false);
    }
  };
  const free = freeAgents(agents);

  if (column === 'merged') return null;

  if (card.prNumber == null) {
    const holder = card.agent;
    const close = async () => {
      const ok = await confirmDialog({
        tone: 'danger',
        title: `Close #${card.number}?`,
        body: `“${card.title}” will be closed on GitHub as not planned${holder ? `, and ${holder.name} stops working on it` : ''}.`,
        confirm: 'Close issue',
      });
      if (ok) await run(() => api.closeIssue(repo.id, card.number));
    };
    return (
      <div className="flex flex-wrap gap-2">
        {!holder && (
          <Button size="sm" onClick={() => setDialog('assign')} disabled={busy}>
            <UserPlus aria-hidden /> Assign
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={() => void close()} disabled={busy}>
          {busy ? <Loader2 className="animate-spin" aria-hidden /> : <X aria-hidden />} Close issue
        </Button>
        <AssignDialog open={dialog === 'assign'} onOpenChange={(o) => setDialog(o ? 'assign' : null)} repo={repo} card={card} free={free} waits={waits} />
      </div>
    );
  }

  const n = card.prNumber;
  const st = card.qa?.status;
  const pull = repo.pulls.find((p) => p.number === n);
  const passed = st === 'passed';
  const canQa = !st || st === 'needs-human' || st === 'failed';
  // The office only sends back what failed QA or needs a human (server/sendBack.ts).
  const canFix = st === 'needs-human' || st === 'failed';
  const canMerge = passed || st === 'needs-human';
  const merge = async () => {
    const ok = await confirmDialog(
      passed
        ? { title: `Merge PR #${n}?`, body: `“${card.title}” passed QA. It will be squash-merged into ${repo.defaultBranch}.`, confirm: 'Squash and merge' }
        : { tone: 'danger', title: `Merge PR #${n} without QA?`, body: `“${card.title}” has not passed QA. Squash-merge it into ${repo.defaultBranch} anyway?`, confirm: 'Merge anyway' },
    );
    if (ok) await run(() => api.mergePull(repo.id, n, 'squash'));
  };
  const close = async () => {
    const ok = await confirmDialog({
      tone: 'danger',
      title: `Close PR #${n}?`,
      body: `“${card.title}” will be closed without merging, and any QA or fix work on it stops. Its issue stays open and waits for you to assign it again. The branch stays on GitHub.`,
      confirm: 'Close PR',
    });
    if (ok) await run(() => api.closePull(repo.id, n));
  };
  return (
    <div className="flex flex-wrap gap-2">
      {canMerge && (
        <Button size="sm" variant={passed ? 'default' : 'outline'} onClick={() => void merge()} disabled={busy || pull?.isDraft}>
          <GitMerge aria-hidden /> {passed ? 'Merge' : 'Merge anyway'}
        </Button>
      )}
      {canQa && (
        <Button size="sm" variant={canMerge ? 'outline' : 'default'} onClick={() => setDialog('qa')} disabled={busy}>
          <SendHorizontal aria-hidden /> {st === 'needs-human' || st === 'failed' ? 'Retry QA' : 'Send to QA'}
        </Button>
      )}
      {canFix && (
        <Button size="sm" variant="outline" onClick={() => setDialog('fix')} disabled={busy}>
          <Undo2 aria-hidden /> Send back
        </Button>
      )}
      <Button size="sm" variant="outline" onClick={() => void close()} disabled={busy}>
        {busy ? <Loader2 className="animate-spin" aria-hidden /> : <X aria-hidden />} Close PR
      </Button>
      <SendToQaDialog open={dialog === 'qa'} onOpenChange={(o) => setDialog(o ? 'qa' : null)} repo={repo} pr={n} free={free} />
      <SendBackDialog open={dialog === 'fix'} onOpenChange={(o) => setDialog(o ? 'fix' : null)} repo={repo} pr={n} />
    </div>
  );
}

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  repo: RepoView;
}

/** Pick a free agent from a list (Radix Select can't hold '', so `none` stands for "nobody"). */
function AgentSelect({ id, value, onChange, agents, none }: { id: string; value: string; onChange: (v: string) => void; agents: Agent[]; none?: string }) {
  return (
    <Select value={value || 'none'} onValueChange={(v) => onChange(v === 'none' ? '' : v)}>
      <SelectTrigger id={id} className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {none && <SelectItem value="none">{none}</SelectItem>}
        {agents.map((a) => (
          <SelectItem key={a.id} value={a.id}>
            {a.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function AssignDialog({ open, onOpenChange, repo, card, free, waits }: DialogProps & { card: KanbanCard; free: Agent[]; waits: number[] }) {
  const ids = useId();
  const [agentId, setAgentId] = useState('');
  const [note, setNote] = useState('');
  const [waitDeps, setWaitDeps] = useState(true);
  const [busy, setBusy] = useState(false);
  const chosen = agentId || free[0]?.id || '';
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!chosen) return;
    setBusy(true);
    const ok = await attempt(() => api.assign(chosen, card.number, note.trim() || undefined, waitDeps));
    setBusy(false);
    if (ok !== undefined) {
      setNote('');
      onOpenChange(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={(e) => void submit(e)} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Assign #{card.number}</DialogTitle>
            <DialogDescription>“{card.title}” goes to a free agent on {repo.fullName}, who starts on it now.</DialogDescription>
          </DialogHeader>
          {free.length === 0 ? (
            <p className="text-sm text-muted-foreground">Everyone is busy. Wait for an agent to finish, or add one in the project's settings.</p>
          ) : (
            <>
              <div className="grid gap-2">
                <Label htmlFor={`${ids}-agent`}>Agent</Label>
                <AgentSelect id={`${ids}-agent`} value={chosen} onChange={setAgentId} agents={free} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor={`${ids}-note`}>Note (optional)</Label>
                <Textarea id={`${ids}-note`} value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={2000} placeholder="Anything they should know, e.g. keep the old API working" />
              </div>
              <div className="flex items-start gap-2">
                <Checkbox id={`${ids}-deps`} checked={waitDeps} onCheckedChange={(v) => setWaitDeps(v === true)} />
                <div className="grid gap-1">
                  <Label htmlFor={`${ids}-deps`}>Wait for its dependencies</Label>
                  <p className="text-xs text-muted-foreground">{waits.length ? `It depends on #${waits.join(', #')}, still open: the office refuses it until they close.` : 'Refuse it while an issue it depends on is still open.'}</p>
                </div>
              </div>
            </>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy || !chosen}>
              {busy && <Loader2 className="animate-spin" aria-hidden />} Assign
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SendToQaDialog({ open, onOpenChange, repo, pr, free }: DialogProps & { pr: number; free: Agent[] }) {
  const ids = useId();
  const [agentId, setAgentId] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const ok = await attempt(() => api.sendToQa(repo.id, pr, agentId || undefined));
    setBusy(false);
    if (ok !== undefined) onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={(e) => void submit(e)} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Send PR #{pr} to QA</DialogTitle>
            <DialogDescription>It joins the QA queue, or a free agent you pick tests it now.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor={`${ids}-agent`}>Tester</Label>
            <AgentSelect id={`${ids}-agent`} value={agentId} onChange={setAgentId} agents={free} none="Next free agent (queue it)" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 className="animate-spin" aria-hidden />} Send to QA
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SendBackDialog({ open, onOpenChange, repo, pr }: DialogProps & { pr: number }) {
  const ids = useId();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const ok = await attempt(() => api.sendBack(repo.id, pr, note.trim() || undefined));
    setBusy(false);
    if (ok !== undefined) {
      setNote('');
      onOpenChange(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={(e) => void submit(e)} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Send PR #{pr} back for a fix?</DialogTitle>
            <DialogDescription>Its author, or any free agent, fixes it with QA's findings and your note, then it's tested once more.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor={`${ids}-note`}>Note (optional)</Label>
            <Textarea id={`${ids}-note`} value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={1000} placeholder="e.g. merge main and keep both e2e tests" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 className="animate-spin" aria-hidden />} Send back
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
