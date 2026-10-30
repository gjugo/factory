import { Loader2 } from 'lucide-react';
import { useId, useState } from 'react';
import { Link } from 'react-router';
import { modelSuggestions, effectiveModel, CLAUDE_MODELS } from '../../../../shared/models';
import type { AgentCli, EffortLevel, HireRequestView, MachineHost } from '../../../../shared/types';
import { Markdown } from '@/components/shared/markdown';
import { RelativeTime } from '@/components/shared/relative-time';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/api';
import { projectName } from '@/hooks/use-project-rows';
import { links } from '@/lib/links';
import { cn } from '@/lib/utils';
import { useStore } from '@/store';
import { cliLabel, EFFORTS, hireCli, hireOverrides, outcomeLabel, setupLine, setupOf, type HireSetup } from './hire';

// One team change the CEO asks for: a new agent (with their setup, editable before hiring) or one to let go. The
// approvals list, the CEO's message about it and the sheet all show this card.

const DEFAULT = 'default'; // Radix Select has no empty value: '' (the office default) goes by this name

/** A new agent's settings, edited before they're created. */
export function HireSetupFields({ value, onChange, disabled }: { value: HireSetup; onChange: (v: HireSetup) => void; disabled?: boolean }) {
  const settings = useStore((s) => s.settings);
  const clis = useStore((s) => s.clis);
  const cloudOn = useStore((s) => s.cloud.keySet);
  const id = useId();
  const sdk = settings.runtime !== 'terminal';
  const cli = hireCli(value.cli, settings);
  const set = (patch: Partial<HireSetup>) => onChange({ ...value, ...patch });
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="grid gap-1.5">
        <Label htmlFor={`${id}-name`}>Name</Label>
        <Input id={`${id}-name`} value={value.name} maxLength={24} disabled={disabled} onChange={(e) => set({ name: e.target.value })} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${id}-cli`}>Coding agent</Label>
        <Select value={sdk ? DEFAULT : value.cli || DEFAULT} disabled={disabled || sdk} onValueChange={(v) => set({ cli: v === DEFAULT ? '' : (v as AgentCli) })}>
          <SelectTrigger id={`${id}-cli`} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={DEFAULT}>{sdk ? 'Claude Code' : `${cliLabel(clis, settings.defaultCli)} (default)`}</SelectItem>
            {clis.map((c) => (
              <SelectItem key={c.id} value={c.id} disabled={!c.installed}>
                {c.label}
                {c.installed ? '' : ' (not installed)'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${id}-model`}>Model</Label>
        <Input
          id={`${id}-model`}
          list={`${id}-models`}
          value={value.model}
          disabled={disabled}
          placeholder={effectiveModel('', cli, settings, CLAUDE_MODELS[0]) || 'Agent default'}
          onChange={(e) => set({ model: e.target.value })}
        />
        <datalist id={`${id}-models`}>
          {modelSuggestions(cli).map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${id}-effort`}>Effort</Label>
        <Select value={value.effort || DEFAULT} disabled={disabled} onValueChange={(v) => set({ effort: v === DEFAULT ? '' : (v as EffortLevel) })}>
          <SelectTrigger id={`${id}-effort`} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={DEFAULT}>Default ({settings.defaultEffort})</SelectItem>
            {EFFORTS.map((x) => (
              <SelectItem key={x} value={x}>
                {x}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {(cloudOn || value.host === 'box') && (
        <div className="grid gap-1.5 sm:col-span-2">
          <Label htmlFor={`${id}-host`}>Works on</Label>
          <Select value={value.host || DEFAULT} disabled={disabled} onValueChange={(v) => set({ host: v === DEFAULT ? '' : (v as MachineHost) })}>
            <SelectTrigger id={`${id}-host`} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={DEFAULT}>{settings.cloud.machineKind === 'box' ? 'Upstash Box' : 'This computer'} (default)</SelectItem>
              <SelectItem value="local">This computer</SelectItem>
              <SelectItem value="box" disabled={cli === 'opencode'}>
                Upstash Box{cli === 'opencode' ? " (OpenCode can't run there)" : ''}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}

/** A team change as a card: who, which project, the CEO's reason, and (while pending) approve or reject with a note. */
export function RequestCard({ req, className }: { req: HireRequestView; className?: string }) {
  const repo = useStore((s) => s.repos.find((r) => r.id === req.repoId));
  const settings = useStore((s) => s.settings);
  const clis = useStore((s) => s.clis);
  const [setup, setSetup] = useState(() => setupOf(req));
  const [editing, setEditing] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null);
  const id = useId();
  const pending = req.status === 'pending';
  const hire = req.kind === 'hire';
  const name = (hire && pending && setup.name.trim()) || req.name;

  const act = async (kind: 'approve' | 'reject', fn: () => Promise<unknown>) => {
    setBusy(kind);
    try {
      await fn();
    } catch {
      // api() already toasted it
    } finally {
      setBusy(null);
    }
  };

  return (
    <article className={cn('space-y-3 rounded-lg border bg-card p-3 text-card-foreground sm:p-4', !pending && 'bg-muted/40', className)} aria-labelledby={`${id}-title`}>
      <header className="flex items-start gap-3">
        <Avatar className="size-9">
          <AvatarFallback className={hire ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}>{req.name.slice(0, 1).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <h3 id={`${id}-title`} className="truncate text-sm font-semibold">
            {hire ? `Hire ${name}` : `Let ${req.name} go`}
          </h3>
          <p className="text-xs text-muted-foreground">
            {repo ? (
              <Link to={links.board(repo.id)} className="underline-offset-4 hover:underline">
                {projectName(repo)}
              </Link>
            ) : (
              'A removed project'
            )}
            {' · '}
            <RelativeTime at={req.createdAt} />
          </p>
        </div>
        {pending ? (
          <Badge variant="outline" className="shrink-0">
            {hire ? 'New agent' : 'Leaving'}
          </Badge>
        ) : (
          <Badge variant={req.status === 'approved' ? 'default' : 'secondary'} className="shrink-0">
            {outcomeLabel(req)}
          </Badge>
        )}
      </header>

      {req.reason && <Markdown text={req.reason} className="text-muted-foreground" />}

      {hire && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <span className="min-w-0 break-words">{setupLine(pending ? setup : req, settings, clis)}</span>
          {pending && (
            <Button type="button" variant="link" size="sm" className="h-auto p-0 text-xs" aria-expanded={editing} onClick={() => setEditing(!editing)}>
              {editing ? 'Done' : 'Change setup'}
            </Button>
          )}
        </div>
      )}
      {hire && pending && editing && <HireSetupFields value={setup} onChange={setSetup} disabled={!!busy} />}

      {!pending && req.note && <p className="text-xs text-muted-foreground">Your note: “{req.note}”</p>}

      {pending && !rejecting && (
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" size="sm" disabled={!!busy} onClick={() => setRejecting(true)}>
            {hire ? 'Decline' : 'Keep them'}
          </Button>
          <Button type="button" size="sm" disabled={!!busy} onClick={() => void act('approve', () => api.approveRequest(req.id, hire ? hireOverrides(req, setup) : {}))}>
            {busy === 'approve' && <Loader2 className="animate-spin" aria-hidden />}
            {hire ? `Hire ${name}` : `Let ${req.name} go`}
          </Button>
        </div>
      )}
      {pending && rejecting && (
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            void act('reject', () => api.rejectRequest(req.id, note.trim() || undefined));
          }}
        >
          <Label htmlFor={`${id}-note`}>Note for the CEO (optional)</Label>
          <Input id={`${id}-note`} value={note} maxLength={400} autoFocus disabled={!!busy} placeholder="Why not?" onChange={(e) => setNote(e.target.value)} />
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" disabled={!!busy} onClick={() => setRejecting(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" size="sm" disabled={!!busy}>
              {busy === 'reject' && <Loader2 className="animate-spin" aria-hidden />}
              {hire ? 'Decline' : 'Keep them'}
            </Button>
          </div>
        </form>
      )}
    </article>
  );
}
