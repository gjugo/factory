import { Folder, FolderGit2, GitBranch, Loader2, Search, Sparkles } from 'lucide-react';
import { useEffect, useId, useState, type FormEvent, type ReactNode } from 'react';
import { api, type FloorOptions } from '@/api';
import { confirmDialog } from '@/components/shared/confirm-dialog';
import { Notice } from '@/components/shared/notice';
import { ToneBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { folderAction, folderChoices, isRepoName, projectSlug, repoChoices } from '@/lib/projects';
import { useStore } from '@/store';
import type { GhRepoSummary, ProjectFolderView, RepoView } from '../../../../shared/types';
import { attempt } from './actions';

// Adding a project, three ways: a GitHub repo, a folder in the projects folder (connected, or published to GitHub
// first), or a brand-new repo. Each takes the CEO's brief and whether work starts on its own. cubefarm's ProjectPicker.

type Mode = 'github' | 'folder' | 'new';
type Visibility = 'private' | 'public';

const sep = (p: string) => (p.includes('\\') ? '\\' : '/');

export function AddProjectDialog({ open, onOpenChange, onAdded }: { open: boolean; onOpenChange: (open: boolean) => void; onAdded?: (repo: RepoView) => void }) {
  const ghReady = useStore((s) => s.ghReady);
  const ghError = useStore((s) => s.ghError);
  const [mode, setMode] = useState<Mode>('github');
  const [mission, setMission] = useState('');
  const [autoAssign, setAutoAssign] = useState(true);
  const ids = useId();
  const floor: FloorOptions = { mission: mission.trim(), autoAssign };
  const done = (repo: RepoView) => {
    setMission('');
    onOpenChange(false);
    onAdded?.(repo);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add a project</DialogTitle>
          <DialogDescription>The CEO studies every new project and sizes its team. Give a brief and they plan the first work too.</DialogDescription>
        </DialogHeader>
        {!ghReady && (
          <Notice tone="danger" title="GitHub isn't ready">
            {ghError ?? 'The office could not reach GitHub.'} Projects need the GitHub CLI signed in (gh auth login).
          </Notice>
        )}
        <div className="grid gap-2">
          <Label htmlFor={`${ids}-brief`}>Brief for the CEO (optional)</Label>
          <Textarea
            id={`${ids}-brief`}
            value={mission}
            onChange={(e) => setMission(e.target.value)}
            rows={2}
            maxLength={4000}
            placeholder={mode === 'new' ? 'What should the team build? e.g. A booking page for a small bakery.' : 'What should the team work on next?'}
          />
        </div>
        <div className="flex items-start gap-3">
          <Switch id={`${ids}-auto`} checked={autoAssign} onCheckedChange={setAutoAssign} aria-describedby={`${ids}-auto-hint`} />
          <div className="grid gap-1">
            <Label htmlFor={`${ids}-auto`}>Start work automatically</Label>
            <p id={`${ids}-auto-hint`} className="text-xs text-muted-foreground">
              Free agents pick up issues as soon as they're filed. You can change it per project.
            </p>
          </div>
        </div>
        <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)} className="min-w-0">
          <TabsList className="w-full">
            <TabsTrigger value="github">
              <GitBranch aria-hidden /> <span className="hidden sm:inline">GitHub repo</span>
              <span className="sm:hidden">GitHub</span>
            </TabsTrigger>
            <TabsTrigger value="folder">
              <Folder aria-hidden /> Folder
            </TabsTrigger>
            <TabsTrigger value="new">
              <Sparkles aria-hidden /> New
            </TabsTrigger>
          </TabsList>
          <TabsContent value="github" className="pt-2">
            <GithubMode floor={floor} onDone={done} />
          </TabsContent>
          <TabsContent value="folder" className="pt-2">
            <FolderMode floor={floor} onDone={done} />
          </TabsContent>
          <TabsContent value="new" className="pt-2">
            <NewMode floor={floor} onDone={done} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function ListBox({ label, children }: { label: string; children: ReactNode }) {
  return (
    <ul aria-label={label} className="max-h-64 divide-y overflow-y-auto rounded-md border">
      {children}
    </ul>
  );
}

function ListMessage({ children }: { children: ReactNode }) {
  return <li className="p-3 text-sm text-muted-foreground">{children}</li>;
}

function GithubMode({ floor, onDone }: { floor: FloorOptions; onDone: (r: RepoView) => void }) {
  const repos = useStore((s) => s.repos);
  const projectsDir = useStore((s) => s.settings.projectsDir);
  const [list, setList] = useState<GhRepoSummary[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [owner, setOwner] = useState('');
  const [q, setQ] = useState('');
  const [manual, setManual] = useState('');
  const [manualError, setManualError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const ids = useId();
  const load = (o?: string) => {
    setList(null);
    setFailed(false);
    void attempt(() => api.githubRepos(o)).then((r) => {
      setList(r ?? []);
      setFailed(!r);
    });
  };
  useEffect(() => load(), []);
  const shown = repoChoices(list ?? [], repos.map((r) => r.id), q);
  const connect = async (name: string) => {
    setBusy(name);
    const repo = await attempt(() => api.connectRepo(name, floor));
    setBusy(null);
    if (repo) onDone(repo);
  };
  const submitManual = (e: FormEvent) => {
    e.preventDefault();
    if (!isRepoName(manual)) return setManualError('Write it as owner/name, e.g. octocat/hello-world.');
    setManualError(null);
    void connect(manual.trim());
  };
  return (
    <div className="grid gap-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search repositories" aria-label="Search repositories" className="pl-8" />
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            load(owner.trim() || undefined);
          }}
        >
          <Input value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="Owner or org" aria-label="Owner or organisation" className="sm:w-40" />
          <Button type="submit" variant="outline">
            List
          </Button>
        </form>
      </div>
      <ListBox label="GitHub repositories">
        {list === null && <ListMessage>Asking GitHub for repositories…</ListMessage>}
        {list && failed && <ListMessage>GitHub didn't answer. Check the error above and try List again.</ListMessage>}
        {list && !failed && shown.length === 0 && <ListMessage>No repositories {q ? 'match your search' : 'to add'}.</ListMessage>}
        {shown.map((r) => (
          <li key={r.nameWithOwner} className="flex items-center gap-3 p-3">
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-2">
                <span className="truncate font-medium">{r.nameWithOwner}</span>
                <ToneBadge tone="neutral" label={r.visibility.toLowerCase()} />
              </div>
              {r.description && <p className="truncate text-xs text-muted-foreground">{r.description}</p>}
            </div>
            <Button size="sm" disabled={!!busy} onClick={() => void connect(r.nameWithOwner)} aria-label={`Add ${r.nameWithOwner}`}>
              {busy === r.nameWithOwner && <Loader2 className="animate-spin" aria-hidden />}
              Add
            </Button>
          </li>
        ))}
      </ListBox>
      <form className="grid gap-2" onSubmit={submitManual} noValidate>
        <Label htmlFor={`${ids}-manual`}>Or type owner/name</Label>
        <div className="flex gap-2">
          <Input
            id={`${ids}-manual`}
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            placeholder="octocat/hello-world"
            aria-invalid={!!manualError}
            aria-describedby={manualError ? `${ids}-manual-error` : undefined}
          />
          <Button type="submit" variant="outline" disabled={!manual.trim() || !!busy}>
            {busy === manual.trim() && <Loader2 className="animate-spin" aria-hidden />}
            Add
          </Button>
        </div>
        {manualError && (
          <p id={`${ids}-manual-error`} role="alert" className="text-sm text-destructive">
            {manualError}
          </p>
        )}
      </form>
      <p className="text-xs text-muted-foreground">
        A folder in {projectsDir || 'your projects folder'} that already has the repo is used; otherwise it's cloned to {projectsDir}
        {sep(projectsDir)}&lt;name&gt;.
      </p>
    </div>
  );
}

function FolderMode({ floor, onDone }: { floor: FloorOptions; onDone: (r: RepoView) => void }) {
  const projectsDir = useStore((s) => s.settings.projectsDir);
  const [dir, setDir] = useState(projectsDir);
  const [root, setRoot] = useState('');
  const [folders, setFolders] = useState<ProjectFolderView[] | null>(null);
  const [q, setQ] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('private');
  const [busy, setBusy] = useState<string | null>(null);
  const ids = useId();
  const load = (d?: string) => {
    setFolders(null);
    void attempt(() => api.folders(d)).then((res) => {
      setFolders(res?.folders ?? []);
      if (res) {
        setRoot(res.root);
        setDir(res.root);
      }
    });
  };
  useEffect(() => load(), []);
  const shown = folderChoices(folders ?? [], q);
  const run = async (f: ProjectFolderView, fn: () => Promise<RepoView>) => {
    setBusy(f.path);
    const repo = await attempt(fn);
    setBusy(null);
    if (repo) onDone(repo);
    else load(root || undefined);
  };
  const publish = async (f: ProjectFolderView) => {
    const ok = await confirmDialog({
      title: `Put ${f.name} on GitHub?`,
      body: `This creates a ${visibility} GitHub repository called ${projectSlug(f.name) || f.name} and pushes what's already committed. Nothing uncommitted leaves your computer.${f.git ? '' : ' An empty folder gets a starter README first.'}`,
      confirm: `Create ${visibility} repo`,
    });
    if (ok) void run(f, () => api.publishFolder({ path: f.path, visibility, ...floor }));
  };
  return (
    <div className="grid gap-3">
      <form
        className="grid gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          load(dir.trim() || undefined);
        }}
      >
        <Label htmlFor={`${ids}-dir`}>Folder to look in</Label>
        <div className="flex gap-2">
          <Input id={`${ids}-dir`} value={dir} onChange={(e) => setDir(e.target.value)} placeholder={projectsDir} spellCheck={false} />
          <Button type="submit" variant="outline">
            Look here
          </Button>
        </div>
      </form>
      {root && root !== projectsDir && (
        <Notice>
          New projects are created in {projectsDir}.{' '}
          <Button variant="link" className="h-auto p-0" onClick={() => void attempt(() => api.updateSettings({ projectsDir: root }))}>
            Use {root} instead
          </Button>
        </Notice>
      )}
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search folders" aria-label="Search folders" className="pl-8" />
      </div>
      <ListBox label="Folders">
        {folders === null && <ListMessage>Looking through {dir || 'your projects folder'}…</ListMessage>}
        {folders && shown.length === 0 && <ListMessage>No folders {q ? 'match your search' : 'here'}.</ListMessage>}
        {shown.map((f) => {
          const action = folderAction(f);
          return (
            <li key={f.path} className="flex items-center gap-3 p-3">
              <FolderGit2 className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{f.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {action === 'added' ? `Already project ${f.floor}` : f.github ? f.github : f.git ? 'Not on GitHub yet' : 'Not a git repository yet'}
                </p>
              </div>
              {action === 'added' ? (
                <ToneBadge tone="success" label="Added" />
              ) : action === 'connect' ? (
                <Button size="sm" disabled={!!busy} onClick={() => void run(f, () => api.connectFolder(f.path, floor))} aria-label={`Connect ${f.name}`}>
                  {busy === f.path && <Loader2 className="animate-spin" aria-hidden />}
                  Connect
                </Button>
              ) : (
                <Button size="sm" variant="outline" disabled={!!busy} onClick={() => void publish(f)} aria-label={`Publish ${f.name} to GitHub`}>
                  {busy === f.path && <Loader2 className="animate-spin" aria-hidden />}
                  Publish
                </Button>
              )}
            </li>
          );
        })}
      </ListBox>
      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-medium">Publishing a folder creates a</legend>
        <VisibilityChoice value={visibility} onChange={setVisibility} />
      </fieldset>
      <p className="text-xs text-muted-foreground">
        The office never touches your work in progress: it only fast-forwards your folder when it's on the default branch with no local changes. Agents work in their own git worktrees.
      </p>
    </div>
  );
}

function VisibilityChoice({ value, onChange }: { value: Visibility; onChange: (v: Visibility) => void }) {
  const ids = useId();
  return (
    <RadioGroup value={value} onValueChange={(v) => onChange(v as Visibility)} className="flex gap-4" aria-label="Visibility">
      {(['private', 'public'] as const).map((v) => (
        <div key={v} className="flex items-center gap-2">
          <RadioGroupItem value={v} id={`${ids}-${v}`} />
          <Label htmlFor={`${ids}-${v}`}>{v === 'private' ? 'Private repository' : 'Public repository'}</Label>
        </div>
      ))}
    </RadioGroup>
  );
}

function NewMode({ floor, onDone }: { floor: FloorOptions; onDone: (r: RepoView) => void }) {
  const projectsDir = useStore((s) => s.settings.projectsDir);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [owner, setOwner] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('private');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const ids = useId();
  const slug = projectSlug(name);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!slug) return setError('Give the project a name with at least one letter or number.');
    setError(null);
    setBusy(true);
    const repo = await attempt(() => api.createRepo({ name: slug, description: description.trim(), visibility, owner: owner.trim() || undefined, ...floor }));
    setBusy(false);
    if (repo) onDone(repo);
  };
  return (
    <form className="grid gap-3" onSubmit={submit} noValidate>
      <div className="grid gap-2">
        <Label htmlFor={`${ids}-name`}>Project name</Label>
        <Input
          id={`${ids}-name`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="island-bakery"
          aria-invalid={!!error}
          aria-describedby={`${ids}-name-hint${error ? ` ${ids}-name-error` : ''}`}
          spellCheck={false}
        />
        <p id={`${ids}-name-hint`} className="text-xs break-all text-muted-foreground">
          Created at {projectsDir}
          {sep(projectsDir)}
          {slug || '…'}
        </p>
        {error && (
          <p id={`${ids}-name-error`} role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${ids}-desc`}>Description (optional)</Label>
        <Input id={`${ids}-desc`} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="One line about the project" maxLength={350} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${ids}-owner`}>Owner (optional)</Label>
        <Input id={`${ids}-owner`} value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="Your account, or an organisation" spellCheck={false} />
      </div>
      <VisibilityChoice value={visibility} onChange={setVisibility} />
      <div className="flex justify-end">
        <Button type="submit" disabled={busy}>
          {busy && <Loader2 className="animate-spin" aria-hidden />}
          Create project
        </Button>
      </div>
    </form>
  );
}
