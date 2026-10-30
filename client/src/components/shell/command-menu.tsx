import { Bot, Crown, FolderGit2, LayoutDashboard, Plus, Search, Settings } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { StatusDot } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandShortcut } from '@/components/ui/command';
import { HEALTH_LOOK, useProjectRows } from '@/hooks/use-project-rows';
import { links } from '@/lib/links';
import { statusLook } from '@/lib/status';
import { useStore } from '@/store';

// ⌘K / Ctrl+K: jump to a page, a project or an agent.

const PAGES = [
  { label: 'Overview', to: links.overview(), icon: LayoutDashboard },
  { label: 'Projects', to: links.projects(), icon: FolderGit2 },
  { label: 'Add a project', to: links.addProject(), icon: Plus },
  { label: 'Agents', to: links.agents(), icon: Bot },
  { label: 'CEO', to: links.ceo(), icon: Crown },
  { label: 'Settings', to: links.settings(), icon: Settings },
];

export function CommandMenu() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const rows = useProjectRows();
  const agents = useStore((s) => s.agents);
  const repos = useStore((s) => s.repos);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const go = (to: string) => {
    setOpen(false);
    navigate(to);
  };
  const floorName = (repoId: string) => repos.find((r) => r.id === repoId)?.fullName.split('/').pop();
  const people = Object.values(agents).sort((a, b) => (a.role === 'ceo' ? -1 : b.role === 'ceo' ? 1 : a.name.localeCompare(b.name)));

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-2 text-muted-foreground" aria-label="Search (⌘K)">
        <Search className="size-3.5" aria-hidden />
        <span className="hidden xl:inline">Search…</span>
        <kbd className="pointer-events-none hidden rounded border bg-muted px-1.5 font-mono text-[10px] xl:inline">⌘K</kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen} title="Jump to" description="A page, a project or an agent">
        <CommandInput placeholder="Jump to a page, project or agent…" />
        <CommandList>
          <CommandEmpty>Nothing matches.</CommandEmpty>
          <CommandGroup heading="Pages">
            {PAGES.map((p) => (
              <CommandItem key={p.to} value={`page ${p.label}`} onSelect={() => go(p.to)}>
                <p.icon aria-hidden />
                {p.label}
              </CommandItem>
            ))}
          </CommandGroup>
          {rows.length > 0 && (
            <CommandGroup heading="Projects">
              {rows.map((row) => (
                <CommandItem key={row.repo.id} value={`project ${row.repo.fullName}`} onSelect={() => go(links.board(row.repo.id))}>
                  <StatusDot tone={HEALTH_LOOK[row.health].tone} label={HEALTH_LOOK[row.health].label} />
                  {row.name}
                  <CommandShortcut>{row.repo.fullName.split('/')[0]}</CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {people.length > 0 && (
            <CommandGroup heading="Agents">
              {people.map((a) => (
                <CommandItem key={a.id} value={`agent ${a.name} ${a.id}`} onSelect={() => go(links.agent(a.id))}>
                  {a.role === 'ceo' ? <Crown aria-hidden /> : <Bot aria-hidden />}
                  {a.name}
                  <CommandShortcut>{a.role === 'ceo' ? 'CEO' : `${floorName(a.repoId) ?? ''} · ${statusLook('agent', a.status).label}`}</CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
