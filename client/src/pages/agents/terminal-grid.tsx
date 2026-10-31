import { Fragment } from 'react';
import { Check, LayoutGrid, X } from 'lucide-react';
import { Link } from 'react-router';
import { AgentScreen } from '@/components/terminal/agent-screen';
import { EmptyState } from '@/components/shared/empty-state';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { useWatchAgents } from '@/hooks/use-watch';
import { useIsMobile } from '@/hooks/use-mobile';
import { GRID_MAX, gridRows, toggleGridPick } from '@/lib/agents';
import { links } from '@/lib/links';
import { cn } from '@/lib/utils';
import { useStore } from '@/store';

// The terminal grid (/agents?view=grid&ids=…): up to four agents' screens side by side, in panels you can resize
// (stacked on a phone). Only these agents' lines come over the office's socket while it's open (useWatchAgents).

export function TerminalGrid({ ids, onChange }: { ids: string[]; onChange: (ids: string[]) => void }) {
  useWatchAgents(ids);
  const mobile = useIsMobile();
  const rows = gridRows(ids.length);
  const remove = (id: string) => onChange(ids.filter((x) => x !== id));

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <GridPicker ids={ids} onChange={onChange} />
        <span className="text-sm text-muted-foreground">
          {ids.length} of {GRID_MAX} · drag the dividers to resize
        </span>
      </div>
      {ids.length === 0 ? (
        <EmptyState icon={LayoutGrid} title="Nobody on the grid" description={`Pick up to ${GRID_MAX} agents to watch their terminals side by side.`} />
      ) : mobile ? (
        <div className="flex flex-col gap-3">
          {ids.map((id) => (
            <GridCell key={id} id={id} onRemove={remove} className="h-80" />
          ))}
        </div>
      ) : (
        <ResizablePanelGroup orientation="vertical" className="h-[calc(100dvh-15rem)] min-h-[28rem] rounded-lg border">
          {rows.map((row, r) => (
            <Fragment key={row.join('-')}>
              {r > 0 && <ResizableHandle withHandle />}
              <ResizablePanel minSize={120}>
                <ResizablePanelGroup orientation="horizontal">
                  {row.map((i, c) => (
                    <Fragment key={ids[i]}>
                      {c > 0 && <ResizableHandle withHandle />}
                      <ResizablePanel minSize={240}>
                        <GridCell id={ids[i]} onRemove={remove} className="h-full p-2" />
                      </ResizablePanel>
                    </Fragment>
                  ))}
                </ResizablePanelGroup>
              </ResizablePanel>
            </Fragment>
          ))}
        </ResizablePanelGroup>
      )}
    </div>
  );
}

function GridCell({ id, onRemove, className }: { id: string; onRemove: (id: string) => void; className?: string }) {
  const agent = useStore((s) => s.agents[id]);
  if (!agent) return null;
  return (
    <section aria-label={agent.name} className={cn('flex min-h-0 min-w-0 flex-col gap-1.5', className)}>
      <header className="flex min-w-0 items-center gap-2">
        <Link to={links.agent(agent.id)} className="truncate text-sm font-medium hover:underline focus-visible:underline">
          {agent.name}
        </Link>
        <StatusBadge kind="agent" status={agent.status} />
        <Button variant="ghost" size="icon" className="ml-auto size-7" onClick={() => onRemove(id)} aria-label={`Take ${agent.name} off the grid`}>
          <X />
        </Button>
      </header>
      <AgentScreen agentId={id} compact className="min-h-0 flex-1" />
    </section>
  );
}

function GridPicker({ ids, onChange }: { ids: string[]; onChange: (ids: string[]) => void }) {
  const agents = useStore((s) => s.agents);
  const list = Object.values(agents).sort((a, b) => (a.role === 'ceo' ? -1 : b.role === 'ceo' ? 1 : a.name.localeCompare(b.name)));
  const full = ids.length >= GRID_MAX;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <LayoutGrid /> Pick agents
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <Command>
          <CommandInput placeholder="Find an agent…" />
          <CommandList>
            <CommandEmpty>Nobody by that name.</CommandEmpty>
            <CommandGroup heading={full ? `${GRID_MAX} picked: drop one to add another` : `Up to ${GRID_MAX}`}>
              {list.map((a) => {
                const on = ids.includes(a.id);
                return (
                  <CommandItem key={a.id} value={`${a.name} ${a.id}`} disabled={!on && full} onSelect={() => onChange(toggleGridPick(ids, a.id))}>
                    <Check className={on ? 'opacity-100' : 'opacity-0'} aria-hidden />
                    <span className="truncate">
                      {a.name}
                      {on && <span className="sr-only"> (on the grid)</span>}
                    </span>
                    <StatusBadge kind="agent" status={a.status} className="ml-auto" />
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
