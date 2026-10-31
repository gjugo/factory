import { Loader2 } from 'lucide-react';
import { useId, useState, type FormEvent } from 'react';
import { api } from '@/api';
import { Markdown } from '@/components/shared/markdown';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import type { Agent } from '@/store';
import type { RepoView } from '../../../../shared/types';
import { attempt } from '../projects/actions';
import { freeAgents } from './board';

// Filing an issue on the project's GitHub repo (cubefarm's IssueForm): a title, a Markdown body with a preview, and
// optionally a free agent who starts on it at once. onFiled gets the new issue's number, so the board can open it.

export function NewIssueDialog({ open, onOpenChange, repo, agents, onFiled }: { open: boolean; onOpenChange: (open: boolean) => void; repo: RepoView; agents: Agent[]; onFiled: (n: number) => void }) {
  const ids = useId();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [assignTo, setAssignTo] = useState('');
  const [tab, setTab] = useState('write');
  const [busy, setBusy] = useState(false);
  const free = freeAgents(agents);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    const made = await attempt(() => api.createIssue(repo.id, title.trim(), body, assignTo || undefined));
    setBusy(false);
    if (!made) return;
    setTitle('');
    setBody('');
    setAssignTo('');
    setTab('write');
    onOpenChange(false);
    onFiled(made.number);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl">
        <form onSubmit={(e) => void submit(e)} className="grid min-w-0 gap-4">
          <DialogHeader>
            <DialogTitle>New issue</DialogTitle>
            <DialogDescription>Filed on {repo.fullName}. Acceptance criteria help the agent who builds it and the one who tests it.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor={`${ids}-title`}>Title</Label>
            <Input id={`${ids}-title`} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Add a dark mode toggle" maxLength={256} required autoFocus />
          </div>
          <Tabs value={tab} onValueChange={setTab} className="min-w-0">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor={`${ids}-body`}>Description</Label>
              <TabsList>
                <TabsTrigger value="write">Write</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="write">
              <Textarea id={`${ids}-body`} value={body} onChange={(e) => setBody(e.target.value)} rows={8} placeholder="What you want, in Markdown. Depends on #N makes it wait for another issue." className="font-mono text-sm" />
            </TabsContent>
            <TabsContent value="preview" className="min-h-40 rounded-md border p-3">
              {body.trim() ? <Markdown text={body} /> : <p className="text-sm text-muted-foreground">Nothing to preview.</p>}
            </TabsContent>
          </Tabs>
          <div className="grid gap-2">
            <Label htmlFor={`${ids}-assign`}>Assign to</Label>
            <Select value={assignTo || 'none'} onValueChange={(v) => setAssignTo(v === 'none' ? '' : v)}>
              <SelectTrigger id={`${ids}-assign`} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{repo.autoAssign ? 'Leave it in the backlog (auto-assign picks it up)' : 'Leave it in the backlog'}</SelectItem>
                {free.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}, right away
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy || !title.trim()}>
              {busy && <Loader2 className="animate-spin" aria-hidden />} File issue
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
